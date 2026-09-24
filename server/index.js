require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const https = require("https");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
const TO_PHONE_NUMBER = process.env.TO_PHONE_NUMBER || "";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const DANGER_KELVIN = 335;

function isDanger(d) {
  return d.risk === "Critical" || (d.brightness || 0) >= DANGER_KELVIN;
}

function fmt(value, unit) {
  return value == null ? "—" : `${value} ${unit}`;
}

// Helper function to send SMS via Twilio REST API using Node's native HTTPS module (no dependencies required)
function sendSmsViaHttps(accountSid, authToken, from, to, body) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({ From: from, To: to, Body: body }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const options = {
      hostname: "api.twilio.com",
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "Authorization": `Basic ${auth}`
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `HTTP status ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Build a concise and highly formatted SMS text message body
function buildSmsBody(detections) {
  const danger = detections.filter(isDanger);
  const total = detections.length;
  const timeNow = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: "short"
  });

  let body = `AGNI DRISHTI Alert [${timeNow}]\n🚨 ${danger.length} Emergencies / ${total} Total Hotspots\n\n`;

  // Include detailed text for up to top 5 hot spots to keep the message length concise
  detections.slice(0, 5).forEach((d) => {
    const prev = d.heatPrev ?? 0;
    const curr = d.heatCurrent ?? 0;
    const delta = curr - prev;
    const trend = delta > 0 ? "+" : "";
    const dangerLabel = isDanger(d) ? "⚠️ " : "";
    body += `${dangerLabel}${d.name} (${d.risk})\n`;
    body += `Loc: ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}\n`;
    body += `Heat: ${prev} MW -> ${curr} MW (${trend}${delta.toFixed(1)} MW)\n`;
    body += `AQI: ${d.aqi ?? "—"} · CO₂: ${d.co2 ?? "—"} ppm\n\n`;
  });

  if (detections.length > 5) {
    body += `...and ${detections.length - 5} more hotspots.`;
  }

  return body;
}

// Cache to store the latest detections and track the last send timestamp
let cachedDetections = null;
let lastSentTime = 0;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown limit for client refreshes
const HOURLY_MS = 60 * 60 * 1000;   // 1 hour interval

// Hourly background scheduler to send SMS alerts automatically even if no clients are active
setInterval(async () => {
  if (!configuredMessage()) return;
  if (!cachedDetections || cachedDetections.length === 0) {
    console.log("[AGNI-DRISHTI-SERVER] Hourly scheduler: No cached detections available to send.");
    return;
  }

  try {
    const smsBody = buildSmsBody(cachedDetections);
    const twilioRes = await sendSmsViaHttps(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TO_PHONE_NUMBER,
      smsBody
    );
    lastSentTime = Date.now();
    console.log("[AGNI-DRISHTI-SERVER] Hourly scheduled SMS alert sent successfully to:", TO_PHONE_NUMBER);
  } catch (error) {
    console.error("[AGNI-DRISHTI-SERVER] Hourly scheduled SMS failed:", error?.message || error);
  }
}, HOURLY_MS);

app.get("/health", (_req, res) => {
  const configured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && TO_PHONE_NUMBER);
  res.json({ ok: true, configured, recipients: [TO_PHONE_NUMBER] });
});

app.post("/api/send-alert", async (req, res) => {
  const { detections } = req.body || {};

  if (!configuredMessage()) {
    return res.status(500).json({
      ok: false,
      error: "Server Twilio SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TO_PHONE_NUMBER in the .env file."
    });
  }

  if (!Array.isArray(detections) || detections.length === 0) {
    return res.status(400).json({ ok: false, error: "No hotspots to report." });
  }

  // Cache the latest detections
  cachedDetections = detections;

  // Apply cooldown rate-limiting to prevent spamming the Twilio SMS API on rapid page refreshes
  const now = Date.now();
  if (now - lastSentTime < COOLDOWN_MS) {
    console.log("[AGNI-DRISHTI-SERVER] Alert post skipped Twilio SMS trigger (cooldown active). Cached copy updated.");
    return res.json({ ok: true, status: 202, recipients: [TO_PHONE_NUMBER], note: "Cooldown rate limiter active" });
  }

  try {
    const smsBody = buildSmsBody(detections);
    const twilioRes = await sendSmsViaHttps(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER,
      TO_PHONE_NUMBER,
      smsBody
    );
    lastSentTime = now;
    console.log("[AGNI-DRISHTI-SERVER] SMS Alert sent successfully to", TO_PHONE_NUMBER);
    return res.json({ ok: true, status: 202, recipients: [TO_PHONE_NUMBER], twilioSid: twilioRes.sid });
  } catch (error) {
    console.error("[AGNI-DRISHTI-SERVER] Twilio error:", error.message || error);
    return res.status(500).json({
      ok: false,
      error: "Twilio failed to send SMS.",
      detail: error.message || String(error)
    });
  }
});

function configuredMessage() {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && TO_PHONE_NUMBER);
}

const PORT = process.env.EMAIL_SERVER_PORT || 5001;
app.listen(PORT, () => {
  const ready = configuredMessage();
  console.log(`[AGNI-DRISHTI-SERVER] SMS server running on http://localhost:${PORT}`);
  console.log(
    ready
      ? `[AGNI-DRISHTI-SERVER] Twilio ready — sending SMS to ${TO_PHONE_NUMBER}`
      : "[AGNI-DRISHTI-SERVER] WARNING: TWILIO credentials or phone numbers not set in the .env file. Set them and restart."
  );
});
