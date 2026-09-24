#!/usr/bin/env node

/**
 * Downloads a short, build-time FIRMS snapshot for the selection demo.
 *
 * The MAP_KEY is read only from FIRMS_MAP_KEY in the local environment/.env.
 * It is never written to the generated dataset or exposed to React.
 *
 * Usage:
 *   FIRMS_MAP_KEY=... npm run firms:refresh
 *   FIRMS_MAP_KEY=... npm run firms:refresh -- --days 7 --end 2026-09-24
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "src", "data", "firms-india-latest.json");
const ENV_FILE = path.join(ROOT, ".env");
const INDIA_BOUNDARY_URL =
  "https://nominatim.openstreetmap.org/search?country=India&format=geojson&polygon_geojson=1&polygon_threshold=0.02";
const INDIA_BBOX = [68.0, 6.0, 98.0, 36.0];
const SOURCES = [
  { id: "VIIRS_NOAA20_NRT", label: "VIIRS NOAA-20 NRT" },
  { id: "VIIRS_NOAA21_NRT", label: "VIIRS NOAA-21 NRT" },
  { id: "MODIS_NRT", label: "MODIS NRT" }
];

const SITE_CONTEXT = [
  { name: "Jamnagar industrial and refinery belt", lat: 22.4612, lng: 69.7891, type: "Industrial", radiusKm: 9 },
  { name: "Paradip refinery and port belt", lat: 20.25, lng: 86.62, type: "GasFlare", radiusKm: 7 },
  { name: "Vizag port and steel belt", lat: 17.75, lng: 83.3, type: "Industrial", radiusKm: 8 },
  { name: "Bokaro industrial belt", lat: 23.6689, lng: 86.1, type: "Industrial", radiusKm: 8 },
  { name: "Durgapur industrial belt", lat: 23.4833, lng: 87.3, type: "Industrial", radiusKm: 8 },
  { name: "Rourkela steel belt", lat: 22.2, lng: 84.85, type: "Industrial", radiusKm: 8 },
  { name: "Hazira gas and petrochemical belt", lat: 21.15, lng: 72.65, type: "GasFlare", radiusKm: 7 },
  { name: "Dahej gas terminal belt", lat: 21.72, lng: 72.57, type: "GasFlare", radiusKm: 7 },
  { name: "Mathura refinery belt", lat: 27.49, lng: 77.68, type: "Industrial", radiusKm: 8 },
  { name: "Singrauli thermal power belt", lat: 24.0997, lng: 82.6208, type: "Industrial", radiusKm: 8 },
  { name: "Korba coal and power belt", lat: 22.3533, lng: 82.6833, type: "Mining", radiusKm: 8 },
  { name: "Chandrapura thermal power belt", lat: 19.97, lng: 79.27, type: "Industrial", radiusKm: 8 },
  { name: "Neyveli lignite mining belt", lat: 11.5333, lng: 79.4833, type: "Mining", radiusKm: 8 },
  { name: "Jharia coalfield belt", lat: 23.75, lng: 86.42, type: "Mining", radiusKm: 8 },
  { name: "Talcher coalfield belt", lat: 20.75, lng: 84.65, type: "Mining", radiusKm: 8 },
  { name: "Panipat industrial belt", lat: 29.39, lng: 76.96, type: "Industrial", radiusKm: 8 },
  { name: "Vindhyanagar thermal power belt", lat: 24.07, lng: 82.67, type: "Industrial", radiusKm: 8 }
];

const AGRICULTURAL_BELTS = [
  { name: "Punjab and Haryana agricultural belt", minLat: 28.5, maxLat: 32.5, minLng: 73.5, maxLng: 77.8 },
  { name: "Indo-Gangetic agricultural belt", minLat: 24.0, maxLat: 29.5, minLng: 74.0, maxLng: 85.5 },
  { name: "Maharashtra cotton belt", minLat: 18.0, maxLat: 22.5, minLng: 73.5, maxLng: 80.5 }
];

const FOREST_BELTS = [
  { name: "Eastern and north-eastern forest belt", minLat: 21.5, maxLat: 29.5, minLng: 88.0, maxLng: 96.5 },
  { name: "Central India forest belt", minLat: 18.0, maxLat: 25.5, minLng: 76.0, maxLng: 86.0 },
  { name: "Western Ghats forest belt", minLat: 8.0, maxLat: 20.5, minLng: 72.8, maxLng: 77.8 }
];

function readArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function readLocalEnv() {
  try {
    const content = await fs.readFile(ENV_FILE, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function utcDate(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng, lat, polygon) {
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function pointInIndia(lng, lat, geometry) {
  if (geometry.type === "Polygon") return pointInPolygon(lng, lat, geometry.coordinates);
  return geometry.coordinates.some((polygon) => pointInPolygon(lng, lat, polygon));
}

function acquisitionTime(row) {
  const rawTime = row.acq_time || "0000";
  let hour = Math.floor(Number(rawTime.slice(0, 2)) || 0);
  const minute = Math.floor(Number(rawTime.slice(2, 4)) || 0);
  const date = hour === 24 ? addUtcDays(utcDate(row.acq_date), 1) : utcDate(row.acq_date);
  if (hour === 24) hour = 0;
  return new Date(
    `${formatDate(date)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}:00.000Z`
  );
}

function displayDate(date) {
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    })
    .toUpperCase();
}

function displayTime(date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes()
  ).padStart(2, "0")} UTC`;
}

function regionFor(lat, lng) {
  if (lat >= 26) return "North India";
  if (lng <= 75.5) return "West India";
  if (lng >= 88) return lat >= 23 ? "North-East India" : "East India";
  if (lat < 18) return "South India";
  return "Central India";
}

function classify(record) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const site of SITE_CONTEXT) {
    const distance = haversineKm(record.lat, record.lng, site.lat, site.lng);
    if (distance <= site.radiusKm && distance < nearestDistance) {
      nearest = { ...site, distance };
      nearestDistance = distance;
    }
  }

  if (nearest) {
    return {
      type: nearest.type,
      contextName: nearest.name,
      reason: `Demo pre-classification from curated ${nearest.name.toLowerCase()} context (${nearestDistance.toFixed(1)} km from reference point).`
    };
  }

  const agricultural = AGRICULTURAL_BELTS.find(
    (belt) =>
      record.lat >= belt.minLat &&
      record.lat <= belt.maxLat &&
      record.lng >= belt.minLng &&
      record.lng <= belt.maxLng
  );
  if (agricultural) {
    return {
      type: "Agricultural",
      contextName: agricultural.name,
      reason: `Demo pre-classification from the ${agricultural.name.toLowerCase()}; no nearby curated industrial or mining reference matched.`
    };
  }

  const forest = FOREST_BELTS.find(
    (belt) =>
      record.lat >= belt.minLat &&
      record.lat <= belt.maxLat &&
      record.lng >= belt.minLng &&
      record.lng <= belt.maxLng
  );
  if (forest) {
    return {
      type: "Wildfire",
      contextName: forest.name,
      reason: `Demo pre-classification from the ${forest.name.toLowerCase()}; no nearby curated industrial or mining reference matched.`
    };
  }

  return {
    type: "Wildfire",
    contextName: `${regionFor(record.lat, record.lng)} thermal anomaly`,
    reason: "Demo fallback label for a FIRMS thermal anomaly without a verified industrial, flare, mining, or agricultural context."
  };
}

function riskFor(record, persistenceCount) {
  const brightness = record.brightness ?? 0;
  const frp = record.frp ?? 0;
  const persistenceBoost = persistenceCount >= 5 ? 1 : 0;
  if (brightness >= 350 || frp >= 50 || persistenceBoost >= 1) return "Critical";
  if (brightness >= 330 || frp >= 20) return "High";
  if (brightness >= 315 || frp >= 5) return "Medium";
  return "Low";
}

function scoreFor(record) {
  return (record.frp ?? 0) + (record.brightness ?? 0) * 0.25;
}

function clusterKey(record) {
  return `${record.lat.toFixed(1)}:${record.lng.toFixed(1)}`;
}

function makeId(row) {
  const safe = `${row.satellite}-${row.acq_date}-${row.acq_time}-${row.latitude}-${row.longitude}`
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .toUpperCase();
  return `FIRMS-${safe}`;
}

async function fetchIndiaBoundary() {
  const response = await fetch(INDIA_BOUNDARY_URL, {
    headers: { "User-Agent": "AGNI-DRISHTI-selection-demo/1.0" }
  });
  if (!response.ok) throw new Error(`India boundary request failed (${response.status})`);
  const collection = await response.json();
  const feature = collection.features?.find((item) => item.properties?.name === "India");
  if (!feature) throw new Error("India boundary was not found in the geocoder response");
  return feature.geometry;
}

async function fetchWindow(source, days, startDate, key) {
  const coordinates = INDIA_BBOX.join(",");
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(
    key
  )}/${source}/${coordinates}/${days}/${formatDate(startDate)}`;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${source} FIRMS request failed (${response.status}): ${text.slice(0, 180)}`);
  }
  return parseCsv(text);
}

function normalizedRecord(row, sourceLabel) {
  const lat = numberOrNull(row.latitude);
  const lng = numberOrNull(row.longitude);
  const observedAt = acquisitionTime(row);
  return {
    id: makeId(row),
    lat,
    lng,
    brightness: numberOrNull(row.bright_ti4),
    frp: numberOrNull(row.frp),
    scan: numberOrNull(row.scan),
    track: numberOrNull(row.track),
    acqDate: row.acq_date,
    acqTime: row.acq_time,
    observedAt: observedAt.toISOString(),
    satellite: row.satellite,
    instrument: row.instrument,
    detectionConfidence: row.confidence,
    version: row.version,
    dayNight: row.daynight,
    source: `NASA FIRMS / ${sourceLabel}`,
    region: regionFor(lat, lng)
  };
}

function buildDetections(records) {
  const clusters = new Map();
  for (const record of records) {
    const key = clusterKey(record);
    if (!clusters.has(key)) {
      clusters.set(key, {
        representative: record,
        count: 0,
        firstObservedAt: record.observedAt,
        lastObservedAt: record.observedAt
      });
    }
    const cluster = clusters.get(key);
    cluster.count += 1;
    if (record.observedAt < cluster.firstObservedAt) cluster.firstObservedAt = record.observedAt;
    if (record.observedAt > cluster.lastObservedAt) cluster.lastObservedAt = record.observedAt;
    if (scoreFor(record) > scoreFor(cluster.representative)) cluster.representative = record;
  }

  const byType = new Map();
  for (const cluster of clusters.values()) {
    const classification = classify(cluster.representative);
    const observedAt = new Date(cluster.representative.observedAt);
    const persistenceLabel = `${cluster.count} observation${cluster.count === 1 ? "" : "s"} in this 0.1° demo cluster`;
    const detection = {
      ...cluster.representative,
      type: classification.type,
      risk: riskFor(cluster.representative, cluster.count),
      date: displayDate(observedAt),
      time: displayTime(observedAt),
      isoDate: cluster.representative.acqDate,
      contextName: classification.contextName,
      classificationMethod: "Demo pre-classified",
      classificationReasons: [
        classification.reason,
        `${persistenceLabel}; first seen ${displayDate(new Date(cluster.firstObservedAt))}.`,
        `Risk is a demo priority heuristic using FIRMS brightness (${cluster.representative.brightness ?? "—"} K), FRP (${cluster.representative.frp ?? "—"} MW), and cluster count.`
      ],
      persistenceCount: cluster.count,
      firstObservedAt: cluster.firstObservedAt,
      lastObservedAt: cluster.lastObservedAt,
      name: `${cluster.representative.satellite} FIRMS observation · ${classification.contextName}`,
      description: `${classification.reason} This is an authentic NASA FIRMS thermal-anomaly record; the PS category and demo priority are contextual labels, not trained-model output.`
    };
    if (!byType.has(classification.type)) byType.set(classification.type, []);
    byType.get(classification.type).push(detection);
  }

  const selected = [];
  const allCandidates = [...byType.values()].flat();
  const quota = { Industrial: 28, GasFlare: 20, Agricultural: 38, Mining: 20, Wildfire: 38 };
  for (const [type, cap] of Object.entries(quota)) {
    const recordsForType = (byType.get(type) || []).sort(
      (a, b) => scoreFor(b) - scoreFor(a) || b.observedAt.localeCompare(a.observedAt)
    );
    selected.push(...recordsForType.slice(0, cap));
  }

  // Keep a visible MODIS sample in the curated demo set alongside higher-resolution VIIRS.
  const selectedIds = new Set(selected.map((detection) => detection.id));
  const modis = allCandidates
    .filter((detection) => detection.instrument === "MODIS")
    .sort((a, b) => scoreFor(b) - scoreFor(a) || b.observedAt.localeCompare(a.observedAt));
  let selectedModis = selected.filter((detection) => detection.instrument === "MODIS").length;
  for (const detection of modis) {
    if (selectedModis >= 12) break;
    if (!selectedIds.has(detection.id)) {
      selected.push(detection);
      selectedIds.add(detection.id);
      selectedModis += 1;
    }
  }

  return selected
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    .slice(0, 150);
}

async function main() {
  await readLocalEnv();
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    throw new Error("FIRMS_MAP_KEY is missing. Add it to the ignored .env file or set it for this command.");
  }

  const days = Math.min(7, Math.max(5, Number(readArgument("days", "7"))));
  const end = utcDate(readArgument("end", formatDate(new Date())));
  const start = addUtcDays(end, -(days - 1));
  const firstWindowEnd = addUtcDays(start, 4);
  const firstWindowDays = 5;
  const secondWindowDays = days - firstWindowDays;

  console.log(`FIRMS snapshot: ${formatDate(start)} to ${formatDate(end)} (${days} days)`);
  const boundary = await fetchIndiaBoundary();
  const rawRows = [];

  for (const source of SOURCES) {
    const rows = await fetchWindow(source.id, firstWindowDays, start, key);
    rawRows.push(...rows.map((row) => ({ row, sourceLabel: source.label })));
    console.log(`  ${source.label}: ${rows.length} rows`);
    if (secondWindowDays > 0) {
      const secondRows = await fetchWindow(source.id, secondWindowDays, firstWindowEnd, key);
      rawRows.push(...secondRows.map((row) => ({ row, sourceLabel: source.label })));
      console.log(`  ${source.label}: +${secondRows.length} rows`);
    }
  }

  const normalized = rawRows
    .map(({ row, sourceLabel }) => {
      try {
        return normalizedRecord(row, sourceLabel);
      } catch {
        return null;
      }
    })
    .filter(
      (record) =>
        record &&
        Number.isFinite(record.lat) &&
        Number.isFinite(record.lng) &&
        record.observedAt &&
        !Number.isNaN(new Date(record.observedAt).getTime()) &&
        record.detectionConfidence !== "l" &&
        pointInIndia(record.lng, record.lat, boundary)
    );
  const detections = buildDetections(normalized);
  const countsByType = Object.fromEntries(
    Object.keys({ Industrial: 1, GasFlare: 1, Agricultural: 1, Mining: 1, Wildfire: 1 }).map(
      (type) => [type, detections.filter((detection) => detection.type === type).length]
    )
  );

  const output = {
    metadata: {
      provider: "NASA FIRMS",
      product: "LANCE Near Real-Time active fire detections",
      region: "India",
      generatedAt: new Date().toISOString(),
      windowStart: formatDate(start),
      windowEnd: formatDate(end),
      windowDays: days,
      sources: SOURCES.map((source) => source.label),
      rawBoundingBoxCount: rawRows.length,
      qualityFilteredIndiaCount: normalized.length,
      clusteredCount: new Set(normalized.map(clusterKey)).size,
      includedDetectionCount: detections.length,
      countsByType,
      classificationStatus: "Pre-classified for selection demo; not trained-model output",
      integrityNote: "Coordinates, acquisition times, brightness, FRP, satellite, instrument and detection confidence originate from NASA FIRMS."
    },
    detections
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${detections.length} representative detections from ${normalized.length} quality-filtered India records to ${path.relative(ROOT, OUTPUT)}`
  );
  console.log(`Type counts: ${JSON.stringify(countsByType)}`);
}

main().catch((error) => {
  console.error(`FIRMS refresh failed: ${error.message}`);
  process.exitCode = 1;
});
