# AGNI DRISHTI

AGNI DRISHTI is a selection demo for **SIH PS 26162 — AI-based Detection and Classification of Industrial Fires and Persistent Thermal Sources**.

The application presents a seven-day India snapshot of NASA FIRMS active-fire observations, with a map, detection details, analytics, five PS-aligned categories and a priority-alert concept.

## Features

- India-only FIRMS snapshot for the current demo window
- VIIRS NOAA-20, VIIRS NOAA-21 and MODIS observations
- Industrial fire, gas flare, agricultural burning, mining activity and wildfire categories
- Interactive India map with type and risk filters
- FIRMS brightness, FRP, satellite, instrument, timestamp and quality fields
- Working analytics filters and seven-day trend chart
- Priority alert and SMS concept interface
- Dark and light UI themes with saved preference
- Responsive dashboard design for the selection demo

## Requirements

- Node.js 18 or newer
- npm 8 or newer

Check your versions:

```bash
node --version
npm --version
```

## Run the development server

Install dependencies once:

```bash
npm install
```

Start the React development server:

```bash
npm start
```

Open the app at:

```text
http://localhost:3000
```

The development server watches source files and reloads the browser when changes are made. Press `Ctrl+C` in the terminal to stop it.

## Environment variables

The FIRMS snapshot is already checked in at:

```text
src/data/firms-india-latest.json
```

A FIRMS key is only needed when refreshing the snapshot. Copy the example environment file if needed:

```bash
Copy-Item .env.example .env
```

Then add your key to `.env`:

```env
FIRMS_MAP_KEY=your_firms_map_key_here
```

The `.env` file is ignored by Git. The key is used only by the local refresh script and is not included in the browser bundle.

## Refresh the FIRMS snapshot

Request a free NASA FIRMS MAP_KEY from the official FIRMS map-key page, then run:

```bash
npm run firms:refresh
```

The default command creates a seven-day snapshot. The script downloads the FIRMS API windows, filters records to India, clusters observations and writes the representative dataset to:

```text
src/data/firms-india-latest.json
```

To choose an explicit end date:

```bash
npm run firms:refresh -- --days 7 --end 2026-09-24
```

## Land-use context and classification

FIRMS reports *that* a thermal anomaly was observed at a coordinate. It does not
report what kind of place that coordinate is, and for PS 26162 the category
depends entirely on the land use: the same observation is a different PS class
over a steel plant than over a forest.

Categories are therefore resolved against OpenStreetMap land use, queried
through the Overpass API (ODbL). A mapped `landuse=industrial` polygon that
contains the observation is authoritative, so a real industrial site is not
labelled wildfire just because it falls inside a coarse region box.

After refreshing, run:

```bash
npm run firms:osm          # build the OSM site gazetteer (one request)
npm run firms:reclassify   # re-apply the PS categories using that context
```

`firms:osm` needs network access and writes `src/data/osm-gazetteer.json`: a
compact list of mapped industrial, mining and flare sites across India, fetched
with a single Overpass request. A per-detection lookup would need roughly a
hundred requests, which the public endpoints rate limit long before it
finishes, so the gazetteer is the primary source.

For extra accuracy on specific locations there is an optional detail pass that
stores real OSM polygons for point-in-polygon tests:

```bash
npm run firms:osm:detail
```

It writes `src/data/osm-context.json`, which is not committed because it is
large and regenerable. It needs more requests, and is safe to rerun because it
resumes where it stopped. Detections with no mapped land use keep their coarser
curated label, which is the correct answer for genuinely forested or fallow
areas.

### Category priority

Labels are resolved strongest-evidence-first, because a generic land-use
polygon can silently erase a PS category:

1. **Curated named complexes.** These encode intent OSM cannot: a gas terminal
   is mapped as plain `landuse=industrial`, so letting OSM win would drop the
   gas flare category entirely.
2. **OSM named sites, by proximity.** Only named facilities count. India has
   tens of thousands of small unnamed `landuse=industrial` plots, frequently a
   shed beside a road, and matching those would pull rural wildfires into the
   industrial class.
3. **OSM polygons, by point-in-polygon.** Exact, used where the detail pass has
   cached them.
4. **Coarse region belts.** The last resort. A "forest belt" spanning 12
   degrees of longitude is what originally mislabelled real steel plants.

`firms:reclassify` only rewrites the demo category, context name and reason. It
never touches the authentic FIRMS values: coordinates, acquisition time,
brightness, FRP, satellite, instrument and detection confidence are left
exactly as NASA reported them.

## Test and production build

Run the automated tests once:

```bash
npm test -- --watchAll=false --runInBand
```

Create an optimized production build:

```bash
npm run build
```

The build output is generated in:

```text
build/
```

The production build can be deployed to Netlify, Vercel or any static hosting provider.

## Available commands

| Command | Purpose |
|---|---|
| `npm start` | Start the development server on port 3000 |
| `npm test -- --watchAll=false --runInBand` | Run tests once |
| `npm run build` | Create the production build |
| `npm run firms:refresh` | Refresh the India FIRMS snapshot |
| `npm run firms:osm` | Build the OSM site gazetteer |
| `npm run firms:osm:detail` | Fetch per-detection OSM polygons (optional) |
| `npm run firms:reclassify` | Re-apply PS categories using OSM land use |
| `npm run email-server` | Start the optional local SMS server |
| `npm run dev` | Start the SMS server and React development server together |

## Project structure

```text
src/
  App.js                         Main application and UI
  live.js                        FIRMS data context and derived metrics
  data/firms-india-latest.json   Checked-in India FIRMS snapshot
  data/osm-gazetteer.json        Mapped OSM industrial/mining/flare sites
  components/SatelliteEarth.jsx  Procedural satellite visualization
scripts/
  refresh-firms-data.mjs         Local FIRMS snapshot refresh script
  fetch-osm-gazetteer.mjs        Builds the OSM site gazetteer
  fetch-osm-context.mjs          Optional per-detection OSM polygon pass
  osm-reclassify.mjs             Re-applies PS categories from OSM land use
  lib/osm-classify.mjs           OSM tag mapping, point-in-polygon, matching
server/
  index.js                       Optional local SMS server
public/
  logo.svg                       AGNI DRISHTI logo
  index.html                     HTML shell and theme bootstrap
```

## Walkthrough

A first-run coach mark explains the controls on whichever page the viewer is
on, so someone opening the app cold can tell what each button does without you
narrating it.

- Plays automatically once, then never again.
- Replay it any time from the question mark button in the navbar.
- Steps are per page, so a judge can re-watch just the map.
- `SKIP` and `Esc` both dismiss it; arrow keys move between steps.
- The page scrolls itself to bring each control into view, because the
  walkthrough is modal and you cannot scroll it by hand.
- The card flips to the opposite side of a control rather than sitting on top
  of it when the preferred side has no room.
- Styled with the existing design tokens, so it matches the active theme.

For a demo you can force it to play again regardless of the stored flag:

```text
http://localhost:3000/?walkthrough=1     play the walkthrough now
http://localhost:3000/?walkthrough=reset clear the flag and play it
```

The "seen" flag lives in `localStorage` under `agni-drishti-walkthrough-seen`,
and is only written when the walkthrough is finished or skipped.

## Demo workflow

1. Start the development server with `npm start`.
2. Open `http://localhost:3000`.
3. Explore the FIRMS dashboard and detection stream.
4. Open **Maps** to inspect the India FIRMS snapshot.
5. Open **Analytics** to use the working filters.
6. Use the theme button in the navbar to switch between dark and light mode.
7. Press the question mark in the navbar to replay the walkthrough.
