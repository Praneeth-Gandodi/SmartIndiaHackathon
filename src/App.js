import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  LiveDataProvider,
  useLiveData
} from "./live";
import SatelliteEarth from "./components/SatelliteEarth";

/* =========================================================
   AGNI DRISHTI
   Industrial Fire & Thermal Source Intelligence
   Everything intentionally contained in App.js
========================================================= */

const RISK_ORDER = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};
const TYPE_LABEL = {
  Industrial: "INDUSTRIAL FIRE",
  GasFlare: "GAS FLARE",
  Agricultural: "AGRICULTURAL BURNING",
  Mining: "MINING ACTIVITY",
  Wildfire: "WILDFIRE"
};

const TYPE_META = {
  Industrial: {
    short: "I",
    label: "INDUSTRIAL",
    color: "#FF5A1F"
  },
  GasFlare: {
    short: "G",
    label: "GAS FLARE",
    color: "#42A5FF"
  },
  Agricultural: {
    short: "A",
    label: "AGRICULTURAL",
    color: "#FFC857"
  },
  Mining: {
    short: "M",
    label: "MINING",
    color: "#B68CFF"
  },
  Wildfire: {
    short: "W",
    label: "WILDFIRE",
    color: "#36D399"
  }
};

const TYPE_FILTER_LABEL = {
  Industrial: "INDUSTRIAL",
  GasFlare: "GAS FLARE",
  Agricultural: "AGRICULTURAL",
  Mining: "MINING",
  Wildfire: "WILDFIRE"
};

const THEME_STORAGE_KEY = "agni-drishti-theme";
const THEME_COLORS = {
  dark: "#05070A",
  light: "#F4F6F8"
};

function getInitialTheme() {
  let savedTheme = null;

  try {
    savedTheme = window.localStorage.getItem(
      THEME_STORAGE_KEY
    );
  } catch {
    // Use the operating-system preference when storage is unavailable.
  }

  if (
    savedTheme === "dark" ||
    savedTheme === "light"
  ) {
    return savedTheme;
  }

  return window.matchMedia?.(
    "(prefers-color-scheme: light)"
  )?.matches
    ? "light"
    : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      THEME_COLORS[theme]
    );
}

const RISK_META = {
  Critical: "#FF3040",
  High: "#FF8A1F",
  Medium: "#FFC857",
  Low: "#36D399"
};

/* =========================================================
   LEAFLET LOADER
========================================================= */

function injectLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById("firewatch-leaflet-css")) {
      const css = document.createElement("link");
      css.id = "firewatch-leaflet-css";
      css.rel = "stylesheet";
      css.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }

    const existing = document.getElementById(
      "firewatch-leaflet-script"
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");

    script.id = "firewatch-leaflet-script";
    script.src =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;

    script.onload = () => resolve(window.L);
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen({ onComplete }) {
  const [step, setStep] = useState(0);

  const steps = [
    "LOADING INDIA FIRMS SNAPSHOT",
    "VALIDATING NASA LANCE RECORDS",
    "CLUSTERING 7-DAY OBSERVATIONS",
    "APPLYING DEMO CONTEXT LABELS",
    "INDIA SNAPSHOT READY"
  ];

  useEffect(() => {
    let current = 0;

    const timer = setInterval(() => {
      current += 1;

      if (current >= steps.length) {
        clearInterval(timer);
        setTimeout(onComplete, 550);
      } else {
        setStep(current);
      }
    }, 430);

    return () => clearInterval(timer);
  }, [onComplete, steps.length]);

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="loading-screen">
      <div className="loading-grid" />

      <div className="loading-core">
        <div className="loading-orbit orbit-one" />
        <div className="loading-orbit orbit-two" />

        <div className="loading-logo">
          <img src="/logo.svg" alt="AGNI DRISHTI logo" className="app-logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <div className="loading-title">
          AGNI DRISHTI
        </div>


        <div className="loading-subtitle">
          INDUSTRIAL FIRE & THERMAL INTELLIGENCE
        </div>

        <div className="loading-status">
          <span className="loading-dot" />
          {steps[step]}
        </div>

        <div className="loading-satellite-track">
          <div
            className="loading-satellite"
            style={{ left: `calc(${progress}% - 40px)` }}
          >
            <img
              src="/satellite.png"
              alt="Satellite"
              className="satellite-img"
            />
            {/* Glow effect underneath the satellite */}
            <div className="satellite-glow" />
          </div>
        </div>

        <div className="loading-progress">
          <span
            style={{
              width: `${progress}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

function Navbar({
  page,
  setPage,
  onSearch,
  onNotifications,
  notificationOpen,
  theme,
  onToggleTheme,
  onProfile,
  profileOpen
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(
      () => setTime(new Date()),
      1000
    );

    return () => clearInterval(timer);
  }, []);

  const clock = time.toLocaleTimeString("en-IN", {
    hour12: false,
    timeZone: "Asia/Kolkata"
  });

  const date = time
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    })
    .toUpperCase();

  const navigate = (next) => {
    setPage(next);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <>
      <nav className="navbar">
        <div
          className="brand"
          onClick={() => navigate("Dashboard")}
        >
          <div className="brand-mark">
            <img src="/logo.svg" alt="AGNI DRISHTI logo" className="app-logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          <div className="brand-copy">
            <div className="brand-name">
              AGNI DRISHTI
            </div>

            <div className="brand-subtitle">
              GEOSPATIAL INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="nav-links">
          {[
            "Dashboard",
            "Maps",
            "Analytics",
            "Alerts"
          ].map((item) => (
            <button
              key={item}
              className={`nav-link ${page === item ? "active" : ""
                }`}
              onClick={() => navigate(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-clock">
            <strong>{clock}</strong>
            <small>{date}</small>
          </div>

          <button
            className="icon-button theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☼" : "◐"}
          </button>

          <button
            className="icon-button"
            onClick={onSearch}
            aria-label="Open search"
          >
            ⌕
          </button>

          <button
            className={`icon-button notification-button ${notificationOpen ? "selected" : ""
              }`}
            onClick={onNotifications}
            aria-label="Open notifications"
          >
            ♢
            <i />
          </button>

          <button
            className={`profile profile-button ${profileOpen ? "active" : ""
              }`}
            onClick={onProfile}
            aria-label="Open profile"
          >
            CW
          </button>
        </div>
      </nav>
    </>
  );
}

/* =========================================================
   PROFILE PANEL
========================================================= */

function ProfilePanel({ onClose, setPage }) {
  return (
    <div className="profile-panel">
      <div className="profile-panel-head">
        <div className="profile-large">
          CW
        </div>

        <div>
          <strong>COMMAND OPERATOR</strong>
          <span>AGNI DRISHTI CONTROL</span>
        </div>
      </div>

      <div className="profile-status">
        <span />
        OPERATOR SESSION ACTIVE
      </div>

      <div className="profile-info">
        <div>
          <span>ACCESS LEVEL</span>
          <strong>LEVEL 04 · COMMAND</strong>
        </div>

        <div>
          <span>NETWORK</span>
          <strong>GLOBAL MONITORING</strong>
        </div>

        <div>
          <span>DATA FEED</span>
          <strong>NASA FIRMS / OSM</strong>
        </div>
      </div>

      <button
        onClick={() => {
          setPage("Alerts");
          onClose();
        }}
      >
        OPEN ALERT CENTER
        <span>→</span>
      </button>

      <button
        onClick={() => {
          setPage("Analytics");
          onClose();
        }}
      >
        VIEW SYSTEM ANALYTICS
        <span>→</span>
      </button>

      <div className="profile-footer">
        AGNI DRISHTI v1.0 · SECURE SESSION
      </div>
    </div>
  );
}

/* =========================================================
   STAT STRIP
========================================================= */

function StatStrip() {
  const {
    TOTAL_DETECTIONS,
    COUNT_BY_TYPE
  } = useLiveData();
  const stats = [
    [String(TOTAL_DETECTIONS), "FIRMS EVENTS"],
    [String(COUNT_BY_TYPE.Industrial), "INDUSTRIAL"],
    [String(COUNT_BY_TYPE.GasFlare), "GAS FLARES"],
    [String(COUNT_BY_TYPE.Agricultural), "AGRICULTURAL"],
    [String(COUNT_BY_TYPE.Mining), "MINING"],
    [String(COUNT_BY_TYPE.Wildfire), "WILDFIRE"]
  ];

  return (
    <div className="stat-strip">
      {stats.map(([value, label], index) => (
        <div
          className="stat-item"
          key={label}
        >
          <div className="stat-number">
            {value}
          </div>

          <div className="stat-label">
            {label}
          </div>

          {index !== stats.length - 1 && (
            <span className="stat-divider" />
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left"
}) {
  return (
    <div
      className={`section-heading reveal align-${align}`}
    >
      <div className="section-heading-title">
        <div className="eyebrow">
          {eyebrow}
        </div>

        <h2>{title}</h2>
      </div>

      {description && (
        <p>{description}</p>
      )}
    </div>
  );
}

/* =========================================================
   RADAR
========================================================= */

function Radar() {
  const points = [
    ["63%", "29%", "#FF3040"],
    ["38%", "62%", "#FF5A1F"],
    ["71%", "66%", "#FFC857"],
    ["24%", "40%", "#36D399"],
    ["52%", "44%", "#FF3040"]
  ];

  return (
    <div className="radar-wrap">
      <div className="radar">
        <div className="radar-grid" />

        <div className="radar-ring ring-1" />
        <div className="radar-ring ring-2" />
        <div className="radar-ring ring-3" />

        <div className="radar-cross horizontal" />
        <div className="radar-cross vertical" />

        <div className="radar-scan" />

        {points.map(
          ([left, top, color], index) => (
            <span
              key={index}
              className="radar-point"
              style={{
                left,
                top,
                background: color,
                boxShadow: `0 0 18px ${color}`
              }}
            />
          )
        )}

        <div className="radar-center" />
      </div>

      <div className="radar-coord coord-top">
        17.6868° N
      </div>

      <div className="radar-coord coord-bottom">
        83.2185° E
      </div>

      <div className="radar-label">
        LIVE ORBITAL SCAN
      </div>
    </div>
  );
}

/* =========================================================
   DETECTION ROW
========================================================= */

function DetectionRow({
  detection,
  index,
  expanded,
  onToggle,
  onNavigate
}) {
  return (
    <div
      className={`detection-row ${expanded ? "expanded" : ""
        }`}
    >
      <div
        className="detection-row-main"
        onClick={() => onToggle?.(detection)}
      >
        <div className="row-index">
          {String(index + 1).padStart(2, "0")}
        </div>

        <div className="row-main">
          <strong>{detection.name}</strong>

          <span>
            {TYPE_META[detection.type].label}
          </span>
        </div>

        <div
          className="row-risk"
          style={{
            color: RISK_META[detection.risk]
          }}
        >
          <i
            style={{
              background:
                RISK_META[detection.risk]
            }}
          />

          {detection.risk.toUpperCase()}
        </div>

        <div className="row-time">
          {detection.date}
          <br />
          {detection.time}
        </div>

        <div className="row-coordinate">
          {detection.lat.toFixed(4)}° N
          <br />
          {detection.lng.toFixed(4)}° E
        </div>

        <div className="row-toggle">
          {expanded ? "−" : "+"}
        </div>
      </div>

      {expanded && (
        <div className="row-details">
          <div className="row-details-copy">
            <small>
              INTELLIGENCE ASSESSMENT
            </small>

            <p>{detection.description}</p>
          </div>

          <div className="row-gases">
            <GasPanel detection={detection} />
          </div>

          <button
            className="row-goto-map"
            onClick={() =>
              onNavigate?.(detection)
            }
          >
            VIEW ON MAP ↗
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  setPage,
  setSelectedDetection,
  onGotoMap
}) {
  const {
    DETECTIONS,
    TOTAL_DETECTIONS,
    COUNT_BY_TYPE,
    FIRMS_METADATA
  } = useLiveData();
  const [expandedId, setExpandedId] =
    useState(null);

  const recent =
    DETECTIONS.slice(0, 8);

  const toggleExpand = (detection) => {
    setExpandedId((current) =>
      current === detection.id
        ? null
        : detection.id
    );
  };

  const navigateToMap = (detection) => {
    if (onGotoMap) {
      onGotoMap(detection);
      return;
    }

    setSelectedDetection(detection);
    setPage("Maps");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <main className="page dashboard-page">
      <section className="hero reveal">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="live-pulse" />
              SOLVING PS 26162 · NTRO
            </div>

            <h1>
              HEATSPOT
              <br />
              <em>CLASSIFICATION</em>
            </h1>

            <p>
              Authentic NASA FIRMS observations
              from India, pre-classified for the
              selection demo across industrial fires,
              gas flares, agricultural burning, mining
              activity and wildfires.
            </p>

            <div className="hero-actions">
              <button
                className="primary-action"
                onClick={() => setPage("Maps")}
              >
                EXPLORE FIRMS MAP
                <span>↗</span>
              </button>

              <button
                className="text-action"
                onClick={() => setPage("Analytics")}
              >
                VIEW INTELLIGENCE
              </button>
            </div>

            <div className="hero-meta">
              <span>NASA FIRMS</span>
              <i />
              <span>INDIA · 7-DAY SNAPSHOT</span>
              <i />
              <span>PRE-CLASSIFIED DEMO</span>
            </div>
          </div>

          <SatelliteEarth />
        </div>
      </section>

      <StatStrip />

      <section className="intelligence-section">
        <div className="intelligence-copy reveal">
          <div className="eyebrow">
            01 / FIRMS SNAPSHOT INTELLIGENCE
          </div>

          <h2>
            Thermal signals
            <br />
            <span>without the noise.</span>
          </h2>

          <div className="large-count">
            {TOTAL_DETECTIONS}
          </div>

          <div className="count-label">
            REPRESENTATIVE FIRMS EVENTS
          </div>

          <p>
            The selection demo starts from authentic NASA FIRMS
            coordinates, acquisition times, brightness, FRP and
            sensor fields. Records are restricted to India and
            pre-classified with transparent demo context labels.
          </p>

          <div className="signal-list">
            <div>
              <span>DATA WINDOW</span>
              <b>{FIRMS_METADATA.windowStart} → {FIRMS_METADATA.windowEnd}</b>
            </div>

            <div>
              <span>INDIA RECORDS</span>
              <b>{FIRMS_METADATA.qualityFilteredIndiaCount} FILTERED</b>
            </div>

            <div>
              <span>PS CLASSIFICATION</span>
              <b>PRE-CLASSIFIED DEMO</b>
            </div>
          </div>
        </div>

        <Radar />
      </section>

      <section className="detections-section">
        <SectionHeading
          eyebrow="02 / DETECTION STREAM"
          title="Recent Fire Detections"
          description="The latest classified thermal events entering the AGNI DRISHTI intelligence network."
        />

        <div className="detection-list">
          {recent.map(
            (detection, index) => (
              <DetectionRow
                key={detection.id}
                detection={detection}
                index={index}
                expanded={
                  expandedId ===
                  detection.id
                }
                onToggle={toggleExpand}
                onNavigate={navigateToMap}
              />
            )
          )}
        </div>

        <button
          className="view-all"
          onClick={() => setPage("Maps")}
        >
          VIEW ALL {TOTAL_DETECTIONS} DETECTIONS
          <span>→</span>
        </button>
      </section>

      <CategorySection
        number={String(COUNT_BY_TYPE.Industrial)}
        title="INDUSTRIAL FIRES"
        description="FIRMS thermal anomalies near curated refinery, steel, power and manufacturing reference areas. Category labels are pre-classified for this demo."
        data={DETECTIONS.filter((d) => d.type === "Industrial").slice(0, 4)}
        setSelectedDetection={setSelectedDetection}
        setPage={setPage}
        onGotoMap={onGotoMap}
      />

      <CategorySection
        number={String(COUNT_BY_TYPE.GasFlare)}
        title="GAS FLARES"
        description="Thermal observations near curated refinery, LNG and gas-terminal reference areas, shown as demo gas-flare labels."
        data={DETECTIONS.filter((d) => d.type === "GasFlare").slice(0, 4)}
        setSelectedDetection={setSelectedDetection}
        setPage={setPage}
        onGotoMap={onGotoMap}
      />

      <CategorySection
        number={String(COUNT_BY_TYPE.Agricultural)}
        title="AGRICULTURAL BURNING"
        description="FIRMS observations in curated agricultural belts, separated from nearby industrial and mining context for the demo taxonomy."
        data={DETECTIONS.filter((d) => d.type === "Agricultural").slice(0, 4)}
        setSelectedDetection={setSelectedDetection}
        setPage={setPage}
        onGotoMap={onGotoMap}
      />

      <CategorySection
        number={String(COUNT_BY_TYPE.Mining)}
        title="MINING ACTIVITY"
        description="Thermal anomalies near curated coalfield and lignite-mine reference areas, including possible seam or equipment heat signatures."
        data={DETECTIONS.filter((d) => d.type === "Mining").slice(0, 4)}
        setSelectedDetection={setSelectedDetection}
        setPage={setPage}
        onGotoMap={onGotoMap}
      />

      <CategorySection
        number={String(COUNT_BY_TYPE.Wildfire)}
        title="WILDFIRES"
        description="FIRMS thermal anomalies without a curated industrial, flare, mining or agricultural context match, presented as demo wildfire labels."
        data={DETECTIONS.filter((d) => d.type === "Wildfire").slice(0, 4)}
        setSelectedDetection={setSelectedDetection}
        setPage={setPage}
        onGotoMap={onGotoMap}
      />
    </main>
  );
}

/* =========================================================
   CATEGORY SECTION
========================================================= */

function CategorySection({
  number,
  title,
  description,
  data,
  setSelectedDetection,
  setPage,
  onGotoMap
}) {
  const [expandedId, setExpandedId] =
    useState(null);

  const toggleExpand = (detection) => {
    setExpandedId((current) =>
      current === detection.id
        ? null
        : detection.id
    );
  };

  const navigateToMap = (detection) => {
    if (onGotoMap) {
      onGotoMap(detection);
      return;
    }

    setSelectedDetection(detection);
    setPage("Maps");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <section className="category-section">
      <div className="category-intro reveal">
        <div className="category-number">
          {number}
        </div>

        <div className="category-copy">
          <div className="eyebrow">
            CLASSIFICATION
          </div>

          <h2>{title}</h2>

          <p>{description}</p>
        </div>
      </div>

      <div className="mini-detection-list">
        {data.map(
          (detection, index) => (
            <DetectionRow
              key={detection.id}
              detection={detection}
              index={index}
              expanded={
                expandedId ===
                detection.id
              }
              onToggle={toggleExpand}
              onNavigate={navigateToMap}
            />
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   MAP MARKER
========================================================= */

function createMapMarker(L, detection) {
  return L.divIcon({
    className: "fire-marker-wrapper",

    html: `
      <div
        class="fw-marker ${detection.risk.toLowerCase()}"
        style="--marker:${RISK_META[detection.risk]}"
      >
        <span>${TYPE_META[detection.type].short}</span>
      </div>
    `,

    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function focusDetection(
  L,
  map,
  detection,
  spotMarkerRef
) {
  if (spotMarkerRef.current) {
    spotMarkerRef.current.remove();
    spotMarkerRef.current = null;
  }

  if (!detection) {
    return;
  }

  const spotIcon = L.divIcon({
    className: "fw-spot-wrapper",
    html: `
      <div
        class="fw-spot ${detection.risk.toLowerCase()}"
        style="--marker:${RISK_META[detection.risk]}"
      >
        <span class="fw-spot-ring"></span>
        <span class="fw-spot-core"></span>
      </div>
    `,
    iconSize: [64, 64],
    iconAnchor: [32, 32]
  });

  spotMarkerRef.current = L.marker(
    [detection.lat, detection.lng],
    {
      icon: spotIcon,
      interactive: false,
      keyboard: false
    }
  ).addTo(map);

  map.flyTo(
    [detection.lat, detection.lng],
    11,
    {
      duration: 1
    }
  );
}

/* =========================================================
   FIRMS OBSERVATION FIELDS
   Only values directly supplied by NASA FIRMS are shown here.
========================================================= */

const FIRMS_CONFIDENCE_LABEL = {
  l: "LOW",
  n: "NOMINAL",
  h: "HIGH"
};

function GasPanel({ detection }) {
  const d = detection || {};
  const rows = [
    ["BRIGHTNESS", d.brightness ?? "—", "K"],
    ["FRP", d.frp ?? "—", "MW"],
    [
      "FIRMS QUALITY",
      FIRMS_CONFIDENCE_LABEL[d.detectionConfidence] ||
        d.detectionConfidence ||
        "—",
      ""
    ],
    ["CLUSTER COUNT", d.persistenceCount ?? "—", "OBS"]
  ];

  return (
    <div className="gas-panel">
      <div className="gas-heading">
        <span>FIRMS OBSERVATION FIELDS</span>
        <small>AUTHENTIC NASA VALUES</small>
      </div>

      <div className="gas-table firms-fields-table">
        <div className="gas-row gas-head">
          <span>FIELD</span>
          <span>VALUE</span>
          <span>UNIT</span>
        </div>

        {rows.map(([label, value, unit]) => (
          <div className="gas-row" key={label}>
            <strong>{label}</strong>
            <span>{value}</span>
            <span>{unit || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MAP VIEW
========================================================= */

function createStandardMapLayer(L, theme, mapKey) {
  const tileUrl = mapKey
    ? `https://{s}.basemaps.cartocdn.com/${theme === "light" ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png?key=${mapKey}`
    : `https://services.arcgisonline.com/arcgis/rest/services/Canvas/${theme === "light" ? "World_Light_Gray_Base" : "World_Dark_Gray_Base"}/MapServer/tile/{z}/{y}/{x}`;

  return L.tileLayer(tileUrl, {
    maxZoom: 19,
    subdomains: mapKey ? "abcd" : "abc",
    attribution: mapKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : "Tiles &copy; Esri"
  });
}

function MapView({
  detections,
  selected,
  setSelected,
  locateTrigger,
  satelliteMode,
  theme,
  mapRefExternal
}) {
  const mapElementRef =
    useRef(null);

  const mapInstance =
    useRef(null);

  const markersRef =
    useRef([]);

  const locationMarkerRef =
    useRef(null);

  const spotMarkerRef =
    useRef(null);

  const standardLayerRef =
    useRef(null);

  const standardLayerThemeRef =
    useRef(theme);

  const mapKeyRef = useRef(
    process.env.REACT_APP_CARTO_API_KEY ||
      process.env.REACT_APP_MAP_API_KEY ||
      process.env.REACT_APP_API_KEY ||
      ""
  );

  const satelliteLayerRef =
    useRef(null);

  useEffect(() => {
    let mounted = true;

    injectLeaflet().then((L) => {
      if (
        !mounted ||
        !mapElementRef.current ||
        mapInstance.current
      ) {
        return;
      }

      const map = L.map(
        mapElementRef.current,
        {
          zoomControl: false,
          attributionControl: true,
          minZoom: 3,
          maxZoom: 18
        }
      ).setView(
        [17.2, 79.5],
        6
      );

      const mapKey = mapKeyRef.current;

      standardLayerRef.current =
        createStandardMapLayer(
          L,
          theme,
          mapKey
        );

      satelliteLayerRef.current =
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 18,
            attribution:
              "Tiles &copy; Esri"
          }
        );

      standardLayerRef.current.addTo(map);

      mapInstance.current = map;

      if (mapRefExternal) {
        mapRefExternal.current = map;
      }

      renderMarkers(
        L,
        map,
        detections,
        setSelected,
        markersRef
      );

      if (selected) {
        focusDetection(
          L,
          map,
          selected,
          spotMarkerRef
        );
      }
    });

    return () => {
      mounted = false;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !mapInstance.current ||
      !window.L
    ) {
      return;
    }

    renderMarkers(
      window.L,
      mapInstance.current,
      detections,
      setSelected,
      markersRef
    );
  }, [detections, setSelected]);

  useEffect(() => {
    if (
      !mapInstance.current ||
      !window.L
    ) {
      return;
    }

    focusDetection(
      window.L,
      mapInstance.current,
      selected,
      spotMarkerRef
    );
  }, [selected]);

  useEffect(() => {
    if (
      !mapInstance.current ||
      !window.L
    ) {
      return;
    }

    const map = mapInstance.current;

    if (
      standardLayerThemeRef.current !== theme
    ) {
      if (
        standardLayerRef.current &&
        map.hasLayer(standardLayerRef.current)
      ) {
        map.removeLayer(standardLayerRef.current);
      }

      standardLayerRef.current =
        createStandardMapLayer(
          window.L,
          theme,
          mapKeyRef.current
        );
      standardLayerThemeRef.current = theme;
    }

    if (satelliteMode) {
      if (
        standardLayerRef.current &&
        map.hasLayer(
          standardLayerRef.current
        )
      ) {
        map.removeLayer(
          standardLayerRef.current
        );
      }

      if (
        satelliteLayerRef.current &&
        !map.hasLayer(
          satelliteLayerRef.current
        )
      ) {
        satelliteLayerRef.current.addTo(map);
      }
    } else {
      if (
        satelliteLayerRef.current &&
        map.hasLayer(
          satelliteLayerRef.current
        )
      ) {
        map.removeLayer(
          satelliteLayerRef.current
        );
      }

      if (
        standardLayerRef.current &&
        !map.hasLayer(
          standardLayerRef.current
        )
      ) {
        standardLayerRef.current.addTo(map);
      }
    }
  }, [satelliteMode, theme]);

  useEffect(() => {
    if (!locateTrigger) {
      return;
    }

    if (!navigator.geolocation) {
      alert(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (
          !mapInstance.current ||
          !window.L
        ) {
          return;
        }

        const {
          latitude,
          longitude
        } = position.coords;

        if (
          locationMarkerRef.current
        ) {
          locationMarkerRef.current.remove();
        }

        const icon =
          window.L.divIcon({
            className:
              "location-marker-wrapper",
            html: `
              <div class="location-marker">
                <span></span>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

        locationMarkerRef.current =
          window.L.marker(
            [latitude, longitude],
            { icon }
          )
            .addTo(mapInstance.current)
            .bindPopup(
              "<strong>YOUR LOCATION</strong>"
            );

        mapInstance.current.flyTo(
          [latitude, longitude],
          11,
          {
            duration: 1.2
          }
        );
      },
      () => {
        alert(
          "Unable to determine your current location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }, [locateTrigger]);

  return (
    <div
      ref={mapElementRef}
      className="leaflet-map"
    />
  );
}

/* =========================================================
   MARKER RENDER
========================================================= */

function renderMarkers(
  L,
  map,
  detections,
  setSelected,
  markersRef
) {
  markersRef.current.forEach(
    (marker) => marker.remove()
  );

  markersRef.current = [];

  detections.forEach(
    (detection) => {
      const marker = L.marker(
        [
          detection.lat,
          detection.lng
        ],
        {
          icon: createMapMarker(
            L,
            detection
          ),
          title: detection.name
        }
      ).addTo(map);

      marker.on("click", () => {
        setSelected(detection);
      });

      // Hover tooltip — direct FIRMS observation fields only
      const tipHtml = `
        <div class="fw-tt">
          <div class="fw-tt-head">
            <strong>${detection.name}</strong>
            <span>${TYPE_META[detection.type].label} · ${detection.risk.toUpperCase()}</span>
          </div>
          <div class="fw-tt-row">
            <span>BRIGHTNESS</span>
            <b>${detection.brightness ?? "—"} K</b>
          </div>
          <div class="fw-tt-row">
            <span>FIRE RADIATIVE POWER</span>
            <b>${detection.frp ?? "—"} MW</b>
          </div>
          <div class="fw-tt-row">
            <span>CLUSTER OBSERVATIONS</span>
            <b>${detection.persistenceCount ?? 1}</b>
          </div>
          <div class="fw-tt-row">
            <span>OBSERVATION TIME</span>
            <b>${detection.time}</b>
          </div>
          <div class="fw-tt-trend" style="color:#FFC857">
            ${detection.satellite} · ${detection.instrument} · FIRMS
          </div>
        </div>
      `;

      marker.bindTooltip(tipHtml, {
        direction: "top",
        offset: [0, -14],
        className: "fw-tooltip",
        opacity: 1
      });

      markersRef.current.push(marker);
    }
  );
}

/* =========================================================
   MAP FILTER RAIL
========================================================= */

function FilterRail({
  filters,
  setFilters,
  resultCount,
  onReset,
  onLocate,
  onSatellite,
  satelliteMode,
  theme,
  mobileOpen,
  setMobileOpen
}) {
  const { TOTAL_DETECTIONS } =
    useLiveData();
  const toggleArray = (
    field,
    value
  ) => {
    setFilters((current) => {
      const exists =
        current[field].includes(value);

      return {
        ...current,
        [field]: exists
          ? current[field].filter(
            (item) => item !== value
          )
          : [
            ...current[field],
            value
          ]
      };
    });
  };

  return (
    <>
      <button
        className="mobile-filter-trigger"
        onClick={() =>
          setMobileOpen(!mobileOpen)
        }
      >
        FILTERS
      </button>

      <aside
        className={`filter-rail ${mobileOpen ? "mobile-open" : ""
          }`}
      >
        <div className="rail-heading">
          <div className="eyebrow">
            MAP CONTROL
          </div>

          <h3>FILTERS</h3>
        </div>

        <div className="filter-group">
          <label>FIRE TYPE</label>

          {Object.keys(TYPE_META).map(
            (type) => (
              <label
                className="check-row"
                key={type}
              >
                <input
                  type="checkbox"
                  checked={filters.types.includes(
                    type
                  )}
                  onChange={() =>
                    toggleArray(
                      "types",
                      type
                    )
                  }
                />

                <span className="fake-check" />

                <span>
                  {TYPE_META[type].label}
                </span>
              </label>
            )
          )}
        </div>

        <div className="filter-group">
          <label>RISK LEVEL</label>

          {Object.keys(RISK_META).map(
            (risk) => (
              <label
                className="check-row"
                key={risk}
              >
                <input
                  type="checkbox"
                  checked={filters.risks.includes(
                    risk
                  )}
                  onChange={() =>
                    toggleArray(
                      "risks",
                      risk
                    )
                  }
                />

                <span
                  className="fake-check risk-check"
                  style={{
                    "--fake-color":
                      RISK_META[risk]
                  }}
                />

                <span
                  className="risk-dot"
                  style={{
                    background:
                      RISK_META[risk]
                  }}
                />

                <span>{risk}</span>
              </label>
            )
          )}
        </div>

        <div className="rail-bottom">
          <div className="showing">
            <span>VISIBLE DETECTIONS</span>
            <strong>
              {resultCount} / {TOTAL_DETECTIONS}
            </strong>
            <small>
              FILTERED INTELLIGENCE EVENTS
            </small>
          </div>

          <button
            className="reset-button"
            onClick={onReset}
          >
            RESET FILTERS
          </button>

          <button
            className="rail-action"
            onClick={onLocate}
          >
            ◎ LOCATE ME
          </button>

          <button
            className={`rail-action ${satelliteMode
              ? "rail-active"
              : ""
              }`}
            onClick={onSatellite}
          >
            ◉{" "}
            {satelliteMode
              ? theme === "light"
                ? "LIGHT BASEMAP"
                : "DARK BASEMAP"
              : "SATELLITE LAYER"}
          </button>

          <button
            className="rail-action close-mobile-filter"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            CLOSE FILTERS
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   THERMAL MAP VIEW & 10-DAY WILDFIRE TREND
========================================================= */

function seedFromString(str = "") {
  let h = 7;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 233280;
  }
  return h || 1;
}

function seededNoise(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function thermalColor(t) {
  const stops = [
    [0.0, [3, 8, 20]],
    [0.18, [10, 26, 70]],
    [0.34, [0, 78, 168]],
    [0.48, [0, 138, 178]],
    [0.6, [34, 214, 130]],
    [0.7, [255, 208, 60]],
    [0.82, [255, 132, 24]],
    [0.92, [255, 52, 40]],
    [1.0, [255, 235, 240]]
  ];
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const [t0, c0] = stops[i];
      const [t1, c1] = stops[i + 1];
      const k = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, idx) =>
        Math.round(v + (c1[idx] - v) * k)
      );
    }
  }
  return stops[stops.length - 1][1];
}

function ThermalMap({ detection }) {
  const canvasRef = useRef(null);
  const satMapRef = useRef(null);
  const satElRef = useRef(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width;
    const H = cvs.height;
    const seed = seedFromString(detection?.id || "hot");

    ctx.clearRect(0, 0, W, H);

    const cols = 26;
    const rows = 15;
    const tw = W / cols;
    const th = tw * 0.5;
    const cx = cols / 2;
    const cy = rows / 2;
    const burst =
      0.5 +
      Math.min((detection?.frp || 20) / 80, 0.5);
    const rnd = seededNoise(seed + 11);
    const hScale = 42;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = (c - cx) / (cols * 0.5);
        const dy = (r - cy) / (rows * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        let t =
          burst * Math.exp(-dist * dist * 2.2) +
          (rnd() - 0.5) * 0.45;
        t = Math.max(0.02, Math.min(1, t));
        const [rr, gg, bb] = thermalColor(t);
        const x0 = c * tw;
        const y0 = r * th;
        const height = t * hScale + 6;
        const top = `rgba(${rr},${gg},${bb},0.62)`;
        const right = `rgba(${Math.round(
          rr * 0.55
        )},${Math.round(gg * 0.55)},${Math.round(
          bb * 0.55
        )},0.62)`;
        const left = `rgba(${Math.round(
          rr * 0.4
        )},${Math.round(gg * 0.4)},${Math.round(
          bb * 0.4
        )},0.62)`;

        ctx.beginPath();
        ctx.moveTo(x0 + tw / 2, y0);
        ctx.lineTo(x0 + tw, y0 + th / 2);
        ctx.lineTo(x0 + tw / 2, y0 + th);
        ctx.lineTo(x0, y0 + th / 2);
        ctx.closePath();
        ctx.fillStyle = top;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x0 + tw, y0 + th / 2);
        ctx.lineTo(x0 + tw / 2, y0 + th);
        ctx.lineTo(x0 + tw / 2, y0 + th + height);
        ctx.lineTo(x0 + tw, y0 + th / 2 + height);
        ctx.closePath();
        ctx.fillStyle = right;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x0, y0 + th / 2);
        ctx.lineTo(x0 + tw / 2, y0 + th);
        ctx.lineTo(x0 + tw / 2, y0 + th + height);
        ctx.lineTo(x0, y0 + th / 2 + height);
        ctx.closePath();
        ctx.fillStyle = left;
        ctx.fill();

        ctx.strokeStyle = "rgba(4,7,13,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [detection]);

  useEffect(() => {
    let mounted = true;
    injectLeaflet().then((L) => {
      if (
        !mounted ||
        !satElRef.current ||
        satMapRef.current
      ) {
        return;
      }
      const map = L.map(satElRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        tap: false,
        keyboard: false
      }).setView(
        [detection.lat, detection.lng],
        15
      );
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri"
        }
      ).addTo(map);
      satMapRef.current = map;
    });
    return () => {
      mounted = false;
      if (satMapRef.current) {
        satMapRef.current.remove();
        satMapRef.current = null;
      }
    };
  }, [detection]);

  const brightness = detection?.brightness ?? 0;

  return (
    <div className="thermal-map-wrap">
      <div className="thermal-map-stage">
        <div
          ref={satElRef}
          className="thermal-satellite"
        />

        <canvas
          ref={canvasRef}
          width={680}
          height={440}
          className="thermal-overlay-canvas"
        />
      </div>

      <div className="thermal-map-head">
        <span className="live-pulse" />
        SATELLITE CONTEXT · DEMO HEAT PATTERN
      </div>

      <div className="thermal-map-coords">
        {detection?.lat?.toFixed(4)}° N ·{" "}
        {detection?.lng?.toFixed(4)}° E
      </div>

      <div className="thermal-map-footer">
        <span>OBSERVED FIRMS BRIGHTNESS</span>
        <span className="thermal-scale">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>{brightness || "—"} K</span>
      </div>
    </div>
  );
}

function TenDayTrend() {
  const { DETECTIONS, FIRMS_METADATA } = useLiveData();
  const counts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${FIRMS_METADATA.windowStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    return {
      isoDate,
      label: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC"
      }),
      value: DETECTIONS.filter((detection) => detection.isoDate === isoDate).length
    };
  });
  const max = Math.max(...counts.map((day) => day.value), 1);
  const first = counts[0]?.value || 0;
  const last = counts[counts.length - 1]?.value || 0;
  const delta = last - first;
  const pct = first ? Math.round((delta / first) * 100) : 0;

  return (
    <div className="ten-day-wrap">
      <div className="ten-day-head">
        <span>REAL FIRMS EVENT COUNTS · 7-DAY WINDOW</span>
        <b style={{ color: delta >= 0 ? "#FF3040" : "#36D399" }}>
          {delta >= 0 ? "+" : ""}{pct}%
        </b>
      </div>

      <div className="ten-day-bars">
        {counts.map((day, index) => (
          <div className="ten-day-col" key={day.isoDate}>
            <div
              className={`ten-day-bar ${index === counts.length - 1 ? "today" : ""}`}
              style={{
                height: `${Math.max(4, (day.value / max) * 100)}%`,
                background: index === counts.length - 1 ? "#FF3040" : "rgba(255, 88, 40, .55)"
              }}
            />
            <span>{day.label}</span>
          </div>
        ))}
      </div>

      <div className="ten-day-stats">
        <div>
          <small>LATEST DAY</small>
          <strong>{last}</strong>
        </div>
        <div>
          <small>CHANGE VS FIRST DAY</small>
          <strong style={{ color: delta >= 0 ? "#FF3040" : "#36D399" }}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
          </strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAP POPUP
========================================================= */

function MapPopup({
  detection,
  onClose
}) {
  if (!detection) {
    return null;
  }

  const firmsRows = [
    ["BRIGHTNESS", detection.brightness, "K", "#FF5A1F"],
    ["FRP", detection.frp, "MW", "#FF8A1F"],
    ["CLUSTER", detection.persistenceCount, "OBS", "#FFC857"],
    ["FIRMS QUALITY", FIRMS_CONFIDENCE_LABEL[detection.detectionConfidence] || detection.detectionConfidence, "", "#36D399"],
    ["SENSOR", `${detection.satellite} · ${detection.instrument}`, "", "#42A5FF"],
    ["DAY/NIGHT", detection.dayNight === "D" ? "DAY" : "NIGHT", "", "#B68CFF"]
  ];

  return (
    <div className="map-popup-panel thermal-popup">
      <button
        className="popup-close"
        onClick={onClose}
      >
        ×
      </button>

      <div className="thermal-popup-head">
        <div className="eyebrow">
          {TYPE_META[
            detection.type
          ].label}{" "}
          / THERMAL EVENT · GEO-THERMAL
        </div>

        <h2>{detection.name}</h2>

        <span
          className="thermal-risk"
          style={{
            borderColor: `${RISK_META[detection.risk]
              }55`,
            color: RISK_META[detection.risk]
          }}
        >
          <i
            style={{
              background:
                RISK_META[detection.risk]
            }}
          />
          {detection.risk.toUpperCase()}
        </span>
      </div>

      <div className="thermal-popup-body">
        <div className="thermal-stats">
          <TenDayTrend />

          <div className="gasval-panel">
            <div className="gasval-head">
              FIRMS SENSOR PROFILE
            </div>

            <div className="gasval-grid">
              {firmsRows.map(
                ([lbl, val, unit, color]) => (
                  <div
                    className="gasval-row"
                    key={lbl}
                  >
                    <span>{lbl}</span>

                    <b style={{ color }}>
                      {val ?? "—"}{" "}
                      <small>{unit}</small>
                    </b>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="thermal-meta">
            <GasPanel
              detection={detection}
            />

            <div className="thermal-meta-row">
              <small>PERSISTENCE CLUSTER</small>
              <strong>
                {detection.persistenceCount ?? 1} observations · first seen {detection.firstObservedAt?.slice(0, 10) || "—"}
              </strong>
            </div>

            <div className="thermal-meta-row">
              <small>OBSERVATION</small>
              <strong>
                {detection.date} ·{" "}
                {detection.time}
              </strong>
            </div>

            <div className="thermal-meta-row">
              <small>SOURCE</small>
              <strong>
                {detection.source}
              </strong>
            </div>

            <div className="thermal-meta-row">
              <small>DEMO CONTEXT</small>
              <strong>
                {detection.contextName || detection.region}
              </strong>
            </div>

            <div className="thermal-meta-row">
              <small>CLASSIFICATION</small>
              <strong>
                {detection.classificationMethod || "Pre-classified demo"}
              </strong>
            </div>
          </div>
        </div>

        <div className="thermal-view">
          <ThermalMap
            detection={detection}
          />

          <div className="thermal-desc">
            <small>
              INTELLIGENCE ASSESSMENT
            </small>

            <p>{detection.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAP PAGE
========================================================= */

function Maps({
  selectedDetection,
  setSelectedDetection,
  theme
}) {
  const { DETECTIONS, FIRMS_METADATA } = useLiveData();
  const [filters, setFilters] =
    useState({
      types: Object.keys(TYPE_META),
      risks: Object.keys(RISK_META)
    });

  const [locateTrigger, setLocateTrigger] =
    useState(false);

  const [satelliteMode, setSatelliteMode] =
    useState(false);

  const [mobileFilterOpen, setMobileFilterOpen] =
    useState(false);

  const mapRef = useRef(null);

  const filtered = useMemo(() => {
    return DETECTIONS.filter(
      (detection) => {
        const typePass =
          filters.types.includes(
            detection.type
          );

        const riskPass =
          filters.risks.includes(
            detection.risk
          );

        return (
          typePass &&
          riskPass
        );
      }
    );
  }, [filters, DETECTIONS]);

  const reset = () => {
    setFilters({
      types: Object.keys(TYPE_META),
      risks: Object.keys(RISK_META)
    });
  };

  const zoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const zoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const locate = () => {
    setLocateTrigger(
      (value) => !value
    );
  };

  const fullscreen = () => {
    const mapStage =
      document.querySelector(
        ".map-stage"
      );

    if (
      document.fullscreenElement
    ) {
      document.exitFullscreen?.();
    } else {
      mapStage?.requestFullscreen?.();
    }
  };

  return (
    <main className="map-page">
      <FilterRail
        filters={filters}
        setFilters={setFilters}
        resultCount={filtered.length}
        onReset={reset}
        onLocate={locate}
        onSatellite={() =>
          setSatelliteMode(
            (value) => !value
          )
        }
        satelliteMode={
          satelliteMode
        }
        theme={theme}
        mobileOpen={
          mobileFilterOpen
        }
        setMobileOpen={
          setMobileFilterOpen
        }
      />

      <section className="map-stage">
        <div className="map-title">
          <div className="eyebrow">
            03 / GEOSPATIAL INTELLIGENCE
          </div>

          <h1>INDIA FIRMS SNAPSHOT</h1>

          <p>
            NASA FIRMS · {FIRMS_METADATA.windowStart} TO {FIRMS_METADATA.windowEnd} ·{" "}
            {filtered.length} VISIBLE
            EVENTS
          </p>
        </div>

        <MapView
          detections={filtered}
          selected={
            selectedDetection
          }
          setSelected={
            setSelectedDetection
          }
          locateTrigger={
            locateTrigger
          }
          satelliteMode={
            satelliteMode
          }
          theme={theme}
          mapRefExternal={mapRef}
        />

        <div
          className={`satellite-indicator ${satelliteMode ? "on" : ""
            }`}
        >
          {satelliteMode
            ? "SATELLITE MODE"
            : theme === "light"
              ? "LIGHT BASEMAP"
              : "DARK BASEMAP"}
        </div>

        <div className="map-overlay-controls">
          <button
            onClick={zoomIn}
            title="Zoom in"
          >
            +
          </button>

          <button
            onClick={zoomOut}
            title="Zoom out"
          >
            −
          </button>

          <button
            onClick={locate}
            title="Locate me"
          >
            ◎
          </button>

          <button
            onClick={fullscreen}
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>

        <div className="map-legend">
          {Object.entries(
            RISK_META
          ).map(([risk, color]) => (
            <span key={risk}>
              <i
                style={{
                  background: color
                }}
              />
              {risk.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="map-status">
          <span className="live-pulse" />
          AUTHENTIC FIRMS SNAPSHOT · NOT A LIVE STREAM
        </div>

        <MapPopup
          detection={
            selectedDetection
          }
          onClose={() =>
            setSelectedDetection(
              null
            )
          }
        />

        <div className="map-coordinates">
          <span>
            INDIA FIRMS SNAPSHOT
          </span>

          <span>
            {FIRMS_METADATA.windowStart} → {FIRMS_METADATA.windowEnd}
          </span>

          <span>
            PRE-CLASSIFIED DEMO
          </span>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   ANALYTICS FILTERS
========================================================= */

function AnalyticsFilters({
  values,
  setValues
}) {
  const fields = [
    [
      "region",
      "REGION",
      [
        "ALL REGIONS",
        "NORTH INDIA",
        "WEST INDIA",
        "CENTRAL INDIA",
        "EAST INDIA",
        "SOUTH INDIA",
        "NORTH-EAST INDIA"
      ]
    ],
    [
      "type",
      "FIRE TYPE",
      [
        "ALL TYPES",
        "INDUSTRIAL",
        "GAS FLARE",
        "AGRICULTURAL",
        "MINING",
        "WILDFIRE"
      ]
    ],
    [
      "risk",
      "RISK LEVEL",
      [
        "ALL RISKS",
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW"
      ]
    ],
    [
      "source",
      "SOURCE",
      ["ALL SOURCES", "VIIRS", "MODIS"]
    ]
  ];

  return (
    <div className="analytics-filters">
      {fields.map(
        ([key, label, options]) => (
          <label key={key}>
            <span>{label}</span>

            <select
              value={values[key]}
              onChange={(e) =>
                setValues(
                  (current) => ({
                    ...current,
                    [key]:
                      e.target.value
                  })
                )
              }
            >
              {options.map(
                (option) => (
                  <option
                    key={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </label>
        )
      )}
    </div>
  );
}

/* =========================================================
   TREND CHART
========================================================= */

function TrendChart({ detections = [] }) {
  const [hover, setHover] = useState(null);
  const { FIRMS_METADATA } = useLiveData();
  const startDate = new Date(`${FIRMS_METADATA.windowStart}T00:00:00Z`);
  const base = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    return detections.filter((detection) => detection.isoDate === isoDate).length;
  });
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  });

  const width = 900;
  const height = 340;
  const padding = 38;
  const max = Math.max(...base, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));

  const points = base
    .map((value, index) => {
      const x =
        padding +
        (index /
          (base.length - 1)) *
        (width -
          padding * 2);

      const y =
        height -
        padding -
        (value / max) *
        (height -
          padding * 2);

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="trend-chart">
      <div className="chart-header">
        <div>
          <div className="eyebrow">
            TEMPORAL ANALYSIS
          </div>

          <h3>
            Fire Detection Trends
          </h3>
        </div>

        <div className="chart-range">
          LAST 7 DAYS · REAL COUNTS
        </div>
      </div>

      <div className="chart-body">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="fireGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#FF5A1F"
                stopOpacity=".35"
              />

              <stop
                offset="100%"
                stopColor="#FF5A1F"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {ticks.map(
            (value, index) => {
              const y =
                height -
                padding -
                (value / max) *
                (height -
                  padding * 2);

              return (
                <g key={index}>
                  <line
                    x1={padding}
                    x2={
                      width - padding
                    }
                    y1={y}
                    y2={y}
                    className="chart-grid"
                  />

                  <text
                    x="0"
                    y={y + 4}
                    className="chart-axis"
                  >
                    {value}
                  </text>
                </g>
              );
            }
          )}

          <polygon
            points={`${padding},${height - padding
              } ${points} ${width - padding
              },${height - padding}`}
            className="chart-area"
          />

          <polyline
            points={points}
            className="chart-line"
          />

          {base.map(
            (value, index) => {
              const x =
                padding +
                (index /
                  (base.length -
                    1)) *
                (width -
                  padding * 2);

              const y =
                height -
                padding -
                (value / max) *
                (height -
                  padding * 2);

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={
                    hover === index
                      ? 6
                      : 3
                  }
                  className="chart-point"
                  onMouseEnter={() =>
                    setHover(index)
                  }
                  onMouseLeave={() =>
                    setHover(null)
                  }
                />
              );
            }
          )}
        </svg>

        <div className="chart-months">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        {hover !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `${8 +
                (hover / 11) * 84
                }%`
            }}
          >
            <strong>
              {base[hover]}
            </strong>

            <span>
              DETECTIONS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CLASSIFICATION
========================================================= */

function Classification({ detections = [] }) {
  const total = Math.max(detections.length, 1);
  const values = [
    ["Industrial", detections.filter((d) => d.type === "Industrial").length, "#FF5A1F"],
    ["Gas flare", detections.filter((d) => d.type === "GasFlare").length, "#42A5FF"],
    ["Agricultural", detections.filter((d) => d.type === "Agricultural").length, "#FFC857"],
    ["Mining", detections.filter((d) => d.type === "Mining").length, "#B68CFF"],
    ["Wildfire", detections.filter((d) => d.type === "Wildfire").length, "#36D399"]
  ].map(([label, value, color]) => [
    label,
    Math.round((value / total) * 100),
    color
  ]);

  return (
    <div className="classification">
      <div className="eyebrow">
        EVENT CLASSIFICATION
      </div>

      <h3>CLASSIFICATION</h3>

      <div className="classification-bars">
        {values.map(
          ([label, value, color]) => (
            <div
              className="classification-row"
              key={label}
            >
              <div className="classification-top">
                <span>{label}</span>
                <strong>
                  {value}%
                </strong>
              </div>

              <div className="bar">
                <span
                  style={{
                    width: `${value}%`,
                    background: color
                  }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   RISK DISTRIBUTION
========================================================= */

function RiskDistribution({ detections = [] }) {
  const counts = {
    Critical: detections.filter((d) => d.risk === "Critical").length,
    High: detections.filter((d) => d.risk === "High").length,
    Medium: detections.filter((d) => d.risk === "Medium").length,
    Low: detections.filter((d) => d.risk === "Low").length
  };
  const maxRisk = Math.max(...Object.values(counts), 1);
  const values = [
    ["CRITICAL", counts.Critical, "#FF3040"],
    ["HIGH", counts.High, "#FF8A1F"],
    ["MEDIUM", counts.Medium, "#FFC857"],
    ["LOW", counts.Low, "#36D399"]
  ];

  return (
    <section className="risk-distribution">
      <div className="eyebrow">
        RISK ANALYSIS
      </div>

      <h2>
        RISK DISTRIBUTION
      </h2>

      <div className="risk-bars">
        {values.map(
          ([label, value, color]) => (
            <div
              className="risk-bar-row"
              key={label}
            >
              <div className="risk-bar-label">
                <span>{label}</span>
                <strong>
                  {value}
                </strong>
              </div>

              <div className="risk-bar">
                <span
                  style={{
                    width: `${(value / maxRisk) *
                      100
                      }%`,
                    background: color
                  }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   CRITICAL INFRASTRUCTURE SECTION
========================================================= */

function CriticalInfrastructure() {
  const {
    TOP_DETECTION,
    TOTAL_DETECTIONS,
    DETECTIONS
  } = useLiveData();

  const top = TOP_DETECTION || (DETECTIONS && DETECTIONS[0]);
  if (!top) return null;

  const totalCount = TOTAL_DETECTIONS || DETECTIONS.length;

  return (
    <section className="critical-infrastructure">
      <div className="critical-header">
        <div>
          <div className="eyebrow critical-eyebrow">
            INFRASTRUCTURE EXPOSURE
          </div>

          <h2>
            CRITICAL AREAS
            <br />
            <span>
              NEAR INFRASTRUCTURE
            </span>
          </h2>

          <p>
            High-priority thermal anomalies
            identified within operational
            proximity of critical
            infrastructure.
          </p>
        </div>

        <div className="critical-badge">
          <span />
          PRIORITY THREAT
        </div>
      </div>

      <div className="critical-event">
        <div className="critical-event-index">
          01
        </div>

        <div className="critical-event-main">
          <div className="critical-event-type">
            {TYPE_LABEL[top.type] ||
              "THERMAL EVENT"}
          </div>

          <h3>
            {top.name || "Industrial Anomaly"}
          </h3>

          <div className="critical-location">
            {top.lat}° N ·{" "}
            {top.lng}° E
          </div>
        </div>

        <div className="critical-event-risk">
          <span>RISK LEVEL</span>

          <strong>
            {top.risk || "Critical"}
          </strong>

          <small>
            ACTIVE THREAT
          </small>
        </div>
      </div>

      <div className="critical-metrics">
        <div className="critical-metric">
          <span>
            FIRMS CLUSTER
            OBSERVATIONS
          </span>

          <strong>
            {top.persistenceCount || 1}{" "}
            <small>OBS</small>
          </strong>

          <p>
            {top.contextName || top.region}
          </p>
        </div>

        <div className="critical-metric">
          <span>
            THERMAL DETECTIONS
          </span>

          <strong>
            {String(totalCount).padStart(2, "0")}
          </strong>

          <p>
            Persistent observations
          </p>
        </div>

        <div className="critical-metric">
          <span>
            FIRMS DETECTION
            QUALITY
          </span>

          <strong>
            {top.confidenceScore || 75}
            <small>/100</small>
          </strong>

          <p>
            NASA FIRMS pixel quality field
          </p>
        </div>

        <div className="critical-metric action">
          <span>
            RECOMMENDED ACTION
          </span>

          <strong>
            IMMEDIATE
            <br />
            VERIFICATION
          </strong>

          <p>
            Emergency response recommended.
          </p>
        </div>
      </div>

      <div className="critical-analysis">
        <div className="critical-analysis-line">
          <span />
        </div>

        <div>
          <div className="eyebrow">
            WHY THIS AREA IS CRITICAL
          </div>

          <p>
            Multiple observations in this
            FIRMS cluster indicate a
            persistent thermal signal.
            The demo priority combines the
            NASA brightness and FRP fields
            with the observed cluster count.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   ANALYTICS PAGE
========================================================= */

function Analytics() {
  const { DETECTIONS } = useLiveData();
  const [filters, setFilters] = useState({
    region: "ALL REGIONS",
    type: "ALL TYPES",
    risk: "ALL RISKS",
    source: "ALL SOURCES"
  });

  const filtered = useMemo(() => {
    return DETECTIONS.filter((detection) => {
      const region = (detection.region || "").toUpperCase();
      const type = TYPE_FILTER_LABEL[detection.type] || detection.type;
      const risk = detection.risk.toUpperCase();
      const source = (detection.instrument || "").toUpperCase();
      return (
        (filters.region === "ALL REGIONS" || region === filters.region) &&
        (filters.type === "ALL TYPES" || type === filters.type) &&
        (filters.risk === "ALL RISKS" || risk === filters.risk) &&
        (filters.source === "ALL SOURCES" || source === filters.source)
      );
    });
  }, [DETECTIONS, filters]);

  const rankings = useMemo(() => {
    const grouped = new Map();
    filtered.forEach((detection) => {
      const name = detection.contextName || detection.region;
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(detection);
    });
    return [...grouped.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([name, records], index) => {
        const highestRisk = records.reduce((current, record) => {
          const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          return order[record.risk] > order[current] ? record.risk : current;
        }, "Low");
        return [
          String(index + 1).padStart(2, "0"),
          name,
          `${String(records.length).padStart(2, "0")} EVENTS`,
          highestRisk.toUpperCase()
        ];
      });
  }, [filtered]);

  return (
    <main className="page analytics-page">
      <section className="analytics-hero reveal">
        <div className="eyebrow">
          04 / INTELLIGENCE ANALYTICS
        </div>

        <h1>
          Fire Intelligence
          <br />
          <em>Analytics</em>
        </h1>

        <p>
          Understand temporal patterns,
          classification trends and regional
          risk across the current India FIRMS snapshot.
        </p>
      </section>

      <AnalyticsFilters
        values={filters}
        setValues={setFilters}
      />

      <StatStrip />

      <section className="analytics-main">
        <TrendChart detections={filtered} />

        <Classification detections={filtered} />
      </section>

      <section className="locations-section">
        <SectionHeading
          eyebrow="REGIONAL RISK"
          title="Top Affected Locations"
          description="Areas with the highest concentration of classified thermal observations."
        />

        <div className="ranking-list">
          {rankings.map(
            ([
              number,
              name,
              count,
              risk
            ]) => {
              const normalizedRisk =
                risk.charAt(0) +
                risk
                  .slice(1)
                  .toLowerCase();

              return (
                <div
                  className="ranking-row"
                  key={number}
                >
                  <span className="rank-number">
                    {number}
                  </span>

                  <strong>
                    {name}
                  </strong>

                  <span>
                    {count}
                  </span>

                  <b
                    style={{
                      color:
                        RISK_META[
                        normalizedRisk
                        ]
                    }}
                  >
                    {risk}
                  </b>

                  {null}
                </div>
              );
            }
          )}
        </div>
      </section>

      <RiskDistribution detections={filtered} />

      <CriticalInfrastructure />
    </main>
  );
}

/* =========================================================
   ALERT TIMELINE
========================================================= */

function AlertTimeline({
  setSelectedDetection
}) {
  const { DETECTIONS = [] } = useLiveData();
  const topDetections = [...(DETECTIONS || [])]
    .sort((a, b) => {
      const ra =
        (RISK_ORDER[a.risk] || 0) +
        (a.brightness || 0) / 400;
      const rb =
        (RISK_ORDER[b.risk] || 0) +
        (b.brightness || 0) / 400;
      return rb - ra;
    })
    .slice(0, 3);
  const alerts = topDetections.map(
    (d, index) => ({
      detectionId: d.id,
      risk: d.risk,
      name: d.name,
      details: `${TYPE_LABEL[d.type] || "THERMAL ANOMALY"} · ${d.persistenceCount || 1} cluster observations`,
      count: `${d.brightness ? d.brightness + " K" : "—"} / ${d.frp ? d.frp + " MW" : "—"}`,
      time: d.time,
      status:
        index === 0
          ? "INVESTIGATING"
          : "MONITORING"
    })
  );

  return (
    <div className="alert-timeline">
      {alerts.map(
        (alert, index) => {
          const detection =
            (DETECTIONS || []).find(
              (item) =>
                item.id ===
                alert.detectionId
            );

          return (
            <div
              className="timeline-item reveal"
              key={alert.detectionId}
              onClick={() =>
                detection &&
                setSelectedDetection &&
                setSelectedDetection(
                  detection
                )
              }
            >
              <div
                className="timeline-marker"
                style={{
                  background:
                    RISK_META[
                    alert.risk
                    ]
                }}
              >
                {String(
                  index + 1
                ).padStart(2, "0")}
              </div>

              <div className="timeline-content">
                <div className="timeline-top">
                  <span
                    style={{
                      color:
                        RISK_META[
                        alert.risk
                        ]
                    }}
                  >
                    {(alert.risk || "").toUpperCase()}
                  </span>

                  <time>
                    {alert.time}
                  </time>
                </div>

                <h3>
                  {alert.name}
                </h3>

                <p>
                  {alert.details}
                </p>

                <div className="timeline-bottom">
                  <span>
                    {alert.count}
                  </span>

                  <b>
                    {alert.status}
                  </b>
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   ALERTS PAGE
========================================================= */

function Alerts({
  setSelectedDetection
}) {
  const { DETECTIONS = [], COUNT_BY_RISK = {} } =
    useLiveData();
  const [expanded, setExpanded] =
    useState(false);

  return (
    <main className="page alerts-page">
      <section className="alerts-hero reveal">
        <div className="alerts-title-block">
          <div className="eyebrow">
            05 / EMERGENCY OPERATIONS
          </div>

          <h1>
            Firewatch
            <br />
            <em>Alert Center</em>
          </h1>

          <p>
            Prioritized fire events requiring
            attention.
          </p>
        </div>

        <div className="alert-summary">
          <div>
            <strong>
              {COUNT_BY_RISK?.Critical ?? 0}
            </strong>
            <span>CRITICAL</span>
          </div>

          <div>
            <strong>
              {COUNT_BY_RISK?.High ?? 0}
            </strong>
            <span>HIGH</span>
          </div>

          <div>
            <strong>
              {COUNT_BY_RISK?.Medium ?? 0}
            </strong>
            <span>MEDIUM</span>
          </div>

          <div>
            <strong>
              {COUNT_BY_RISK?.Low ?? 0}
            </strong>
            <span>LOW</span>
          </div>
        </div>
      </section>

      <section className="priority-section">
        <SectionHeading
          eyebrow="PRIORITY QUEUE"
          title="Priority Alerts"
          description="Thermal events prioritized using the FIRMS brightness, FRP and clustered observation count fields."
        />

        <AlertTimeline
          setSelectedDetection={
            setSelectedDetection
          }
        />
      </section>

      <section className="why-alert">
        <button
          className="why-alert-heading"
          onClick={() =>
            setExpanded(
              (value) => !value
            )
          }
        >
          <div>
            <div className="eyebrow">
              INTELLIGENCE EXPLANATION
            </div>

            <h2>
              WHY THIS ALERT?
            </h2>
          </div>

          <span>
            {expanded ? "−" : "+"}
          </span>
        </button>

        <div
          className={`why-content ${expanded
            ? "expanded"
            : ""
            }`}
        >
          {[
            "FIRMS thermal anomaly observed",
            "Multiple observations in the demo cluster",
            "Brightness and FRP recorded by NASA FIRMS",
            "India boundary filter passed",
            "PS category is pre-classified for the demo",
            "Priority is a transparent demo heuristic"
          ].map((item) => (
            <div key={item}>
              <span>✓</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="history-section">
        <SectionHeading
          eyebrow="EVENT ARCHIVE"
          title="Alert History"
        />

        <div className="history-table">
          <div className="history-header">
            <span>INDEX</span>
            <span>AREA</span>
            <span>STATUS</span>
            <span>DETECTED</span>
            <span>RISK</span>
          </div>

          {DETECTIONS.slice(
            0,
            9
          ).map(
            (
              detection,
              index
            ) => (
              <div
                className="history-row"
                key={detection.id}
                onClick={() =>
                  setSelectedDetection(
                    detection
                  )
                }
              >
                <span>
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>

                <strong>
                  {detection.name}
                </strong>

                <span className="status-text">
                  {index % 3 ===
                    0
                    ? "RESOLVED"
                    : index % 2 ===
                      0
                      ? "MONITORING"
                      : "INVESTIGATING"}
                </span>

                <span>
                  {detection.time}
                </span>

                <b
                  style={{
                    color:
                      RISK_META[
                      detection.risk
                      ]
                  }}
                >
                  {detection.risk.toUpperCase()}
                </b>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   SEARCH OVERLAY
========================================================= */

function SearchOverlay({
  onClose,
  setPage,
  setSelectedDetection
}) {
  const { DETECTIONS } = useLiveData();
  const [query, setQuery] =
    useState("");

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const normalized =
      query
        .trim()
        .toLowerCase();

    return DETECTIONS.filter(
      (detection) =>
        detection.name
          .toLowerCase()
          .includes(normalized) ||
        detection.type
          .toLowerCase()
          .includes(normalized) ||
        detection.risk
          .toLowerCase()
          .includes(normalized) ||
        detection.source
          .toLowerCase()
          .includes(normalized) ||
        (detection.contextName || "")
          .toLowerCase()
          .includes(normalized) ||
        detection.lat
          .toString()
          .includes(normalized) ||
        detection.lng
          .toString()
          .includes(normalized)
    ).slice(0, 10);
  }, [query, DETECTIONS]);

  const chooseResult = (
    result
  ) => {
    setSelectedDetection(
      result
    );

    setPage("Maps");

    onClose();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div className="search-overlay">
      <div className="search-inner">
        <div className="search-top">
          <span>
            AGNI DRISHTI / GLOBAL SEARCH
          </span>

          <button
            onClick={onClose}
          >
            ESC ×
          </button>
        </div>

        <div className="search-input-wrap">
          <span>⌕</span>

          <input
            autoFocus
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search facilities, regions, coordinates or alerts..."
          />

          {query && (
            <button
              className="search-clear"
              onClick={() =>
                setQuery("")
              }
            >
              CLEAR
            </button>
          )}
        </div>

        <div className="search-hint">
          {query
            ? `${results.length} MATCHING RESULTS`
            : "SEARCH BY FACILITY · REGION · FIRE TYPE · RISK · COORDINATE"}
        </div>

        <div className="search-results">
          {query &&
            results.length ===
            0 && (
              <div className="empty-search">
                NO MATCHING
                INTELLIGENCE FOUND
              </div>
            )}

          {results.map(
            (result) => (
              <button
                key={result.id}
                onClick={() =>
                  chooseResult(
                    result
                  )
                }
              >
                <span>
                  {String(
                    result.id
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>

                <div>
                  <strong>
                    {result.name}
                  </strong>

                  <small>
                    {
                      TYPE_META[
                        result.type
                      ].label
                    }{" "}
                    ·{" "}
                    {result.risk.toUpperCase()}
                  </small>
                </div>

                <small className="search-coord">
                  {result.lat.toFixed(
                    4
                  )}
                  ° N
                  <br />
                  {result.lng.toFixed(
                    4
                  )}
                  ° E
                </small>

                <b>↗</b>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATION PANEL
========================================================= */

function NotificationPanel({
  setSelectedDetection,
  setPage,
  onClose
}) {
  const { DETECTIONS } = useLiveData();
  const topNotifs = [...DETECTIONS]
    .sort((a, b) => {
      const ra =
        RISK_ORDER[a.risk] +
        (a.brightness || 0) / 400;
      const rb =
        RISK_ORDER[b.risk] +
        (b.brightness || 0) / 400;
      return rb - ra;
    })
    .slice(0, 3);
  const notifications = topNotifs.map(
    (d, index) => ({
      id: d.id,
      severity: d.risk.toUpperCase(),
      title: d.name,
      detail: `${TYPE_LABEL[d.type]} · ${d.persistenceCount || 1} cluster observations`,
      time:
        index === 0
          ? "NOW"
          : index === 1
            ? "RECENT"
            : "NEWER"
    })
  );

  const openNotification = (
    notification
  ) => {
    const detection =
      DETECTIONS.find(
        (item) =>
          item.id ===
          notification.id
      );

    if (detection) {
      setSelectedDetection(
        detection
      );
    }

    setPage("Maps");
    onClose();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <div>
          <span>
            LIVE NOTIFICATIONS
          </span>

          <small>
            PRIORITY INTELLIGENCE
          </small>
        </div>

        <b>03</b>
      </div>

      {notifications.map(
        (notification) => (
          <button
            key={notification.id}
            onClick={() =>
              openNotification(
                notification
              )
            }
          >
            <span
              className={`notification-severity ${notification.severity.toLowerCase()
                }`}
            >
              {notification.severity}{" "}
              ALERT
            </span>

            <strong>
              {notification.title}
            </strong>

            <small>
              {notification.time} ·{" "}
              {notification.detail}
            </small>

            <span className="notification-arrow">
              →
            </span>
          </button>
        )
      )}

      <button
        className="all-notifications"
        onClick={() => {
          setPage("Alerts");
          onClose();
        }}
      >
        OPEN ALERT CENTER
        <span>↗</span>
      </button>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [loading, setLoading] =
    useState(true);

  const [theme, setTheme] =
    useState(getInitialTheme);

  const [page, setPage] =
    useState("Dashboard");

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [
    notificationOpen,
    setNotificationOpen
  ] = useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [
    selectedDetection,
    setSelectedDetection
  ] = useState(null);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
      );
    } catch {
      // Theme persistence is optional in restricted browser contexts.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (
        event.key === "/" &&
        !searchOpen &&
        !["INPUT", "TEXTAREA"].includes(
          document.activeElement?.tagName
        )
      ) {
        event.preventDefault();
        setSearchOpen(true);
        setNotificationOpen(false);
        setProfileOpen(false);
      }

      if (
        event.key === "Escape"
      ) {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKey
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKey
      );
  }, [searchOpen]);

  useEffect(() => {
    if (loading) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "visible"
                );
              }
            }
          );
        },
        {
          threshold: 0.06
        }
      );

    const observe = () => {
      document
        .querySelectorAll(
          ".reveal"
        )
        .forEach((element) =>
          observer.observe(
            element
          )
        );
    };

    observe();

    const timeout =
      setTimeout(
        observe,
        100
      );

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [page, loading]);

  const navigate = useCallback(
    (nextPage) => {
      setPage(nextPage);
      setNotificationOpen(false);
      setProfileOpen(false);
      setSelectedDetection(null);

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    },
    []
  );

  const goToMapWithDetection = useCallback(
    (detection) => {
      setNotificationOpen(false);
      setProfileOpen(false);
      setSelectedDetection(detection);
      setPage("Maps");

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    },
    []
  );

  const openSearch = () => {
    setSearchOpen(true);
    setNotificationOpen(false);
    setProfileOpen(false);
  };

  const openNotifications =
    () => {
      setNotificationOpen(
        (value) => !value
      );

      setSearchOpen(false);
      setProfileOpen(false);
    };

  const openProfile = () => {
    setProfileOpen(
      (value) => !value
    );

    setSearchOpen(false);
    setNotificationOpen(false);
  };

  return (
    <LiveDataProvider>
      <style>{`

/* =========================================================
   AGNI DRISHTI PREMIUM DESIGN SYSTEM
========================================================= */

@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #05070A;
  --bg2: #0A0F15;
  --text: #F5F7FA;
  --text-soft: #C6CDD4;
  --text-muted: #8C9BA8;
  --text-faint: #66727E;
  --muted: #9CA6B2;
  --panel: #070A0E;
  --panel-soft: #0A0F15;
  --panel-overlay: rgba(5,7,10,.92);
  --map-fallback: #090D12;
  --line: rgba(255,255,255,.10);
  --line-soft: rgba(255,255,255,.065);
  --control-border: rgba(255,255,255,.12);
  --orange: #FF5A1F;
  --red: #FF3040;
  --high: #FF8A1F;
  --yellow: #FFC857;
  --green: #36D399;
  --blue: #42A5FF;
  --mono: "DM Mono", monospace;
  --sans: "Manrope", sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  background: var(--bg);
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.6;
  overflow-x: hidden;
}

button,
input,
select {
  font: inherit;
}

button {
  color: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 1px solid var(--orange);
  outline-offset: 3px;
}

/* =========================================================
   LOADING
========================================================= */

.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: var(--bg);
  overflow: hidden;
  animation: loadingExit .75s ease 2.75s forwards;
}

.loading-grid {
  position: absolute;
  inset: -50%;
  background-image:
    linear-gradient(rgba(255,90,31,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,90,31,.045) 1px, transparent 1px);
  background-size: 60px 60px;
  transform: perspective(500px) rotateX(58deg) translateY(25%);
}

.loading-core {
  position: relative;
  width: min(520px, 85vw);
  text-align: center;
}

.loading-orbit {
  position: absolute;
  width: 220px;
  height: 220px;
  left: 50%;
  top: -65px;
  transform: translateX(-50%);
  border: 1px solid rgba(255,90,31,.18);
  border-radius: 50%;
}

.orbit-one {
  animation: orbitSpin 7s linear infinite;
}

.orbit-two {
  width: 310px;
  height: 120px;
  top: -15px;
  transform: translateX(-50%) rotate(28deg);
  animation: orbitSpin 9s linear reverse infinite;
}

.loading-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 25px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  color: var(--orange);
  font-family: var(--mono);
  letter-spacing: .1em;
  box-shadow: 0 0 35px rgba(255,90,31,.12);
}

.loading-title {
  font-size: clamp(30px,5vw,46px);
  font-weight: 800;
  letter-spacing: .14em;
}

.loading-subtitle {
  color: var(--muted);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .18em;
  margin-top: 4px;
}

.loading-status {
  margin-top: 75px;
  color: #CBD1D8;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .06em;
}

.loading-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 10px;
  background: var(--orange);
  box-shadow: 0 0 14px var(--orange);
  animation: blink 1s infinite;
}

.loading-satellite-track {
  position: relative;
  width: 100%;
  height: 56px;
  margin-top: 20px;
}

.loading-satellite {
  position: absolute;
  top: 0;
  transition: left .5s cubic-bezier(.4, 0, .2, 1);
  animation: satelliteFloat 2.8s ease-in-out infinite;
  z-index: 2;
}

.satellite-img {
  display: block;
  width: 90px;
  height: auto;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 6px rgba(255,90,31,.3));
}

.satellite-glow {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255,90,31,.5) 0%, transparent 70%);
  animation: satelliteGlowPulse 2.8s ease-in-out infinite;
}

@keyframes satelliteFloat {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes satelliteGlowPulse {
  0%, 100% {
    opacity: .6;
    transform: translateX(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.3);
  }
}

.loading-progress {
  width: 100%;
  height: 1px;
  margin-top: 0;
  background: rgba(255,255,255,.1);
}

.loading-progress span {
  display: block;
  height: 100%;
  background: var(--orange);
  transition: width .4s ease;
  box-shadow: 0 0 12px rgba(255,90,31,.7);
}

@keyframes loadingExit {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes orbitSpin {
  to {
    transform: translateX(-50%) rotate(360deg);
  }
}

@keyframes blink {
  50% {
    opacity: .35;
  }
}

/* =========================================================
   NAVBAR
========================================================= */

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 82px;
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 34px;
  gap: 45px;
  background: rgba(5,7,10,.84);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255,255,255,.07);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 250px;
  cursor: pointer;
}

.brand-mark {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  color: var(--orange);
  font-family: var(--mono);
  font-size: 10px;
  box-shadow: 0 0 20px rgba(255,90,31,.08);
}

.brand-copy {
  text-align: left;
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: .15em;
}

.brand-subtitle {
  margin-top: -2px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .15em;
}

.nav-links {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-link {
  position: relative;
  height: 100%;
  border: 0;
  background: none;
  padding: 0 2px;
  color: #AAB3BD;
  cursor: pointer;
  font-size: 15px;
  transition: color .25s ease;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  height: 2px;
  transform: scaleX(0);
  background: var(--orange);
  box-shadow: 0 0 10px rgba(255,90,31,.6);
  transition: transform .3s ease;
}

.nav-link:hover,
.nav-link.active {
  color: white;
}

.nav-link.active::after {
  transform: scaleX(1);
}

.nav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
}

.system-status {
  color: #B6C0CA;
  font-family: var(--mono);
  font-size: 10px;
  white-space: nowrap;
}

.system-status span,
.live-pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 8px;
  background: var(--green);
  box-shadow: 0 0 12px rgba(54,211,153,.8);
  animation: blink 1.8s infinite;
}

