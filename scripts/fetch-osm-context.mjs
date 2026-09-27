#!/usr/bin/env node

/**
 * Fetches OpenStreetMap land-use context for the FIRMS detections in the
 * snapshot and caches it to src/data/osm-context.json.
 *
 * FIRMS tells us a thermal anomaly happened at a coordinate. It does not tell
 * us what kind of place that is. For PS 26162 the category depends entirely on
 * the land use, so we ask OSM what is actually mapped at each coordinate.
 *
 * Request shape matters a lot here. A bbox query per detection needs ~100
 * requests and reliably trips the public endpoints' rate limiting. Overpass's
 * `around:` filter accepts a whole list of coordinates in a single request, so
 * every detection in the snapshot is covered by a handful of calls instead.
 * Each query is also restricted to a small radius and to the classes that can
 * positively identify a category, which keeps the geometry payload small.
 *
 * The cache is written after every chunk, and any location that fails is left
 * out rather than cached as empty, so a rerun resumes where it stopped.
 *
 * Overpass data is (c) OpenStreetMap contributors, ODbL.
 *
 * Usage:
 *   node scripts/fetch-osm-context.mjs            # fetch only missing locations
 *   node scripts/fetch-osm-context.mjs --force    # refetch everything
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { contextKey, osmCategoryFor, haversineKm } from "./lib/osm-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAPSHOT = path.join(ROOT, "src", "data", "firms-india-latest.json");
const CACHE_FILE = path.join(ROOT, "src", "data", "osm-context.json");

/* Public mirrors, tried in turn. The main instance throttles aggressively. */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.jp/api/interpreter"
];

/** How close a mapped feature must be to count, in metres. */
const SEARCH_RADIUS_M = 3000;
/** Coordinates per request. Overpass dislikes very long around: lists. */
const CHUNK_SIZE = 20;
/** Per-request timeout. */
const TIMEOUT_MS = 90000;
/** Stop rather than run indefinitely against a public endpoint. */
const OVERALL_BUDGET_MS = 20 * 60 * 1000;
/** Pause between requests; the public endpoints dislike bursts. */
const POLITE_DELAY_MS = 2000;

/*
 * GEOM_QUERY returns full geometry for the classes that need point-in-polygon
 * tests: industrial sites, mines and quarries, power plants and works.
 *
 * CENTRE_QUERY returns `out center` for point-like features (flares, gas
 * flares, fuel depots) and for agricultural land, whose geometry covers most
 * of India and is what makes combined geometry requests time out.
 *
 * Forest and scrub are deliberately excluded: they are the single largest
 * source of geometry in India. When nothing matches, the caller's own coarser
 * logic already lands on the right answer for genuinely forested areas.
 */
const GEOM_QUERY = `[out:json][timeout:120];
(
  way(around:{{radius}},{{points}})[landuse~"^(industrial|quarry|mine)$"];
  relation(around:{{radius}},{{points}})[landuse~"^(industrial|quarry|mine)$"];
  way(around:{{radius}},{{points}})[power~"^(plant|generator)$"];
  way(around:{{radius}},{{points}})[man_made~"^(works|flare|mine|mine_shaft)$"];
);
out geom;`;

