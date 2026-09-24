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
| `npm run email-server` | Start the optional local SMS server |
| `npm run dev` | Start the SMS server and React development server together |

## Project structure

```text
src/
  App.js                         Main application and UI
  live.js                        FIRMS data context and derived metrics
  data/firms-india-latest.json   Checked-in India FIRMS snapshot
  components/SatelliteEarth.jsx  Procedural satellite visualization
scripts/
  refresh-firms-data.mjs         Local FIRMS snapshot refresh script
server/
  index.js                       Optional local SMS server
public/
  logo.svg                       AGNI DRISHTI logo
  index.html                     HTML shell and theme bootstrap
```

## Demo workflow

1. Start the development server with `npm start`.
2. Open `http://localhost:3000`.
3. Explore the FIRMS dashboard and detection stream.
4. Open **Maps** to inspect the India FIRMS snapshot.
5. Open **Analytics** to use the working filters.
6. Open **Alerts** to view the priority-alert concept.
7. Use the theme button in the navbar to switch between dark and light mode.