.nav-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.nav-clock strong {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 500;
}

.nav-clock small {
  margin-top: 4px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 8px;
}

.icon-button {
  position: relative;
  width: 30px;
  height: 30px;
  border: 0;
  background: none;
  cursor: pointer;
  font-size: 21px;
  color: #B9C2CC;
  transition: color .2s ease, transform .2s ease;
}

.icon-button:hover,
.icon-button.selected {
  color: white;
  transform: translateY(-1px);
}

.notification-button i {
  position: absolute;
  right: 3px;
  top: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 8px var(--red);
}

.profile-button {
  cursor: pointer;
  transition: .2s ease;
}

.profile-button:hover,
.profile-button.active {
  border-color: var(--orange);
  color: white;
  box-shadow: 0 0 20px rgba(255,90,31,.15);
}

.profile {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 50%;
  color: #AAB3BD;
  font-family: var(--mono);
  font-size: 9px;
  background: transparent;
}

/* =========================================================
   PROFILE PANEL
========================================================= */

.profile-panel {
  position: fixed;
  z-index: 2200;
  top: 72px;
  right: 25px;
  width: 320px;
  padding: 20px;
  background: rgba(7,10,14,.97);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(22px);
  box-shadow: 0 25px 80px rgba(0,0,0,.5);
  animation: panelIn .25s ease;
}

