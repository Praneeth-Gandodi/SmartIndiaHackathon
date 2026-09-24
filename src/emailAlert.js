const SERVER_URL =
  process.env.REACT_APP_EMAIL_SERVER_URL || "http://localhost:5001";

export const isDanger = (detection) =>
  detection.risk === "Critical" ||
  (detection.brightness || 0) >= 335;

export const HOUR_MS = 60 * 60 * 1000;

export async function sendEmailAlert(detections) {
  if (!detections || !detections.length) {
    return { ok: true, reason: "No hotspots to report" };
  }

  try {
    const response = await fetch(`${SERVER_URL}/api/send-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ detections })
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result && result.ok) {
      console.log(
        "[AGNI DRISHTI] Alert sent via server.",
        result.recipients
          ? `to ${result.recipients.join(", ")}`
          : ""
      );
      return { ok: true, recipients: result.recipients };
    }

    console.warn(
      "[AGNI DRISHTI] Server rejected alert:",
      result && result.error
        ? result.error
        : `HTTP ${response.status}`
    );
    if (result && result.detail) {
      console.warn("[AGNI DRISHTI] Server detail:", result.detail);
    }
    return { ok: false, error: result.error, detail: result.detail };
  } catch (error) {
    console.error(
      "[AGNI DRISHTI] Could not reach email server at " +
        SERVER_URL +
        ". Is the server running?",
      error
    );
    return { ok: false, error: "Server unreachable" };
  }
}

export function buildEmailContent() {
  // Content is built and sent by the email server.
  return {};
}
