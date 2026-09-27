/**
 * Shared OpenStreetMap context classification for the PS 26162 demo.
 *
 * The FIRMS snapshot only tells us "a thermal anomaly was observed here".
 * Deciding whether that anomaly is industrial, a gas flare, mining,
 * agricultural burning or a wildfire needs land-use context, which is what
 * OSM provides. Coarse lat/lng boxes are not good enough: an
 * "industrial landuse" polygon is authoritative where it exists.
 *
 * This module is pure (no network, no fs) so both the FIRMS refresh script
 * and the standalone re-classifier can use it.
 */

/* =========================================================
   OSM TAG -> PS CATEGORY
   Ordered most specific first; the first match wins.
   `label` is used to build a human-readable context name.
   ========================================================= */

const TAG_RULES = [
  {
    type: "GasFlare",
    label: "gas flare",
    test: (t) =>
      t.natural === "gas_flare" ||
      t.man_made === "flare" ||
      t["man_made:flare"] === "yes" ||
      (t.industrial === "gas" && t.man_made === "works")
  },
  {
    type: "Mining",
    label: "mining or quarry",
    test: (t) =>
      t.landuse === "quarry" ||
      t.landuse === "mine" ||
      t.man_made === "mine_shaft" ||
      t.man_made === "mine" ||
      t.landuse === "industrial" && /coal|mine|quarry|iron ore|mining|mineral/i.test(t.name || "")
  },
  {
    type: "Industrial",
    label: "industrial",
    test: (t) =>
      t.landuse === "industrial" ||
      t.landuse === "railway" && t.railway === "sidings" ||
      t.man_made === "works" ||
      t.industrial === "yes" ||
      t.power === "plant" ||
      t.power === "generator" ||
      t.power === "substation" ||
      t.facility === "works" ||
      t.amenity === "fuel" ||
      t.amenity === "oil_gas"
  },
  {
    type: "Agricultural",
    label: "agricultural",
    test: (t) =>
      t.landuse === "farmland" ||
      t.landuse === "orchard" ||
      t.landuse === "vineyard" ||
      t.landuse === "plantation" ||
      t.landuse === "greenhouse_horticulture" ||
      t.natural === "wood" && /forest|plantation|timber/i.test(t.name || "")
  },
  {
    type: "Wildfire",
    label: "forest or scrub",
    test: (t) =>
      t.natural === "wood" ||
      t.natural === "scrub" ||
      t.natural === "heath" ||
      t.landuse === "forest"
  }
];

/**
 * Map raw OSM tags to a PS category.
 * Returns null when the feature is not land-use relevant.
 */
export function osmCategoryFor(tags) {
  if (!tags) return null;
  for (const rule of TAG_RULES) {
    if (rule.test(tags)) {
      return { type: rule.type, label: rule.label, name: cleanName(tags.name) };
    }
  }
  return null;
}

function cleanName(raw) {
  if (!raw) return null;
  const trimmed = String(raw).replace(/\s+/g, " ").trim();
  return trimmed.length ? trimmed.slice(0, 80) : null;
}

/* =========================================================
   GEOMETRY
   ========================================================= */

/** Ray-casting test. `ring` is an array of [lat, lng] pairs. */
export function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Test a point against an OSM multipolygon/way geometry.
 * `geometry` is Overpass `out geom` style: array of {lat, lon}.
 * The first ring is the outer boundary; any later ring is a hole.
 */
