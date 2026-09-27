#!/usr/bin/env node

/**
 * Re-classifies the existing FIRMS snapshot using cached OpenStreetMap
 * land-use context.
 *
 * The snapshot's PS category is a demo label. Coarse lat/lng belts mislabel
 * real industrial sites as "wildfire" because a bounding box cannot know that
 * a steel plant sits inside a region labelled forest. OSM land-use polygons
 * are authoritative where they exist, so they take priority.
 *
 * This only rewrites the demo category fields. Every authentic FIRMS value
 * (coordinates, times, brightness, FRP, satellite, confidence) is left
 * untouched.
 *
 * Overpass data is (c) OpenStreetMap contributors, ODbL.
 *
 * Usage:
 *   node scripts/osm-reclassify.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { classifyFromOsm, classifyFromGazetteer, contextKey } from "./lib/osm-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAPSHOT = path.join(ROOT, "src", "data", "firms-india-latest.json");
const CACHE_FILE = path.join(ROOT, "src", "data", "osm-context.json");
const GAZETTEER_FILE = path.join(ROOT, "src", "data", "osm-gazetteer.json");

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function countsByType(detections) {
  const counts = { Industrial: 0, GasFlare: 0, Agricultural: 0, Mining: 0, Wildfire: 0 };
  for (const detection of detections) {
    if (counts[detection.type] === undefined) counts[detection.type] = 0;
    counts[detection.type] += 1;
  }
  return counts;
}

async function main() {
  const snapshot = await readJson(SNAPSHOT);
  const cache = await readJson(CACHE_FILE).catch(() => ({}));
  const gazetteerFile = await readJson(GAZETTEER_FILE).catch(() => null);
  const gazetteer = (gazetteerFile && gazetteerFile.sites) || [];

  console.log(
    `OSM sources: ${Object.keys(cache).length} cached locations, ` +
      `${gazetteer.length} gazetteer sites`
  );

  let changed = 0;
  const changes = [];
  let unmapped = 0;

  for (const detection of snapshot.detections) {
    // Curated named complexes win, because OSM maps a gas terminal as plain
    // `landuse=industrial` and would otherwise erase the gas flare category.
    const isCurated = /industrial and refinery belt|gas and petrochemical belt|gas terminal belt|thermal power belt|port and steel belt|coalfield belt|steel belt|mining belt/.test(
      detection.contextName
    );

    // Point-in-polygon where we have it, since that is exact, then fall back to
    // proximity against named mapped sites.
    const key = contextKey(detection.lat, detection.lng);
    const entry = cache[key];
    const verdict = isCurated
      ? null
      : (entry ? classifyFromOsm(detection, entry.features) : null) ||
        classifyFromGazetteer(detection, gazetteer);

    if (!verdict) {
      if (!isCurated) unmapped += 1;
      continue;
    }

    const typeChanged = verdict.type !== detection.type;
    // Refresh provenance even when the category is unchanged, so the stored
    // reason always describes the evidence that is actually available now.
    if (!typeChanged && verdict.contextName === detection.contextName) continue;

    if (typeChanged) {
      changes.push({
        lat: detection.lat,
        lng: detection.lng,
        from: detection.type,
        fromContext: detection.contextName,
        to: verdict.type,
        toContext: verdict.contextName
      });
    }

    detection.type = verdict.type;
    detection.contextName = verdict.contextName;
    detection.classificationMethod = "Demo pre-classified (OSM land use)";
    detection.classificationReasons = [
      verdict.reason,
      ...detection.classificationReasons.filter(
        (reason) => !/^Demo pre-classification from curated|^Demo fallback label/.test(reason)
      )
    ];
    detection.name = `${detection.satellite} FIRMS observation · ${verdict.contextName}`;
    detection.description = `${verdict.reason} This is an authentic NASA FIRMS thermal-anomaly record; the PS category and demo priority are contextual labels, not trained-model output.`;
    changed += 1;
  }

  snapshot.metadata.countsByType = countsByType(snapshot.detections);
  snapshot.metadata.classificationStatus =
    "Pre-classified for selection demo using OpenStreetMap land-use context; not trained-model output";
  snapshot.metadata.integrityNote =
    "Coordinates, acquisition times, brightness, FRP, satellite, instrument and detection confidence originate from NASA FIRMS.";
  snapshot.metadata.landUseSource =
    "Land-use context from OpenStreetMap via Overpass API (ODbL), matched by point-in-polygon where available and by proximity to mapped sites otherwise.";
  snapshot.metadata.reclassifiedAt = new Date().toISOString();

  await fs.writeFile(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Re-classified ${changed} of ${snapshot.detections.length} detections.`);
  console.log(`No OSM land-use match (kept curated label): ${unmapped}`);
  console.log(`\nChanges:`);
  for (const change of changes) {
    console.log(
      `  ${change.lat.toFixed(4)},${change.lng.toFixed(4)}  ${change.from} -> ${change.to}`
    );
    console.log(`      was: ${change.fromContext}`);
    console.log(`      now: ${change.toContext}`);
  }
  console.log(`\ncountsByType:`, snapshot.metadata.countsByType);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