.profile-panel-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.profile-large {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid var(--orange);
  border-radius: 50%;
  color: var(--orange);
  font-family: var(--mono);
  font-size: 11px;
}

.profile-panel-head strong {
  display: block;
  font-size: 12px;
  letter-spacing: .04em;
}

.profile-panel-head span {
  display: block;
  margin-top: 3px;
  color: #68747F;
  font-family: var(--mono);
  font-size: 8px;
}

.profile-status {
  padding: 14px 0;
  color: var(--green);
  font-family: var(--mono);
  font-size: 8px;
  border-bottom: 1px solid var(--line);
}

.profile-status span {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 8px var(--green);
}

.profile-info {
  padding: 8px 0;
}

.profile-info div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 11px 0;
  border-bottom: 1px solid var(--line-soft);
}

.profile-info span {
  color: #65717D;
  font-family: var(--mono);
  font-size: 8px;
}

.profile-info strong {
  color: #AEB6BE;
  font-family: var(--mono);
  font-size: 8px;
  font-weight: 400;
  text-align: right;
}

.profile-panel > button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 14px 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: #AAB3BD;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 9px;
  text-align: left;
  transition: color .2s ease;
}

.profile-panel > button:hover {
  color: var(--orange);
}

.profile-panel > button span {
  color: var(--orange);
}

