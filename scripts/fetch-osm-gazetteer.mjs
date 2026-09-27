#!/usr/bin/env node

/**
 * Builds a compact gazetteer of mapped Indian industrial, mining and flare
 * sites from OpenStreetMap, used to classify FIRMS observations.
 *
 * Why a gazetteer rather than a lookup per detection: a per-detection Overpass
 * query needs roughly a hundred requests, and the public endpoints rate limit
 * or time out long before that finishes. A single `out center` sweep of the
 * India bounding box needs one request, and matching a detection against the
 * nearest mapped site is accurate enough for the PS categories: a thermal
 * anomaly 2 km from a mapped steel plant is industrial, whatever the
 * surrounding region box claims.
 *
 * Where per-detection polygon data is available (src/data/osm-context.json)
 * that is used first, because point-in-polygon is exact.
 *
 * Overpass data is (c) OpenStreetMap contributors, ODbL.
 *
 * Usage:
 *   node scripts/fetch-osm-gazetteer.mjs
 *   node scripts/fetch-osm-gazetteer.mjs --force
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { haversineKm, osmCategoryFor } from "./lib/osm-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAPSHOT = path.join(ROOT, "src", "data", "firms-india-latest.json");
const OUTPUT = path.join(ROOT, "src", "data", "osm-gazetteer.json");

const INDIA_BBOX = "6,68,36,98";

/*
 * The main instance throttles hard on a sweep this size, so mirrors are tried
 * in order of observed reliability. overpass.osm.ch is deliberately absent: it
 * answers instantly but only holds a regional extract, so it silently returns
 * nothing for India.
 */
const ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const TIMEOUT_MS = 300000;

/** Only keep sites that could plausibly explain a detection. */
const KEEP_RADIUS_KM = 40;

/*
 * `out center` rather than `out geom`. Geometry for all of India is what makes
 * these sweeps time out; centroids are enough to rank a detection against the
 * nearest mapped site.
 */
const QUERY = `[out:json][timeout:300];
(
  way[landuse~"^(industrial|quarry|mine)$"]["name"](${INDIA_BBOX});
  relation[landuse~"^(industrial|quarry|mine)$"]["name"](${INDIA_BBOX});
  way[power~"^(plant|generator)$"](${INDIA_BBOX});
  node[power~"^(plant|generator)$"](${INDIA_BBOX});
  node[man_made="flare"](${INDIA_BBOX});
  node[natural="gas_flare"](${INDIA_BBOX});
  node[man_made~"^(mine|mine_shaft)$"](${INDIA_BBOX});
);
out center;`;

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchGazetteer() {
  let lastError;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();
    process.stdout.write(`  trying ${endpoint.split("/")[2]} ... `);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "agni-drishti-sih-demo/1.0 (PS 26162 selection demo)"
        },
        body: new URLSearchParams({ data: QUERY }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      console.log(
        `ok in ${Math.round((Date.now() - startedAt) / 1000)}s ` +
          `(${payload.elements.length} elements)`
      );
      return payload;
    } catch (error) {
      lastError = error;
      console.log(`failed: ${String(error.message).slice(0, 60)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function toSites(payload, detections) {
  const sites = [];
  const seen = new Set();

  for (const element of payload.elements || []) {
    const category = osmCategoryFor(element.tags);
    if (!category) continue;

    let lat = element.lat;
    let lng = element.lon;
    if (element.type !== "node" && element.center) {
      lat = element.center.lat;
      lng = element.center.lon;
    }
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const nearestDetection = detections.reduce(
      (best, detection) => {
        const km = haversineKm(lat, lng, detection.lat, detection.lng);
        return km < best.km ? { km, detection } : best;
      },
      { km: Infinity, detection: null }
    );
    if (nearestDetection.km > KEEP_RADIUS_KM) continue;

    const name = category.name
      ? String(category.name).replace(/\s+/g, " ").trim().slice(0, 80)
      : null;
    // Unnamed industrial land is far too common to be individually useful, so
    // keep it only as a class hint and prefer named sites when ranking.
    const key = [category.type, name || "", lat.toFixed(3), lng.toFixed(3)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    sites.push({
      type: category.type,
      label: category.label,
      name,
      named: Boolean(name),
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    });
  }

  return sites;
}

async function main() {
  const force = process.argv.includes("--force");
  const snapshot = await loadJson(SNAPSHOT, null);
  if (!snapshot || !Array.isArray(snapshot.detections)) {
    throw new Error(`Could not read detections from ${SNAPSHOT}`);
  }

  if (!force) {
    const existing = await loadJson(OUTPUT, null);
    if (existing && Array.isArray(existing.sites) && existing.sites.length) {
      console.log(
        `Gazetteer already has ${existing.sites.length} sites ` +
          `(${existing.generatedAt}). Use --force to rebuild.`
      );
      return;
    }
  }

  console.log("Fetching India OSM site gazetteer (one request)...");
  const payload = await fetchGazetteer();
  const sites = toSites(payload, snapshot.detections);
  sites.sort((a, b) => Number(b.named) - Number(a.named) || a.name?.localeCompare(b.name || ""));

  const output = {
    generatedAt: new Date().toISOString(),
    source: "OpenStreetMap via Overpass API (ODbL), out center over the India bounding box",
    note:
      "Centroids of mapped industrial, mining and flare features near the snapshot's detections. Used for proximity-based category matching.",
    siteCount: sites.length,
    sites
  };

  await fs.writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  const named = sites.filter((s) => s.named).length;
  console.log(
    `\nWrote ${sites.length} sites (${named} named) to ${path.relative(ROOT, OUTPUT)}`
  );
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