const CENTRE_QUERY = `[out:json][timeout:120];
(
  node(around:{{radius}},{{points}})[power~"^(plant|generator)$"];
  node(around:{{radius}},{{points}})[man_made~"^(flare|mine|mine_shaft|works)$"];
  node(around:{{radius}},{{points}})[natural="gas_flare"];
  node(around:{{radius}},{{points}})[amenity~"^(fuel|oil_gas)$"];
  node(around:{{radius}},{{points}})[landuse~"^(farmland|orchard|vineyard|plantation)$"];
  way(around:{{radius}},{{points}})[landuse~"^(farmland|orchard|vineyard|plantation)$"];
);
out center;`;

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function overpass(query, endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "agni-drishti-sih-demo/1.0 (PS 26162 selection demo)"
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Turn an Overpass response into a compact feature list. */
function featuresFrom(payload, { withGeometry }) {
  const features = [];
  for (const element of payload.elements || []) {
    const category = osmCategoryFor(element.tags);
    if (!category) continue;

    const rawName = category.name || (element.tags && element.tags.name) || null;
    const name = rawName
      ? String(rawName).replace(/\s+/g, " ").trim().slice(0, 80)
      : null;

    if (element.type === "node") {
      features.push({
        kind: "node",
        type: category.type,
        label: category.label,
        name,
        lat: element.lat,
        lng: element.lon
      });
      continue;
    }

    if (withGeometry) {
      const geometry = Array.isArray(element.geometry)
        ? element.geometry.filter((p) => typeof p.lat === "number")
        : null;
      if (!geometry || geometry.length < 3) continue;
      features.push({
        kind: "area",
        type: category.type,
        label: category.label,
        name,
        geometry: geometry.map((p) => ({
          lat: Number(p.lat.toFixed(5)),
          lon: Number(p.lon.toFixed(5))
        }))
      });
      continue;
    }

    const centre = element.center;
    if (!centre || typeof centre.lat !== "number") continue;
    features.push({
      kind: "node",
      type: category.type,
      label: category.label,
      name,
      lat: centre.lat,
      lng: centre.lng
    });
  }
  return features;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const startedAt = Date.now();
  const force = process.argv.includes("--force");
  const snapshot = await loadJson(SNAPSHOT, null);
  if (!snapshot || !Array.isArray(snapshot.detections)) {
    throw new Error(`Could not read detections from ${SNAPSHOT}`);
  }

  const cache = force ? {} : await loadJson(CACHE_FILE, {});

  const points = [];
  const seen = new Set();
  for (const detection of snapshot.detections) {
    const key = contextKey(detection.lat, detection.lng);
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ key, lat: detection.lat, lng: detection.lng });
  }

  // An entry carrying an error is a placeholder, not a real result.
  const hasContext = (entry) => entry && Array.isArray(entry.features) && !entry.error;
  const pending = points.filter((p) => force || !hasContext(cache[p.key]));
  const chunks = chunk(pending, CHUNK_SIZE);

  console.log(
    `OSM context: ${points.length} locations, ${pending.length} pending, ` +
      `${points.length - pending.length} cached`
  );
  console.log(
    `${chunks.length} chunks of up to ${CHUNK_SIZE} coordinates ` +
      `(radius ${SEARCH_RADIUS_M} m), 2 requests each\n`
  );

  let done = 0;
  let failed = 0;
  let cursor = 0;

  const runQuery = async (template, withGeometry, group) => {
    const pointsParam = group.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(",");
    const query = template
      .replace(/\{\{radius\}\}/g, String(SEARCH_RADIUS_M))
      .replace(/\{\{points\}\}/g, pointsParam);
    for (let attempt = 0; attempt < ENDPOINTS.length; attempt++) {
      const endpoint = ENDPOINTS[(cursor + attempt) % ENDPOINTS.length];
      try {
        const payload = await overpass(query, endpoint);
        return featuresFrom(payload, { withGeometry });
      } catch (error) {
        const short = String(error.message).slice(0, 26);
        process.stdout.write(
          `[${withGeometry ? "geom" : "centre"} ${endpoint.split("/")[2].split(".")[0]}: ${short}] `
        );
      }
    }
    return null;
  };

  for (const group of chunks) {
    if (Date.now() - startedAt > OVERALL_BUDGET_MS) {
      console.log(`\n! time budget reached after ${done}/${chunks.length} chunks`);
      break;
    }
    cursor += 1;

    const geomFeatures = await runQuery(GEOM_QUERY, true, group);
    const centreFeatures = await runQuery(CENTRE_QUERY, false, group);

    if (geomFeatures === null && centreFeatures === null) {
      failed += group.length;
      process.stdout.write(`chunk ${group.length} locations failed\n`);
    } else {
      const features = [...(geomFeatures || []), ...(centreFeatures || [])];
      for (const point of group) {
        const nearby = features.filter((feature) => {
          if (feature.kind === "node") {
            return (
              haversineKm(point.lat, point.lng, feature.lat, feature.lng) * 1000 <=
              SEARCH_RADIUS_M
            );
          }
          return feature.geometry.some(
            (vertex) =>
              haversineKm(point.lat, point.lng, vertex.lat, vertex.lon) * 1000 <=
              SEARCH_RADIUS_M
          );
        });
        cache[point.key] = { lat: point.lat, lng: point.lng, features: nearby };
      }
    }

    done += 1;
    const withLandUse = group.filter((p) => cache[p.key] && cache[p.key].features.length)
      .length;
    console.log(
      `  chunk ${done}/${chunks.length}: ${group.length} locations, ` +
        `${withLandUse} with OSM land use [${Math.round((Date.now() - startedAt) / 1000)}s]`
    );

    // Persist after every chunk; failed locations are simply absent, so a
    // rerun picks them up again.
    const ordered = {};
    for (const point of [...points].sort((a, b) => a.key.localeCompare(b.key))) {
      if (cache[point.key]) ordered[point.key] = cache[point.key];
    }
    await fs.writeFile(CACHE_FILE, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");

    await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
  }

  console.log(
    `\nDone in ${Math.round((Date.now() - startedAt) / 1000)}s. ` +
      `${failed} location(s) unresolved. ` +
      `Cache: ${path.relative(ROOT, CACHE_FILE)}`
  );
}

// Only run when executed directly, so importing helpers for testing is safe.
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