.profile-footer {
  padding-top: 16px;
  color: #505B66;
  font-family: var(--mono);
  font-size: 7px;
  letter-spacing: .08em;
}

/* =========================================================
   GENERAL
========================================================= */

.page {
  position: relative;
  z-index: 1;
  padding-top: 82px;
  min-height: 100vh;
}

.eyebrow {
  color: #7F8B98;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .16em;
}

.section-heading {
  display: grid;
  grid-template-columns: minmax(300px,.9fr) minmax(300px,1.2fr);
  gap: 60px;
  align-items: end;
  margin-bottom: 45px;
}

.section-heading h2 {
  margin: 8px 0 0;
  font-size: clamp(36px,5vw,62px);
  line-height: .98;
  letter-spacing: -.055em;
  text-align: left;
}

.section-heading p {
  max-width: 650px;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.75;
  text-align: left;
}

.align-center h2,
.align-center .eyebrow,
.align-center p {
  text-align: center;
}

.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity .8s ease,
    transform .8s cubic-bezier(.2,.8,.2,1);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* =========================================================
   DASHBOARD
   Background intentionally removed.
========================================================= */

.dashboard-page {
  background: var(--bg);
}

.hero {
  min-height: calc(100vh - 82px);
  padding: 110px max(7vw,50px) 90px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}

.hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  width: 100%;
}

.hero-content {
  flex: 1;
  max-width: 680px;
  position: relative;
  z-index: 2;
}

.hero::after {
  content: "";
  position: absolute;
  width: 600px;
  height: 600px;
  right: -220px;
  top: 12%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255,90,31,.055),
    transparent 67%
  );
  pointer-events: none;
}

.hero-eyebrow {
  color: #7D8995;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .16em;
}

.hero h1 {
  position: relative;
  z-index: 2;
  max-width: 1000px;
  margin: 20px 0 25px;
  font-size: clamp(56px,8vw,116px);
  line-height: .92;
  letter-spacing: -.07em;
  font-weight: 800;
  text-align: left;
}

.hero h1 em,
.analytics-hero h1 em,
.alerts-hero h1 em {
  color: #D7DCE2;
  font-style: normal;
  font-weight: 500;
}

.hero p {
  position: relative;
  z-index: 2;
  max-width: 650px;
  margin: 0;
  color: var(--muted);
  font-size: 18px;
  line-height: 1.75;
  text-align: left;
}

.hero-actions {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 30px;
  margin-top: 40px;
}

.primary-action {
  padding: 15px 22px;
  border: 1px solid rgba(255,90,31,.6);
  background: rgba(255,90,31,.08);
  color: #FFF;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .08em;
  transition: .25s ease;
}

.primary-action:hover {
  background: var(--orange);
  color: #05070A;
  box-shadow: 0 0 35px rgba(255,90,31,.22);
}

.primary-action span {
  margin-left: 18px;
  color: var(--orange);
}

.primary-action:hover span {
  color: #05070A;
}

.text-action {
  border: 0;
  background: none;
  color: #AAB3BD;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .08em;
}

.text-action:hover {
  color: white;
}

.hero-meta {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 60px;
  color: #58636E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.hero-meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #4C5761;
}

/* =========================================================
   STATS
========================================================= */

.stat-strip {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6,1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  margin: 0 max(5vw,30px);
}

.stat-item {
  position: relative;
  min-height: 150px;
  padding: 32px 28px;
  text-align: center;
}

.stat-number {
  font-size: clamp(36px,4vw,58px);
  line-height: 1;
  letter-spacing: -.065em;
  font-weight: 700;
}

.stat-label {
  margin-top: 13px;
  color: #7E8995;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .1em;
  text-align: center;
}

.stat-divider {
  position: absolute;
  top: 30px;
  bottom: 30px;
  right: 0;
  width: 1px;
  background: var(--line);
}

/* =========================================================
   INTELLIGENCE
========================================================= */

.intelligence-section {
  min-height: 760px;
  margin-top: 90px;
  padding: 90px max(7vw,50px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7vw;
  align-items: center;
  border-top: 1px solid var(--line);
}

.intelligence-copy {
  text-align: left;
}

.intelligence-copy h2 {
  margin: 18px 0 20px;
  font-size: clamp(42px,5vw,76px);
  line-height: .98;
  letter-spacing: -.055em;
  text-align: left;
}

.intelligence-copy h2 span {
  color: #737D89;
  font-weight: 400;
}

.large-count {
  margin-top: 50px;
  font-size: clamp(70px,8vw,118px);
  line-height: .8;
  font-weight: 700;
  letter-spacing: -.08em;
}

.count-label {
  margin-top: 16px;
  color: var(--orange);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: .15em;
}

.intelligence-copy p {
  max-width: 540px;
  margin: 25px 0 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.8;
}

.signal-list {
  max-width: 550px;
  margin-top: 35px;
  border-top: 1px solid var(--line);
}

.signal-list div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 9px;
}

.signal-list span {
  color: #697480;
}

.signal-list b {
  color: var(--green);
  font-weight: 400;
}

/* =========================================================
   RADAR
========================================================= */

.radar-wrap {
  position: relative;
  width: min(560px,100%);
  aspect-ratio: 1;
  margin: auto;
}

.radar {
  position: absolute;
  inset: 7%;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(
    circle,
    rgba(255,90,31,.035),
    transparent 60%
  );
  box-shadow:
    0 0 80px rgba(255,90,31,.035),
    inset 0 0 80px rgba(255,90,31,.035);
}

.radar-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);
  background-size: 45px 45px;
}

.radar-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 50%;
}

.ring-1 {
  width: 25%;
  height: 25%;
}

.ring-2 {
  width: 55%;
  height: 55%;
}

.ring-3 {
  width: 82%;
  height: 82%;
}

.radar-cross {
  position: absolute;
  background: rgba(255,255,255,.08);
}

.radar-cross.horizontal {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
}

.radar-cross.vertical {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.radar-scan {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 50%;
  height: 1px;
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    rgba(255,90,31,.9),
    transparent
  );
  box-shadow: 0 0 18px rgba(255,90,31,.4);
  animation: radarScan 4s linear infinite;
}

@keyframes radarScan {
  to {
    transform: rotate(360deg);
  }
}

.radar-point {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translate(-50%,-50%);
  animation: radarPulse 1.8s infinite;
}

@keyframes radarPulse {
  0%,100% {
    transform: translate(-50%,-50%) scale(1);
    opacity: 1;
  }

  50% {
    transform: translate(-50%,-50%) scale(2);
    opacity: .55;
  }
}

.radar-center {
  position: absolute;
  width: 8px;
  height: 8px;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
  background: var(--orange);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--orange);
}

.radar-coord {
  position: absolute;
  color: #65717D;
  font-family: var(--mono);
  font-size: 9px;
}

.coord-top {
  top: 2%;
  left: 7%;
}

.coord-bottom {
  right: 7%;
  bottom: 2%;
}

.radar-label {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  color: #697580;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .12em;
  white-space: nowrap;
}

/* =========================================================
   DETECTION LIST
========================================================= */

.detections-section {
  padding: 110px max(5vw,30px);
  border-top: 1px solid var(--line);
}

.detection-list,
.mini-detection-list {
  border-top: 1px solid var(--line);
}

.detection-row {
  border-bottom: 1px solid var(--line);
  transition:
    background .25s ease,
    padding .25s ease;
}

.detection-row.expanded {
  background: rgba(255,255,255,.03);
  border-left: 1px solid var(--line);
  border-right: 1px solid var(--line);
}

.detection-row.expanded .detection-row-main {
  border-color: transparent;
}

.detection-row-main {
  min-height: 100px;
  display: grid;
  grid-template-columns:
    55px
    minmax(240px,1.8fr)
    120px
    150px
    150px
    25px;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition:
    background .25s ease,
    padding .25s ease;
}

.detection-row-main:hover {
  padding-left: 12px;
  background: rgba(255,255,255,.025);
}

.detection-row.expanded .detection-row-main:hover {
  padding-left: 12px;
}

.row-details {
  padding: 26px 20px 30px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  border-top: 1px solid var(--line);
  animation: rowReveal .3s ease;
}

@keyframes rowReveal {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.row-details-copy small {
  display: block;
  color: #67737F;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .12em;
}

.row-details-copy p {
  margin: 8px 0 0;
  color: #B9C2CC;
  font-size: 14px;
  line-height: 1.6;
  max-width: 640px;
}

.row-goto-map {
  flex-shrink: 0;
  padding: 12px 18px;
  border: 1px solid rgba(255,90,31,.45);
  background: rgba(255,90,31,.08);
  color: var(--orange);
  cursor: pointer;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .08em;
  transition:
    background .2s ease,
    color .2s ease;
}

.row-goto-map:hover {
  background: var(--orange);
  color: #0A0F15;
}

.row-gases {
  max-width: 640px;
}

.row-gases .gas-panel {
  margin-top: 0;
  background: rgba(5,7,10,.5);
}

.row-toggle {
  color: var(--orange);
  font-size: 20px;
  text-align: center;
  line-height: 1;
}

.row-index {
  color: #58636E;
  font-family: var(--mono);
  font-size: 10px;
  text-align: center;
}

.row-main {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.row-main strong {
  font-size: 15px;
  font-weight: 600;
}

.row-main span {
  margin-top: 5px;
  color: #67737F;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .12em;
}

.row-risk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .05em;
}

.row-risk i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  box-shadow: 0 0 9px currentColor;
}

.row-time,
.row-coordinate {
  color: #7C8792;
  font-family: var(--mono);
  font-size: 8px;
  line-height: 1.6;
  text-align: left;
}

.row-arrow {
  color: #6A7580;
  font-size: 18px;
  transition: color .2s ease;
}

.detection-row-main:hover .row-toggle {
  color: var(--orange);
}

.view-all {
  display: block;
  margin: 35px 0 0 auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--orange);
  cursor: pointer;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .08em;
}

.view-all span {
  margin-left: 14px;
}

/* =========================================================
   CATEGORY
========================================================= */

.category-section {
  padding: 100px max(5vw,30px);
  border-top: 1px solid var(--line);
}

.category-intro {
  display: grid;
  grid-template-columns: 1fr 1.7fr;
  gap: 70px;
  align-items: start;
  margin-bottom: 55px;
}

.category-number {
  font-size: clamp(80px,11vw,150px);
  line-height: .7;
  letter-spacing: -.1em;
  font-weight: 700;
  text-align: left;
}

.category-copy {
  text-align: left;
}

.category-copy h2 {
  margin: 8px 0 20px;
  font-size: clamp(42px,5vw,70px);
  line-height: .95;
  letter-spacing: -.05em;
  text-align: left;
}

.category-copy p {
  max-width: 700px;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.8;
  text-align: left;
}

/* =========================================================
   MAP
========================================================= */

.map-page {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 290px 1fr;
  min-height: calc(100vh - 82px);
  padding-top: 82px;
}

.filter-rail {
  position: relative;
  z-index: 20;
  padding: 45px 27px 30px;
  border-right: 1px solid var(--line);
  background: rgba(5,7,10,.96);
  min-height: calc(100vh - 82px);
  display: flex;
  flex-direction: column;
}

.rail-heading {
  margin-bottom: 35px;
}

.rail-heading h3 {
  margin: 8px 0 0;
  font-size: 27px;
  letter-spacing: -.04em;
  text-align: left;
}

.filter-group {
  padding: 22px 0;
  border-top: 1px solid var(--line);
}

.filter-group > label:first-child {
  display: block;
  margin-bottom: 14px;
  color: #788491;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .12em;
}

.date-row {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
}

.date-field small {
  color: #596570;
  font-family: var(--mono);
  font-size: 7px;
}

.date-row input {
  width: 100%;
  padding: 9px;
  color: #BBC3CB;
  background: #0A0F15;
  border: 1px solid rgba(255,255,255,.1);
  outline: none;
  color-scheme: dark;
  font-family: var(--mono);
  font-size: 9px;
}

.date-row input:hover,
.date-row input:focus {
  border-color: var(--orange);
}

.date-row input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: .8;
}

.check-row {
  position: relative;
  display: flex !important;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  color: #A8B1BA !important;
  font-family: var(--sans) !important;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  cursor: pointer;
}

.check-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.fake-check {
  width: 13px;
  height: 13px;
  border: 1px solid #56616C;
  position: relative;
  flex: 0 0 13px;
}

