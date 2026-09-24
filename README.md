# AGNI DRISHTI

AGNI DRISHTI is a selection demo for **PS 26162 — AI-based Detection and Classification of Industrial Fires and Persistent Thermal Sources**.

## What the demo uses

The app loads `src/data/firms-india-latest.json`, a build-time snapshot generated from NASA FIRMS LANCE near-real-time active-fire detections for India. The current snapshot covers **18–24 September 2026** and includes VIIRS NOAA-20, VIIRS NOAA-21 and MODIS records after an India boundary filter.

FIRMS supplies the authentic coordinates, acquisition date/time, brightness temperature, fire radiative power, satellite, instrument, day/night flag and detection-quality field. The five problem-statement categories are explicitly **pre-classified for the demo** using curated context; they are not claims of trained-model output.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Refresh the FIRMS snapshot

Create a free NASA FIRMS MAP_KEY from the official FIRMS map-key page, then add it to the ignored local `.env` file:

```env
FIRMS_MAP_KEY=your_key_here
```

Refresh the last seven days:

```bash
npm run firms:refresh
```

The refresh script is build-time only. The API key is never written to the JSON dataset or shipped to the browser. It downloads the two API windows required by FIRMS (five days plus two days), filters coordinates against India's boundary, clusters observations and writes a representative demo subset.

## Demo data honesty

The UI labels the feed as an **India FIRMS snapshot**, not a live stream. FIRMS values are shown as received. The category labels, risk priority and illustrative heat-pattern visualization are marked as demo context/visualization. The trained classifier, real-time ingestion, persistence engine, GIS storage and production alerts remain hackathon-phase work.

## Useful commands

- `npm start` — development server
- `npm run build` — production build
- `npm test -- --watchAll=false` — smoke test
- `npm run firms:refresh` — refresh the cached India FIRMS snapshot
- `npm run email-server` — optional local Twilio server; alerts are not triggered automatically by the demo UI