export function pointInGeometry(lat, lng, geometry) {
  if (!Array.isArray(geometry) || geometry.length < 3) return false;
  const ring = geometry.map((p) => [p.lat, p.lon]);
  if (!pointInRing(lat, lng, ring)) return false;
  for (let i = 1; i < geometry.length; i++) {
    if (geometry[i] && geometry[i].length >= 3) {
      const hole = geometry[i].map((p) => [p.lat, p.lon]);
      if (pointInRing(lat, lng, hole)) return false;
    }
  }
  return true;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* =========================================================
   CLASSIFICATION FROM OSM CONTEXT
   ========================================================= */

/** Polygons are authoritative. Nodes need to be genuinely close. */
export const NODE_MATCH_KM = 2.5;

/**
 * Decide a PS category for a FIRMS record from its cached OSM context.
 *
 * `context` is the cached feature list for that location, each entry shaped:
 *   { kind: "area" | "node", type, label, name, lat, lng, geometry? }
 *
 * Returns null when OSM has nothing relevant, so callers can fall back to
 * their own coarser logic.
 */
export function classifyFromOsm(record, context) {
  if (!Array.isArray(context) || !context.length) return null;

  // 1. Area containment wins: if the observation falls inside a mapped
  //    industrial / mining / flare / agricultural polygon, that IS the
  //    land use at that pixel.
  for (const feature of context) {
    if (feature.kind !== "area" || !feature.geometry) continue;
    if (!pointInGeometry(record.lat, record.lng, feature.geometry)) continue;
    return {
      type: feature.type,
      contextName: feature.name
        ? `${feature.name} (OSM ${feature.label})`
        : `Mapped OSM ${feature.label}`,
      reason: `OSM land-use polygon at this coordinate is ${feature.label}${
        feature.name ? ` (${feature.name})` : ""
      }; matched by point-in-polygon against OpenStreetMap.`
    };
  }

  // 2. Otherwise fall back to the nearest relevant point feature, but only
  //    if it is close enough that the heat source is plausibly from it.
  let nearest = null;
  for (const feature of context) {
    if (feature.kind !== "node" || !feature.name) continue;
    const distance = haversineKm(record.lat, record.lng, feature.lat, feature.lng);
    if (distance <= NODE_MATCH_KM && (!nearest || distance < nearest.distance)) {
      nearest = { feature, distance };
    }
  }

  if (nearest) {
    return {
      type: nearest.feature.type,
      contextName: `${nearest.feature.name} (OSM ${nearest.feature.label})`,
      reason: `Nearest mapped OSM ${nearest.feature.label} (${nearest.feature.name}) is ${nearest.distance.toFixed(
        1
      )} km from the FIRMS observation.`
    };
  }

  return null;
}

/** Stable cache key so nearby observations share one Overpass lookup. */
export function contextKey(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

/* =========================================================
   CLASSIFICATION FROM A SITE GAZETTEER
   ========================================================= */

/**
 * How close a mapped site must be to explain a detection.
 *
 * Only *named* facilities are eligible. India has tens of thousands of small
 * unnamed `landuse=industrial` polygons, frequently little more than a shed
 * beside a road, and matching against those pulls genuine rural wildfires into
 * the industrial class. A named entry such as "JSW Ispat Steel Plant" is a
 * specific facility, which is the level of evidence the PS categories need.
 *
 * The radius is generous because a FIRMS observation is a coarse pixel: the
 * thermal plume from a large plant is routinely detected well away from the
 * plant boundary.
 */
export const GAZETTEER_MATCH_KM = 8;

/**
 * Decide a PS category by matching a record against named mapped OSM sites.
 *
 * Returns null when nothing is close enough, so callers keep their fallback.
 */
export function classifyFromGazetteer(record, sites) {
  if (!Array.isArray(sites) || !sites.length) return null;

  let best = null;
  for (const site of sites) {
    if (!site.named) continue;
    const distance = haversineKm(record.lat, record.lng, site.lat, site.lng);
    if (distance > GAZETTEER_MATCH_KM) continue;
    if (!best || distance < best.distance) best = { site, distance };
  }
  if (!best) return null;

  const { site, distance } = best;
  return {
    type: site.type,
    contextName: site.name
      ? `${site.name} (OSM ${site.label})`
      : `Mapped OSM ${site.label}`,
    reason: site.name
      ? `Nearest mapped OSM ${site.label} is ${site.name}, ${distance.toFixed(
          1
        )} km from the FIRMS observation.`
      : `Inside a mapped OSM ${site.label} area (${distance.toFixed(
          1
        )} km to its centre).`
  };
}