.check-row input:checked + .fake-check {
  border-color: var(--orange);
  background: var(--orange);
  box-shadow: 0 0 10px rgba(255,90,31,.3);
}

.check-row input:checked + .fake-check::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  width: 4px;
  height: 7px;
  border: solid #05070A;
  border-width: 0 1px 1px 0;
  transform: rotate(45deg);
}

.risk-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.risk-check {
  border-color: var(--fake-color, #56616C);
}

.risk-check:hover {
  border-color: var(--fake-color, #56616C);
}

.check-row input:checked + .risk-check {
  border-color: var(--fake-color, #56616C);
  background: var(--fake-color, #56616C);
  box-shadow: 0 0 8px var(--fake-color, #56616C);
}

.check-row input:checked + .risk-check::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  width: 4px;
  height: 7px;
  border: solid #05070A;
  border-width: 0 1px 1px 0;
  transform: rotate(45deg);
}

.rail-bottom {
  margin-top: auto;
}

.reset-button,
.rail-action {
  width: 100%;
  padding: 11px 0;
  margin-top: 9px;
  border: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: none;
  color: #88939E;
  cursor: pointer;
  text-align: left;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .08em;
  transition: color .2s ease;
}

.reset-button:hover,
.rail-action:hover,
.rail-action.rail-active {
  color: var(--orange);
}

.showing {
  margin: 25px 0;
  display: flex;
  flex-direction: column;
}

.showing span,
.showing small {
  color: #65717D;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.showing strong {
  margin: 3px 0;
  font-size: 24px;
  font-weight: 600;
}

.close-mobile-filter,
.mobile-filter-trigger {
  display: none;
}

.map-stage {
  position: relative;
  min-width: 0;
  min-height: calc(100vh - 82px);
  overflow: hidden;
}

.leaflet-map {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #090D12;
}

.map-title {
  position: absolute;
  z-index: 10;
  top: 30px;
  left: 32px;
  pointer-events: none;
  padding: 12px 15px;
  border-left: 1px solid var(--orange);
  background: rgba(5,7,10,.72);
  backdrop-filter: blur(12px);
  text-align: left;
}

.map-title h1 {
  margin: 5px 0 2px;
  font-size: 30px;
  line-height: 1;
  letter-spacing: -.04em;
  text-align: left;
}

.map-title p {
  margin: 5px 0 0;
  color: #84909B;
  font-family: var(--mono);
  font-size: 8px;
}

.map-overlay-controls {
  position: absolute;
  z-index: 10;
  top: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.map-overlay-controls button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(5,7,10,.68);
  backdrop-filter: blur(10px);
  color: #CAD0D6;
  cursor: pointer;
  font-size: 17px;
  transition: .2s ease;
}

.map-overlay-controls button:hover {
  color: var(--orange);
  border-color: rgba(255,90,31,.5);
}

.map-legend {
  position: absolute;
  z-index: 10;
  bottom: 28px;
  left: 30px;
  display: flex;
  gap: 18px;
  padding: 10px 14px;
  background: rgba(5,7,10,.76);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,.09);
  font-family: var(--mono);
  font-size: 8px;
}

.map-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-legend i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.map-status {
  position: absolute;
  z-index: 10;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  padding: 9px 12px;
  background: rgba(5,7,10,.72);
  border: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(12px);
  color: #75818C;
  font-family: var(--mono);
  font-size: 8px;
  white-space: nowrap;
}

.map-status .live-pulse {
  width: 5px;
  height: 5px;
}

.map-coordinates {
  position: absolute;
  z-index: 10;
  right: 30px;
  bottom: 28px;
  display: flex;
  gap: 15px;
  color: #74808B;
  font-family: var(--mono);
  font-size: 8px;
  pointer-events: none;
}

.satellite-indicator {
  position: absolute;
  top: 32px;
  right: 84px;
  z-index: 10;
  padding: 10px 12px;
  color: #798590;
  background: rgba(5,7,10,.72);
  border: 1px solid rgba(255,255,255,.09);
  backdrop-filter: blur(10px);
  font-family: var(--mono);
  font-size: 8px;
}

.satellite-indicator.on {
  color: var(--orange);
  border-color: rgba(255,90,31,.4);
}

/* =========================================================
   MAP MARKERS
========================================================= */

.fire-marker-wrapper,
.location-marker-wrapper {
  background: transparent !important;
  border: 0 !important;
}

.fw-marker {
  position: relative;
  width: 28px;
  height: 28px;
  border: 1px solid var(--marker);
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(5,7,10,.86);
  color: var(--marker);
  font-family: var(--mono);
  font-size: 9px;
  box-shadow: 0 0 12px var(--marker);
  transition: transform .2s ease;
}

.fw-marker:hover {
  transform: scale(1.2);
}

.fw-marker.critical::before {
  content: "";
  position: absolute;
  width: 34px;
  height: 34px;
  border: 1px solid var(--marker);
  border-radius: 50%;
  animation: markerPulse 1.5s infinite;
}

@keyframes markerPulse {
  0% {
    transform: scale(.8);
    opacity: .9;
  }

  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}

.fw-spot-wrapper {
  background: transparent !important;
  border: 0 !important;
}

.fw-spot {
  position: relative;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
}

.fw-spot-ring {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid var(--marker);
  border-radius: 50%;
  animation: spotPulse 1.6s ease-out infinite;
}

.fw-spot-ring:nth-last-child(2) {
  animation-delay: .5s;
}

.fw-spot-core {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--marker);
  box-shadow: 0 0 28px var(--marker);
}

.fw-spot-core::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid var(--marker);
  opacity: .4;
}

@keyframes spotPulse {
  0% {
    transform: scale(.5);
    opacity: .9;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.location-marker {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid white;
  background: var(--blue);
  box-shadow:
    0 0 0 5px rgba(66,165,255,.18),
    0 0 25px rgba(66,165,255,.7);
  animation: locationPulse 1.7s infinite;
}

.location-marker span {
  position: absolute;
  width: 5px;
  height: 5px;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
  border-radius: 50%;
  background: white;
}

@keyframes locationPulse {
  50% {
    box-shadow:
      0 0 0 12px rgba(66,165,255,.03),
      0 0 30px rgba(66,165,255,.8);
  }
}

.fw-tooltip {
  color: #E8ECF0 !important;
  background: rgba(5,7,10,.94) !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font-family: var(--mono);
  font-size: 9px;
  padding: 0 !important;
}

.fw-tt {
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 10px 12px;
  line-height: 1.5;
}

.fw-tt-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}

.fw-tt-head strong {
  color: #FFFFFF;
  font-size: 10px;
  letter-spacing: .02em;
}

.fw-tt-head span {
  color: #8C9BA8;
  font-size: 8px;
  letter-spacing: .1em;
}

.fw-tt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 3px 0;
}

.fw-tt-row span {
  color: #66727E;
}

.fw-tt-row b {
  color: #DCE6F0;
  font-weight: 500;
}

.fw-tt-trend {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255,255,255,.1);
  letter-spacing: .12em;
}

.fw-tooltip::before {
  border-top-color: rgba(255,255,255,.12) !important;
}

.leaflet-control-attribution {
  background: rgba(5,7,10,.6) !important;
  color: #65717D !important;
  font-family: var(--mono);
  font-size: 7px;
}

.leaflet-control-attribution a {
  color: #8D99A5 !important;
}

/* =========================================================
   MAP POPUP
========================================================= */

.map-popup-panel {
  position: absolute;
  z-index: 30;
  top: 120px;
  right: 32px;
  width: min(420px,calc(100% - 64px));
  max-height: calc(100% - 170px);
  overflow-y: auto;
  padding: 28px;
  background: rgba(5,7,10,.92);
  backdrop-filter: blur(22px);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 25px 80px rgba(0,0,0,.4);
  animation: popupIn .3s ease;
  text-align: left;
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.popup-close {
  position: absolute;
  top: 15px;
  right: 15px;
  border: 0;
  background: none;
  color: #84909B;
  cursor: pointer;
  font-size: 20px;
}

.map-popup-panel h2 {
  max-width: 340px;
  margin: 10px 0 18px;
  font-size: 28px;
  line-height: 1.08;
  letter-spacing: -.04em;
  text-align: left;
}

.popup-risk {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid;
  font-family: var(--mono);
  font-size: 9px;
}

.popup-risk span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.popup-meta {
  margin-top: 25px;
  border-top: 1px solid var(--line);
}

.popup-meta div {
  display: flex;
  flex-direction: column;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}

.popup-meta small,
.popup-description small {
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.popup-meta strong {
  margin-top: 4px;
  color: #C6CDD4;
  font-size: 12px;
  font-weight: 500;
}

.popup-description {
  margin-top: 25px;
}

.popup-description p {
  margin: 8px 0 0;
  color: #919CA7;
  font-size: 13px;
  line-height: 1.7;
}

/* ---------------------------------------------------------
   THERMAL POPUP (stats left + HD thermal view right)
--------------------------------------------------------- */

.thermal-popup {
  top: 24px;
  right: 24px;
  width: min(1060px, calc(100% - 48px));
  max-height: calc(100% - 48px);
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.thermal-popup .popup-close {
  top: 20px;
  right: 22px;
  z-index: 5;
  font-size: 24px;
}

.thermal-popup-head {
  padding: 26px 30px 20px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.thermal-popup-head h2 {
  max-width: 640px;
  margin: 8px 0 14px;
  font-size: 30px;
  line-height: 1.08;
  letter-spacing: -.04em;
  text-align: left;
}

.thermal-risk {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid;
  font-family: var(--mono);
  font-size: 9px;
}

.thermal-risk i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.thermal-popup-body {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  overflow-y: auto;
  flex: 1;
}

.thermal-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-right: 1px solid rgba(255,255,255,.08);
  min-width: 0;
}

.thermal-view {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24px;
  gap: 18px;
}

.ten-day-wrap {
  padding: 16px;
  background: rgba(10,15,21,.6);
  border: 1px solid rgba(255,255,255,.08);
}

.ten-day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ten-day-head span {
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.ten-day-head b {
  font-family: var(--mono);
  font-size: 13px;
}

.ten-day-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 118px;
  margin: 14px 0 0;
}

.ten-day-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
}

.ten-day-bar {
  width: 100%;
  min-height: 4px;
  border-radius: 2px 2px 0 0;
  transition: transform .3s ease;
}

.ten-day-bar:hover {
  transform: scaleY(1.03);
}

.ten-day-col span {
  color: #5A6570;
  font-family: var(--mono);
  font-size: 7px;
}

.ten-day-stats {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.ten-day-stats div {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ten-day-stats small {
  color: #66727E;
  font-family: var(--mono);
  font-size: 7px;
  letter-spacing: .1em;
}

.ten-day-stats strong {
  margin-top: 4px;
  color: #E8ECF0;
  font-size: 17px;
}

.gasval-panel {
  padding: 16px;
  background: rgba(10,15,21,.6);
  border: 1px solid rgba(255,255,255,.08);
}

.gasval-head {
  margin-bottom: 10px;
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.gasval-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 16px;
}

.gasval-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255,255,255,.05);
}

.gasval-row span {
  color: #8C9BA8;
  font-family: var(--mono);
  font-size: 9px;
}

.gasval-row b {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.gasval-row b small {
  margin-left: 2px;
  color: #66727E;
  font-size: 7px;
  font-weight: 500;
}

.thermal-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.thermal-meta .gas-panel {
  margin-top: 0;
  margin-bottom: 14px;
}

.thermal-meta-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.thermal-meta-row small {
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.thermal-meta-row strong {
  color: #C6CDD4;
  font-size: 12px;
  font-weight: 500;
}

.thermal-map-wrap {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.12);
  background: #04070d;
}

.thermal-map-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 680 / 440;
  overflow: hidden;
  background: #04070d;
}

.thermal-satellite {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.thermal-satellite .leaflet-tile {
  filter: saturate(1.2) contrast(1.05);
}

.thermal-overlay-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.thermal-map-wrap .leaflet-container {
  background: #04070d;
}

.thermal-map-wrap .leaflet-tile-pane,
.thermal-map-wrap .leaflet-tile-container {
  filter: none;
  opacity: 1;
}

.thermal-map-head {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  background: rgba(4,7,13,.62);
  color: #9FADBA;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .14em;
}

.thermal-map-coords {
  position: absolute;
  right: 12px;
  bottom: 34px;
  z-index: 2;
  padding: 4px 8px;
  background: rgba(4,7,13,.62);
  color: #C6CDD4;
  font-family: var(--mono);
  font-size: 9px;
}

.thermal-map-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: #060a11;
  border-top: 1px solid rgba(255,255,255,.08);
}

.thermal-map-footer span {
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
}

.thermal-scale {
  display: flex;
  flex: 0 1 200px;
  height: 8px;
}

.thermal-scale i {
  flex: 1;
}

.thermal-scale i:nth-child(1) {
  background: #0a1a46;
}

.thermal-scale i:nth-child(2) {
  background: #004ea8;
}

.thermal-scale i:nth-child(3) {
  background: #22d682;
}

.thermal-scale i:nth-child(4) {
  background: #ff8438;
}

.thermal-scale i:nth-child(5) {
  background: #ff3340;
}

.thermal-desc {
  border-left: 2px solid #FF5A1F;
  padding: 4px 14px;
}

.thermal-desc small {
  color: #66727E;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.thermal-desc p {
  margin: 6px 0 0;
  color: #919CA7;
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 860px) {
  .thermal-popup {
    top: 24px;
    right: 16px;
    left: 16px;
    width: auto;
  }

  .thermal-popup-body {
    grid-template-columns: 1fr;
  }

  .thermal-stats {
    border-right: 0;
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
}

.gas-panel {
  margin-top: 25px;
  padding: 16px;
  background: rgba(10,15,21,.6);
  border: 1px solid rgba(255,255,255,.08);
}

.gas-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.gas-heading span {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #66D9A0;
}

.gas-heading small {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--orange, #FF5A1F);
}

.gas-table {
  display: flex;
  flex-direction: column;
}

.gas-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid rgba(255,255,255,.06);
  font-family: var(--mono);
  font-size: 11px;
  color: #A8B1BA;
}

.firms-fields-table .gas-row {
  grid-template-columns: 1.4fr 1fr .5fr;
}

.gas-row.gas-head {
  padding: 0 0 8px;
  border-top: 0;
  color: #596570;
  font-size: 8px;
  letter-spacing: 1px;
}

.gas-row strong {
  color: #EDF1F4;
  font-weight: 600;
}

.gas-neg {
  color: #42A5FF;
}

.gas-pos {
  color: #FF8A1F;
}

/* =========================================================
   ANALYTICS
========================================================= */

.analytics-page {
  padding-bottom: 120px;
}

.analytics-hero {
  padding: 125px max(7vw,50px) 80px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.analytics-hero h1 {
  margin: 18px 0 20px;
  font-size: clamp(52px,8vw,105px);
  line-height: .91;
  letter-spacing: -.07em;
  text-align: left;
}

.analytics-hero p {
  max-width: 630px;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.7;
  text-align: left;
}

.analytics-filters {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 20px;
  margin: 35px max(5vw,30px);
}

.analytics-filters label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.analytics-filters label span {
  color: #68737F;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .1em;
}

.analytics-filters select {
  padding: 11px 10px;
  background: rgba(255,255,255,.015);
  color: #B8C0C8;
  border: 1px solid var(--line);
  outline: none;
  font-family: var(--mono);
  font-size: 10px;
  color-scheme: dark;
}

.analytics-main {
  display: grid;
  grid-template-columns: 2.1fr .9fr;
  gap: 50px;
  margin: 100px max(5vw,30px) 0;
  align-items: start;
}

.trend-chart {
  min-width: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 25px;
}

.chart-header h3,
.classification h3 {
  margin: 6px 0 0;
  font-size: 31px;
  letter-spacing: -.04em;
  text-align: left;
}

.chart-range {
  color: #66727D;
  font-family: var(--mono);
  font-size: 8px;
}

.chart-body {
  position: relative;
  height: 370px;
}

.chart-body svg {
  width: 100%;
  height: 330px;
  overflow: visible;
}

.chart-grid {
  stroke: rgba(255,255,255,.08);
  stroke-width: 1;
}

.chart-axis {
  fill: #596570;
  font-family: var(--mono);
  font-size: 10px;
}

.chart-area {
  fill: url(#fireGradient);
}

.chart-line {
  fill: none;
  stroke: var(--orange);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1800;
  stroke-dashoffset: 1800;
  animation: drawChart 2.2s ease forwards;
  filter: drop-shadow(0 0 7px rgba(255,90,31,.4));
}

@keyframes drawChart {
  to {
    stroke-dashoffset: 0;
  }
}

.chart-point {
  fill: var(--bg);
  stroke: var(--orange);
  stroke-width: 2;
  cursor: crosshair;
  transition: r .15s ease;
}

.chart-months {
  position: absolute;
  left: 38px;
  right: 38px;
  bottom: 8px;
  display: flex;
  justify-content: space-between;
  color: #596570;
  font-family: var(--mono);
  font-size: 8px;
}

.chart-tooltip {
  position: absolute;
  top: 22%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background: #10161D;
  border: 1px solid rgba(255,255,255,.13);
  pointer-events: none;
}

.chart-tooltip strong {
  font-size: 16px;
}

.chart-tooltip span {
  color: #697581;
  font-family: var(--mono);
  font-size: 7px;
}

.classification {
  padding-left: 20px;
}

.classification-bars {
  margin-top: 45px;
}

.classification-row {
  margin-bottom: 29px;
}

.classification-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #A8B0B8;
  font-size: 13px;
}

.classification-top strong {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 400;
}

.bar {
  height: 3px;
  background: rgba(255,255,255,.08);
}

.bar span {
  display: block;
  height: 100%;
  animation: growBar 1.3s ease forwards;
  transform-origin: left;
}

@keyframes growBar {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

/* =========================================================
   LOCATIONS
========================================================= */

.locations-section {
  margin: 130px max(5vw,30px) 0;
  padding-top: 80px;
  border-top: 1px solid var(--line);
}

.ranking-list {
  border-top: 1px solid var(--line);
}

.ranking-row {
  min-height: 90px;
  display: grid;
  grid-template-columns: 70px 1fr 180px 100px;
  align-items: center;
  gap: 25px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.rank-number {
  color: #56616C;
  font-family: var(--mono);
  font-size: 10px;
  text-align: center;
}

.ranking-row strong {
  font-size: 17px;
  font-weight: 600;
}

.ranking-row > span:not(.rank-number) {
  color: #7E8994;
  font-family: var(--mono);
  font-size: 9px;
}

.ranking-row b {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 500;
  text-align: right;
}

/* =========================================================
   RISK DISTRIBUTION
========================================================= */

.risk-distribution {
  margin: 120px max(5vw,30px);
  padding: 75px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  text-align: left;
}

.risk-distribution h2 {
  margin: 8px 0 50px;
  font-size: clamp(38px,5vw,62px);
  letter-spacing: -.05em;
  text-align: left;
}

.risk-bars {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 35px;
}

.risk-bar-row {
  min-width: 0;
}

.risk-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 13px;
}

.risk-bar-label span {
  font-family: var(--mono);
  font-size: 9px;
}

.risk-bar-label strong {
  font-size: 30px;
  letter-spacing: -.04em;
}

.risk-bar {
  height: 5px;
  background: rgba(255,255,255,.07);
}

.risk-bar span {
  display: block;
  height: 100%;
  animation: growBar 1.2s ease;
}

/* =========================================================
   CRITICAL INFRASTRUCTURE
========================================================= */

.critical-infrastructure {
  margin: 120px max(5vw,30px) 0;
  padding: 75px 0 0;
  border-top: 1px solid rgba(255,48,64,.35);
  text-align: left;
}

.critical-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 60px;
  padding-bottom: 55px;
}

.critical-header h2 {
  margin: 12px 0 20px;
  font-size: clamp(42px,5vw,68px);
  line-height: .93;
  letter-spacing: -.06em;
  text-align: left;
}

.critical-header h2 span {
  color: #737D89;
  font-weight: 400;
}

.critical-header p {
  max-width: 590px;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.75;
}

.critical-eyebrow {
  color: var(--red);
}

.critical-badge {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid rgba(255,48,64,.35);
  color: var(--red);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.critical-badge span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 10px var(--red);
  animation: blink 1.2s infinite;
}

.critical-event {
  display: grid;
  grid-template-columns: 70px 1fr 220px;
  gap: 30px;
  padding: 35px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.critical-event-index {
  color: #505B65;
  font-family: var(--mono);
  font-size: 11px;
}

.critical-event-type {
  color: var(--red);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .12em;
}

.critical-event-main h3 {
  margin: 9px 0 12px;
  font-size: 35px;
  line-height: 1;
  letter-spacing: -.05em;
  font-weight: 600;
}

.critical-location {
  color: #697581;
  font-family: var(--mono);
  font-size: 9px;
}

.critical-event-risk {
  padding-left: 25px;
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.critical-event-risk span,
.critical-event-risk small {
  color: #68747F;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.critical-event-risk strong {
  margin: 5px 0;
  color: var(--red);
  font-family: var(--mono);
  font-size: 18px;
  letter-spacing: .08em;
}

.critical-metrics {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  border-bottom: 1px solid var(--line);
}

.critical-metric {
  min-height: 175px;
  padding: 30px 25px;
  border-right: 1px solid var(--line);
}

.critical-metric:last-child {
  border-right: 0;
}

.critical-metric > span {
  color: #66727D;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.critical-metric strong {
  display: block;
  margin-top: 14px;
  font-size: 37px;
  line-height: 1;
  letter-spacing: -.06em;
}

.critical-metric strong small {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 400;
}

.critical-metric p {
  margin: 12px 0 0;
  color: #77838E;
  font-size: 12px;
}

.critical-metric.action strong {
  color: var(--red);
  font-family: var(--mono);
  font-size: 17px;
  letter-spacing: .04em;
  line-height: 1.25;
}

.critical-analysis {
  display: grid;
  grid-template-columns: 4px minmax(300px,760px);
  gap: 28px;
  padding: 45px 0;
}

.critical-analysis-line {
  position: relative;
}

.critical-analysis-line span {
  display: block;
  width: 2px;
  height: 100%;
  background: linear-gradient(
    var(--red),
    rgba(255,48,64,.05)
  );
  box-shadow: 0 0 20px rgba(255,48,64,.25);
}

.critical-analysis p {
  margin: 10px 0 0;
  color: #919CA7;
  font-size: 15px;
  line-height: 1.8;
}

/* =========================================================
   ALERTS
========================================================= */

.alerts-page {
  padding-bottom: 110px;
}

.alerts-hero {
  min-height: 570px;
  padding: 125px max(7vw,50px) 90px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-items: end;
  gap: 80px;
  border-bottom: 1px solid var(--line);
}

.alerts-hero h1 {
  margin: 18px 0 20px;
  font-size: clamp(65px,9vw,120px);
  line-height: .85;
  letter-spacing: -.08em;
  text-align: left;
}

.alerts-hero p {
  color: var(--muted);
  font-size: 17px;
  text-align: left;
}

.alert-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.alert-summary div {
  min-height: 125px;
  padding: 25px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  text-align: left;
}

.alert-summary strong {
  font-size: 47px;
  line-height: 1;
  letter-spacing: -.07em;
}

.alert-summary span {
  margin-top: 12px;
  color: #6D7884;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.priority-section {
  padding: 100px max(5vw,30px);
}

.alert-timeline {
  position: relative;
  border-top: 1px solid var(--line);
  margin-top: 50px;
  padding-left: 70px;
}

.alert-timeline::before {
  content: "";
  position: absolute;
  left: 23px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(
    var(--orange),
    rgba(255,90,31,.08)
  );
}

.timeline-item {
  position: relative;
  min-height: 210px;
  padding: 35px 0;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: padding .25s ease;
}

.timeline-item:hover {
  padding-left: 10px;
}

.timeline-marker {
  position: absolute;
  left: -70px;
  top: 35px;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  color: #05070A;
  font-family: var(--mono);
  font-size: 9px;
  border-radius: 50%;
  box-shadow: 0 0 25px rgba(255,90,31,.12);
}

.timeline-top {
  display: flex;
  justify-content: space-between;
  max-width: 700px;
  font-family: var(--mono);
  font-size: 9px;
}

.timeline-top time {
  color: #69747F;
}

.timeline-content h3 {
  margin: 13px 0 5px;
  font-size: 29px;
  letter-spacing: -.04em;
  text-align: left;
}

.timeline-content p {
  margin: 0;
  color: #818D98;
  font-size: 14px;
}

.timeline-bottom {
  max-width: 700px;
  display: flex;
  justify-content: space-between;
  margin-top: 25px;
  font-family: var(--mono);
  font-size: 9px;
}

.timeline-bottom span {
  color: #6C7782;
}

.timeline-bottom b {
  color: #B6BEC6;
  font-weight: 400;
}

.why-alert {
  margin: 0 max(5vw,30px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.why-alert-heading {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 35px 0;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
}

.why-alert-heading h2 {
  margin: 8px 0 0;
  font-size: 34px;
  letter-spacing: -.04em;
  text-align: left;
}

.why-alert-heading > span {
  color: var(--orange);
  font-size: 28px;
  font-weight: 300;
}

.why-content {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 0 50px;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-height .5s ease,
    opacity .35s ease,
    padding .5s ease;
}

.why-content.expanded {
  max-height: 300px;
  padding: 0 0 35px;
  opacity: 1;
}

.why-content div {
  padding: 14px 0;
  border-top: 1px solid var(--line);
  color: #AEB6BE;
  font-size: 14px;
}

.why-content span {
  color: var(--green);
  margin-right: 12px;
}

.history-section {
  margin: 110px max(5vw,30px) 0;
}

.history-table {
  border-top: 1px solid var(--line);
}

.history-header,
.history-row {
  display: grid;
  grid-template-columns:
    80px
    1.8fr
    160px
    130px
    100px;
  gap: 20px;
  align-items: center;
}

.history-header {
  min-height: 55px;
  color: #606C77;
  font-family: var(--mono);
  font-size: 8px;
  text-align: left;
}

.history-row {
  min-height: 80px;
  border-top: 1px solid var(--line);
  cursor: pointer;
  transition: background .2s ease;
  text-align: left;
}

.history-row:hover {
  background: rgba(255,255,255,.025);
}

.history-row > span:first-child {
  color: #56616C;
  font-family: var(--mono);
  font-size: 9px;
  text-align: center;
}

.history-row strong {
  font-size: 14px;
  font-weight: 500;
}

.history-row .status-text,
.history-row > span:nth-child(4) {
  color: #78848F;
  font-family: var(--mono);
  font-size: 8px;
}

.history-row b {
  font-family: var(--mono);
  font-size: 8px;
  font-weight: 500;
}

/* =========================================================
   SEARCH
========================================================= */

.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: var(--panel-overlay);
  backdrop-filter: blur(20px);
  animation: overlayIn .25s ease;
  overflow-y: auto;
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.search-inner {
  width: min(1100px,86vw);
  margin: 0 auto;
  padding-top: 120px;
  padding-bottom: 80px;
}

.search-top {
  display: flex;
  justify-content: space-between;
  color: #68737F;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .12em;
}

.search-top button {
  border: 0;
  background: none;
  color: #89949F;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 9px;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 35px;
  border-bottom: 1px solid rgba(255,255,255,.2);
}

.search-input-wrap > span {
  color: var(--orange);
  font-size: 30px;
}

.search-inner > .search-input-wrap input {
  flex: 1;
  width: 100%;
  padding: 20px 0;
  border: 0;
  outline: none;
  background: transparent;
  color: white;
  font-size: clamp(30px,5vw,65px);
  font-weight: 500;
  letter-spacing: -.05em;
}

.search-inner > .search-input-wrap input::placeholder {
  color: #3E4852;
}

.search-clear {
  border: 0;
  background: none;
  color: #66727D;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 8px;
}

.search-clear:hover {
  color: var(--orange);
}

.search-hint {
  margin-top: 13px;
  color: #596570;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .08em;
}

.search-results {
  margin-top: 20px;
}

.search-results > button {
  width: 100%;
  display: grid;
  grid-template-columns: 50px 1fr 150px 30px;
  align-items: center;
  gap: 20px;
  padding: 19px 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background .2s ease, padding .2s ease;
}

.search-results > button:hover {
  padding-left: 12px;
  background: rgba(255,255,255,.025);
}

.search-results > button > span {
  color: #56616C;
  font-family: var(--mono);
  font-size: 9px;
}

.search-results strong {
  display: block;
  font-size: 16px;
  font-weight: 500;
}

.search-results small {
  display: block;
  margin-top: 4px;
  color: #74808B;
  font-family: var(--mono);
  font-size: 8px;
}

.search-coord {
  margin-top: 0 !important;
  line-height: 1.6;
}

.search-results b {
  color: var(--orange);
  font-size: 16px;
}

.empty-search {
  padding-top: 35px;
  color: #68737F;
  font-family: var(--mono);
  font-size: 10px;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

.notification-panel {
  position: fixed;
  z-index: 2100;
  top: 73px;
  right: 25px;
  width: 365px;
  background: rgba(7,10,14,.97);
  border: 1px solid rgba(255,255,255,.11);
  backdrop-filter: blur(20px);
  box-shadow: 0 25px 80px rgba(0,0,0,.4);
  animation: panelIn .25s ease;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.notification-header div {
  display: flex;
  flex-direction: column;
}

.notification-header span {
  color: #697580;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.notification-header small {
  margin-top: 4px;
  color: #48535E;
  font-family: var(--mono);
  font-size: 7px;
}

.notification-header b {
  color: var(--orange);
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 400;
}

.notification-panel > button {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 16px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background .2s ease;
}

.notification-panel > button:hover {
  background: rgba(255,255,255,.025);
}

.notification-severity {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: .08em;
}

.notification-severity.critical {
  color: var(--red);
}

.notification-severity.high {
  color: var(--high);
}

.notification-severity.medium {
  color: var(--yellow);
}

.notification-panel strong {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
}

.notification-panel small {
  margin-top: 4px;
  color: #6D7883;
  font-family: var(--mono);
  font-size: 8px;
}

.notification-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  color: var(--orange);
  transform: translateY(-50%);
}

.notification-panel .all-notifications {
  flex-direction: row;
  justify-content: space-between;
  color: var(--orange);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: .08em;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1200px) {

  .navbar {
    gap: 20px;
    padding: 0 20px;
  }

  .brand {
    min-width: 210px;
  }

  .nav-links {
    gap: 18px;
  }

  .system-status {
    display: none;
  }

  .detection-row-main {
    grid-template-columns:
      45px
      minmax(200px,1.6fr)
      100px
      130px
      115px
      20px;
    gap: 12px;
  }

  .analytics-main {
    grid-template-columns: 1.8fr 1fr;
  }

  .critical-metrics {
    grid-template-columns: repeat(2,1fr);
  }

  .critical-metric:nth-child(2) {
    border-right: 0;
  }

  .critical-metric:nth-child(n+3) {
    border-top: 1px solid var(--line);
  }
}

@media (max-width: 1024px) {

  .navbar {
    height: 70px;
  }

  .page {
    padding-top: 70px;
  }

  .nav-clock {
    display: none;
  }

  .brand-subtitle {
    display: none;
  }

  .hero {
    min-height: auto;
    padding-top: 90px;
    padding-bottom: 60px;
  }

  .hero-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 30px;
  }

  .stat-strip {
    grid-template-columns: repeat(3,1fr);
  }

  .stat-item:nth-child(4),
  .stat-item:nth-child(5) {
    border-top: 1px solid var(--line);
  }

  .intelligence-section {
    grid-template-columns: 1fr;
  }

  .radar-wrap {
    width: min(500px,80vw);
  }

  .category-intro {
    grid-template-columns: .7fr 1.3fr;
  }

  .map-page {
    grid-template-columns: 250px 1fr;
    padding-top: 70px;
  }

  .filter-rail {
    min-height: calc(100vh - 70px);
  }

  .analytics-main {
    grid-template-columns: 1fr;
  }

  .classification {
    padding-left: 0;
  }

  .risk-bars {
    grid-template-columns: repeat(2,1fr);
  }

  .critical-header {
    flex-direction: column;
  }

  .critical-event {
    grid-template-columns: 55px 1fr 170px;
  }

  .alerts-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}

@media (max-width: 768px) {

  body {
    font-size: 15px;
  }

  .navbar {
    height: 64px;
    padding: 0 16px;
  }

  .brand {
    min-width: auto;
  }

  .brand-name {
    font-size: 12px;
  }

  .nav-links {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    gap: 13px;
  }

  .nav-link {
    font-size: 12px;
  }

  .nav-right {
    gap: 5px;
  }

  .nav-right .profile {
    display: none;
  }

  .icon-button {
    width: 26px;
  }

  .page {
    padding-top: 64px;
  }

  .hero {
    min-height: 650px;
    padding: 90px 24px 70px;
  }

  .hero h1 {
    font-size: clamp(52px,15vw,85px);
  }

  .hero p {
    font-size: 16px;
  }

  .hero-meta {
    flex-wrap: wrap;
    line-height: 1;
  }

  .stat-strip {
    margin: 0 20px;
    grid-template-columns: repeat(2,1fr);
  }

  .stat-item {
    min-height: 120px;
    padding: 24px 16px;
  }

  .stat-item:nth-child(2),
  .stat-item:nth-child(4) {
    border-right: 0;
  }

  .stat-item:nth-child(3) {
    border-top: 1px solid var(--line);
  }

  .stat-number {
    font-size: 38px;
  }

  .intelligence-section {
    margin-top: 50px;
    padding: 70px 24px;
  }

  .intelligence-copy h2 {
    font-size: 46px;
  }

  .detections-section,
  .category-section {
    padding: 75px 20px;
  }

  .section-heading {
    display: block;
  }

  .section-heading p {
    margin-top: 20px;
  }

  .detection-row-main {
    grid-template-columns:
      35px
      1fr
      75px
      20px;
    gap: 8px;
    min-height: 105px;
  }

  .row-time,
  .row-coordinate {
    display: none;
  }

  .row-risk {
    justify-content: flex-end;
  }

  .row-risk i {
    display: none;
  }

  .row-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    padding: 20px 16px 24px;
  }

  .row-goto-map {
    width: 100%;
  }

  .category-intro {
    grid-template-columns: 1fr;
    gap: 35px;
  }

  .category-number {
    font-size: 90px;
  }

  .map-page {
    display: block;
    padding-top: 64px;
  }

  .filter-rail {
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
    width: 290px;
    min-height: auto;
    transform: translateX(-100%);
    transition: transform .3s ease;
    overflow-y: auto;
  }

  .filter-rail.mobile-open {
    transform: translateX(0);
  }

  .mobile-filter-trigger {
    display: block;
    position: fixed;
    z-index: 50;
    top: 82px;
    left: 15px;
    padding: 10px 12px;
    color: var(--orange);
    background: rgba(5,7,10,.86);
    border: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(10px);
    font-family: var(--mono);
    font-size: 8px;
  }

  .close-mobile-filter {
    display: block;
  }

  .map-stage {
    min-height: calc(100vh - 64px);
  }

  .map-title {
    top: 18px;
    left: 16px;
  }

  .map-title h1 {
    font-size: 23px;
  }

  .map-overlay-controls {
    top: 18px;
    right: 16px;
  }

  .map-popup-panel {
    top: auto;
    bottom: 20px;
    right: 15px;
    left: 15px;
    width: auto;
    max-height: 52vh;
  }

  .map-legend {
    left: 15px;
    bottom: 18px;
    gap: 9px;
  }

  .map-status {
    display: none;
  }

  .map-coordinates {
    display: none;
  }

  .satellite-indicator {
    display: none;
  }

  .analytics-hero,
  .alerts-hero {
    padding: 95px 24px 70px;
  }

  .analytics-hero h1,
  .alerts-hero h1 {
    font-size: 60px;
  }

  .analytics-filters {
    grid-template-columns: 1fr 1fr;
    margin: 25px 20px;
  }

  .analytics-main {
    margin: 75px 20px 0;
  }

  .chart-body {
    height: 300px;
  }

  .chart-body svg {
    height: 260px;
  }

  .locations-section,
  .risk-distribution,
  .critical-infrastructure {
    margin-left: 20px;
    margin-right: 20px;
  }

  .ranking-row {
    grid-template-columns: 45px 1fr 70px;
    gap: 10px;
  }

  .ranking-row > span:not(.rank-number) {
    display: none;
  }

  .ranking-row b {
    text-align: right;
  }

  .risk-bars {
    grid-template-columns: 1fr;
  }

  .critical-header h2 {
    font-size: 45px;
  }

  .critical-event {
    grid-template-columns: 35px 1fr;
  }

  .critical-event-risk {
    grid-column: 2;
    padding-left: 0;
    padding-top: 20px;
    border-left: 0;
    border-top: 1px solid var(--line);
  }

  .critical-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .critical-metric {
    min-height: 160px;
  }

  .critical-metric:nth-child(2) {
    border-right: 0;
  }

  .critical-metric:nth-child(3) {
    border-right: 1px solid var(--line);
  }

  .critical-metric:nth-child(4) {
    border-right: 0;
  }

  .alerts-hero {
    grid-template-columns: 1fr;
    gap: 50px;
  }

  .alert-summary {
    grid-template-columns: 1fr 1fr;
  }

  .alert-timeline {
    padding-left: 45px;
  }

  .alert-timeline::before {
    left: 15px;
  }

  .timeline-marker {
    left: -45px;
    width: 32px;
    height: 32px;
    top: 35px;
  }

  .timeline-content h3 {
    font-size: 23px;
  }

  .why-content {
    grid-template-columns: 1fr;
  }

  .history-header,
  .history-row {
    grid-template-columns: 40px 1fr 100px;
  }

  .history-header span:nth-child(4),
  .history-header span:nth-child(5),
  .history-row > span:nth-child(4),
  .history-row > b {
    display: none;
  }

  .notification-panel,
  .profile-panel {
    top: 64px;
    right: 10px;
    left: 10px;
    width: auto;
  }

  .search-inner {
    width: calc(100% - 40px);
    padding-top: 100px;
  }

  .search-results > button {
    grid-template-columns: 35px 1fr 20px;
  }

  .search-results .search-coord {
    display: none;
  }
}

@media (max-width: 520px) {

  .brand-mark {
    width: 28px;
    height: 28px;
    flex-basis: 28px;
  }

  .nav-links {
    gap: 9px;
  }

  .nav-link {
    font-size: 10px;
  }

  .nav-link::after {
    bottom: 12px;
  }

  .hero h1 {
    font-size: 54px;
  }

  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }

  .stat-strip {
    grid-template-columns: 1fr 1fr;
  }

  .stat-item:nth-child(5) {
    grid-column: 1 / -1;
  }

  .analytics-filters {
    grid-template-columns: 1fr;
  }

  .analytics-hero h1,
  .alerts-hero h1 {
    font-size: 53px;
  }

  .alert-summary strong {
    font-size: 36px;
  }

  .map-legend span:nth-child(n+3) {
    display: none;
  }

  .critical-metrics {
    grid-template-columns: 1fr;
  }

  .critical-metric,
  .critical-metric:nth-child(2),
  .critical-metric:nth-child(3),
  .critical-metric:nth-child(4) {
    border-right: 0;
    border-top: 1px solid var(--line);
  }

  .critical-metric:first-child {
    border-top: 0;
  }

  .critical-event-main h3 {
    font-size: 28px;
  }

  .critical-analysis {
    grid-template-columns: 3px 1fr;
    gap: 18px;
  }
}

/* =========================================================
   LIGHT / DARK THEME
   ========================================================= */

html[data-theme="dark"] {
  color-scheme: dark;
}

html[data-theme="light"] {
  color-scheme: light;
  --bg: #F4F6F8;
  --bg2: #FFFFFF;
  --text: #111820;
  --text-soft: #27333E;
  --text-muted: #52616E;
  --text-faint: #64717D;
  --muted: #4E5D69;
  --panel: #FFFFFF;
  --panel-soft: #EDF1F4;
  --panel-overlay: rgba(255,255,255,.97);
  --map-fallback: #DDE3E7;
  --line: rgba(17,24,32,.16);
  --line-soft: rgba(17,24,32,.09);
  --control-border: rgba(17,24,32,.16);
  --orange: #C63B0D;
  --red: #C52232;
  --high: #A94700;
  --yellow: #795500;
  --green: #087653;
  --blue: #1769A6;
}

html[data-theme="light"] body {
  background: var(--bg);
  color: var(--text);
}

html[data-theme="light"] .navbar {
  background: rgba(255,255,255,.92);
  border-bottom-color: var(--line);
}

html[data-theme="light"] .nav-link,
html[data-theme="light"] .icon-button,
html[data-theme="light"] .text-action {
  color: #465561;
}

html[data-theme="light"] .nav-link:hover,
html[data-theme="light"] .nav-link.active,
html[data-theme="light"] .icon-button:hover,
html[data-theme="light"] .icon-button.selected,
html[data-theme="light"] .profile-button:hover,
html[data-theme="light"] .profile-button.active {
  color: var(--text);
}

html[data-theme="light"] .brand-subtitle,
html[data-theme="light"] .nav-clock small,
html[data-theme="light"] .eyebrow,
html[data-theme="light"] .hero-eyebrow,
html[data-theme="light"] .stat-label,
html[data-theme="light"] .section-heading p,
html[data-theme="light"] .category-copy p,
html[data-theme="light"] .critical-header p,
html[data-theme="light"] .alert-summary span,
html[data-theme="light"] .timeline-content p,
html[data-theme="light"] .timeline-top time,
html[data-theme="light"] .timeline-bottom span,
html[data-theme="light"] .critical-metric p {
  color: var(--muted);
}

html[data-theme="light"] .nav-clock strong,
html[data-theme="light"] .brand-name,
html[data-theme="light"] h1,
html[data-theme="light"] h2,
html[data-theme="light"] h3,
html[data-theme="light"] h4,
html[data-theme="light"] .row-main strong,
html[data-theme="light"] .gas-row strong {
  color: var(--text);
}

html[data-theme="light"] .hero h1 em,
html[data-theme="light"] .analytics-hero h1 em,
html[data-theme="light"] .alerts-hero h1 em,
html[data-theme="light"] .intelligence-copy h2 span,
html[data-theme="light"] .critical-header h2 span {
  color: #4F5E6A;
}

html[data-theme="light"] .hero-meta,
html[data-theme="light"] .signal-list span,
html[data-theme="light"] .row-index,
html[data-theme="light"] .row-main span,
html[data-theme="light"] .row-time,
html[data-theme="light"] .row-coordinate,
html[data-theme="light"] .radar-coord,
html[data-theme="light"] .radar-label,
html[data-theme="light"] .chart-axis,
html[data-theme="light"] .chart-months,
html[data-theme="light"] .chart-range,
html[data-theme="light"] .ranking-row > span:not(.rank-number),
html[data-theme="light"] .critical-location,
html[data-theme="light"] .critical-event-risk span,
html[data-theme="light"] .critical-event-risk small,
html[data-theme="light"] .history-header,
html[data-theme="light"] .history-row > span:first-child,
html[data-theme="light"] .history-row .status-text,
html[data-theme="light"] .history-row > span:nth-child(4) {
  color: var(--text-faint);
}

html[data-theme="light"] .primary-action {
  color: var(--orange);
  background: rgba(198,59,13,.07);
  border-color: rgba(198,59,13,.5);
}

html[data-theme="light"] .primary-action span,
html[data-theme="light"] .view-all,
html[data-theme="light"] .count-label {
  color: var(--orange);
}

html[data-theme="light"] .stat-strip,
html[data-theme="light"] .category-section,
html[data-theme="light"] .critical-infrastructure,
html[data-theme="light"] .analytics-main,
html[data-theme="light"] .locations-section,
html[data-theme="light"] .risk-distribution,
html[data-theme="light"] .priority-section,
html[data-theme="light"] .why-alert,
html[data-theme="light"] .history-section,
html[data-theme="light"] .alert-summary {
  background: var(--bg2);
  border-color: var(--line);
}

html[data-theme="light"] .stat-divider,
html[data-theme="light"] .section-heading,
html[data-theme="light"] .category-intro,
html[data-theme="light"] .critical-header,
html[data-theme="light"] .critical-metric,
html[data-theme="light"] .ranking-row,
html[data-theme="light"] .timeline-item,
html[data-theme="light"] .history-table,
html[data-theme="light"] .search-results > button {
  border-color: var(--line);
}

html[data-theme="light"] .detection-row,
html[data-theme="light"] .mini-detection-list,
html[data-theme="light"] .analytics-filters,
html[data-theme="light"] .profile-panel,
html[data-theme="light"] .notification-panel,
html[data-theme="light"] .search-overlay {
  background: var(--panel);
  border-color: var(--control-border);
  box-shadow: 0 18px 55px rgba(17,24,32,.14);
}

html[data-theme="light"] .detection-row.expanded,
html[data-theme="light"] .detection-row-main:hover,
html[data-theme="light"] .notification-panel > button:hover,
html[data-theme="light"] .history-row:hover,
html[data-theme="light"] .search-results > button:hover {
  background: var(--panel-soft);
}

html[data-theme="light"] .row-gases .gas-panel,
html[data-theme="light"] .gas-panel,
html[data-theme="light"] .gasval-panel,
html[data-theme="light"] .ten-day-wrap {
  background: var(--panel-soft);
  border-color: var(--line);
}

html[data-theme="light"] .profile-panel-head span,
html[data-theme="light"] .profile-info span,
html[data-theme="light"] .profile-footer,
html[data-theme="light"] .profile-panel > button,
html[data-theme="light"] .notification-header span,
html[data-theme="light"] .notification-header small,
html[data-theme="light"] .notification-panel small,
html[data-theme="light"] .search-top,
html[data-theme="light"] .search-top button,
html[data-theme="light"] .search-hint,
html[data-theme="light"] .search-clear,
html[data-theme="light"] .search-results > button > span,
html[data-theme="light"] .search-results small,
html[data-theme="light"] .empty-search {
  color: var(--text-faint);
}

html[data-theme="light"] .profile-info strong,
html[data-theme="light"] .profile-panel-head strong,
html[data-theme="light"] .notification-panel strong,
html[data-theme="light"] .search-results strong,
html[data-theme="light"] .search-inner > .search-input-wrap input {
  color: var(--text);
}

html[data-theme="light"] .search-overlay {
  background: rgba(255,255,255,.98);
}

html[data-theme="light"] .search-input-wrap {
  border-bottom-color: var(--control-border);
}

html[data-theme="light"] .search-inner > .search-input-wrap input::placeholder {
  color: #74818C;
}

html[data-theme="light"] .analytics-filters select,
html[data-theme="light"] .date-row input {
  color: var(--text-soft);
  background: var(--panel-soft);
  border-color: var(--control-border);
  color-scheme: light;
}

html[data-theme="light"] .chart-grid,
html[data-theme="light"] .bar,
html[data-theme="light"] .risk-bar {
  stroke: var(--line);
  background: var(--line-soft);
}

html[data-theme="light"] .chart-tooltip {
  color: var(--text);
  background: var(--panel);
  border-color: var(--control-border);
  box-shadow: 0 10px 30px rgba(17,24,32,.12);
}

html[data-theme="light"] .classification-top,
html[data-theme="light"] .why-content div,
html[data-theme="light"] .timeline-bottom b {
  color: var(--text-soft);
}

html[data-theme="light"] .filter-rail,
html[data-theme="light"] .map-title,
html[data-theme="light"] .map-overlay-controls button,
html[data-theme="light"] .map-legend,
html[data-theme="light"] .map-status,
html[data-theme="light"] .satellite-indicator,
html[data-theme="light"] .mobile-filter-trigger,
html[data-theme="light"] .map-popup-panel {
  color: var(--text-soft);
  background: var(--panel);
  border-color: var(--control-border);
  box-shadow: 0 14px 45px rgba(17,24,32,.12);
}

html[data-theme="light"] .leaflet-map {
  background: var(--map-fallback);
}

html[data-theme="light"] .rail-heading h3,
html[data-theme="light"] .map-title h1,
html[data-theme="light"] .filter-group > label:first-child,
html[data-theme="light"] .reset-button,
html[data-theme="light"] .rail-action,
html[data-theme="light"] .showing span,
html[data-theme="light"] .showing small,
html[data-theme="light"] .map-title p,
html[data-theme="light"] .map-legend,
html[data-theme="light"] .map-status,
html[data-theme="light"] .map-coordinates,
html[data-theme="light"] .satellite-indicator {
  color: var(--text-soft);
}

html[data-theme="light"] .filter-rail {
  box-shadow: none;
}

html[data-theme="light"] .check-row {
  color: var(--text-soft) !important;
}

html[data-theme="light"] .fw-tooltip {
  color: var(--text-soft) !important;
  background: var(--panel) !important;
  border-color: var(--control-border) !important;
  box-shadow: 0 12px 35px rgba(17,24,32,.16) !important;
}

html[data-theme="light"] .fw-tooltip::before {
  border-top-color: var(--control-border) !important;
}

html[data-theme="light"] .fw-tt-head,
html[data-theme="light"] .fw-tt-trend {
  border-color: var(--line);
}

html[data-theme="light"] .fw-tt-head strong,
html[data-theme="light"] .fw-tt-row b {
  color: var(--text);
}

html[data-theme="light"] .fw-tt-head span,
html[data-theme="light"] .fw-tt-row span,
html[data-theme="light"] .fw-tt-trend {
  color: var(--text-faint) !important;
}

html[data-theme="light"] .leaflet-control-attribution {
  color: #4D5963 !important;
  background: rgba(255,255,255,.82) !important;
}

html[data-theme="light"] .leaflet-control-attribution a {
  color: #1F5E91 !important;
}

html[data-theme="light"] .map-popup-panel h2,
html[data-theme="light"] .thermal-popup-head h2,
html[data-theme="light"] .popup-close,
html[data-theme="light"] .thermal-stats,
html[data-theme="light"] .thermal-view,
html[data-theme="light"] .thermal-meta-row strong,
html[data-theme="light"] .thermal-desc p {
  color: var(--text);
}

html[data-theme="light"] .thermal-popup-head,
html[data-theme="light"] .thermal-stats {
  border-color: var(--line);
}

html[data-theme="light"] .ten-day-head span,
html[data-theme="light"] .ten-day-col span,
html[data-theme="light"] .ten-day-stats small,
html[data-theme="light"] .ten-day-stats,
html[data-theme="light"] .gasval-head,
html[data-theme="light"] .gasval-row,
html[data-theme="light"] .gas-row,
html[data-theme="light"] .gas-row.gas-head,
html[data-theme="light"] .thermal-desc small {
  color: var(--text-faint);
  border-color: var(--line);
}

html[data-theme="light"] .ten-day-stats strong,
html[data-theme="light"] .gasval-row b,
html[data-theme="light"] .ten-day-head b,
html[data-theme="light"] .ten-day-stats strong {
  color: var(--text) !important;
}

html[data-theme="light"] .thermal-risk {
  color: var(--text-soft) !important;
}

html[data-theme="light"] .thermal-map-footer {
  color: var(--text-faint);
  background: var(--panel-soft);
  border-color: var(--line);
}

html[data-theme="light"] .row-risk {
  color: var(--text-soft) !important;
}

html[data-theme="light"] .theme-toggle {
  color: var(--text);
}

html[data-theme="light"] .loading-status {
  color: var(--text-soft);
}

@media (prefers-reduced-motion: no-preference) {
  html[data-theme="light"] .navbar,
  html[data-theme="light"] .profile-panel,
  html[data-theme="light"] .notification-panel,
  html[data-theme="light"] .map-popup-panel,
  html[data-theme="light"] .map-title,
  html[data-theme="light"] .map-overlay-controls button,
  html[data-theme="light"] .map-legend,
  html[data-theme="light"] .map-status {
    transition: background-color .2s ease, border-color .2s ease, color .2s ease;
  }
}

html[data-theme="dark"] .app-logo {
  filter: invert(1);
}

      `}</style>

      {loading && (
        <LoadingScreen
          onComplete={() =>
            setLoading(false)
          }
        />
      )}

      {!loading && (
        <>
          <Navbar
            page={page}
            setPage={navigate}
            onSearch={openSearch}
            onNotifications={
              openNotifications
            }
            notificationOpen={
              notificationOpen
            }
            theme={theme}
            onToggleTheme={toggleTheme}
            onProfile={openProfile}
            profileOpen={
              profileOpen
            }
          />

          {page === "Dashboard" && (
            <Dashboard
              setPage={navigate}
              setSelectedDetection={
                setSelectedDetection
              }
              onGotoMap={goToMapWithDetection}
            />
          )}

          {page === "Maps" && (
            <Maps
              selectedDetection={
                selectedDetection
              }
              setSelectedDetection={
                setSelectedDetection
              }
              theme={theme}
            />
          )}

          {page === "Analytics" && (
            <Analytics />
          )}

          {page === "Alerts" && (
            <Alerts
              setSelectedDetection={
                setSelectedDetection
              }
            />
          )}

          {searchOpen && (
            <SearchOverlay
              onClose={() =>
                setSearchOpen(false)
              }
              setPage={navigate}
              setSelectedDetection={
                setSelectedDetection
              }
            />
          )}

          {notificationOpen && (
            <NotificationPanel
              setSelectedDetection={
                setSelectedDetection
              }
              setPage={navigate}
              onClose={() =>
                setNotificationOpen(
                  false
                )
              }
            />
          )}

          {profileOpen && (
            <ProfilePanel
              onClose={() =>
                setProfileOpen(false)
              }
              setPage={navigate}
            />
          )}
        </>
      )}
    </LiveDataProvider>
  );
}

export default App;