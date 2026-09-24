import React, { createContext, useContext, useMemo, useState } from "react";
import FIRMS_SNAPSHOT from "./data/firms-india-latest.json";

const LiveDataContext = createContext(null);

const TYPE_KEYS = ["Industrial", "GasFlare", "Agricultural", "Mining", "Wildfire"];
const RISK_KEYS = ["Critical", "High", "Medium", "Low"];
const CONFIDENCE_SCORE = { l: 50, n: 75, h: 95 };

const detections = FIRMS_SNAPSHOT.detections.map((detection) => ({
  ...detection,
  confidenceScore: CONFIDENCE_SCORE[detection.detectionConfidence] || 75
}));

const averageConfidence = Math.round(
  detections.reduce((sum, detection) => sum + detection.confidenceScore, 0) /
    (detections.length || 1)
);

const locationCounts = detections.reduce((counts, detection) => {
  const name = detection.contextName || detection.region;
  counts.set(name, (counts.get(name) || 0) + 1);
  return counts;
}, new Map());

const topLocations = [...locationCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([name, count], index) => {
    const locationDetections = detections.filter(
      (detection) => (detection.contextName || detection.region) === name
    );
    const highestRisk = locationDetections.reduce((current, detection) => {
      const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return order[detection.risk] > order[current] ? detection.risk : current;
    }, "Low");
    return [
      String(index + 1).padStart(2, "0"),
      name,
      `${String(count).padStart(2, "0")} EVENTS`,
      highestRisk.toUpperCase()
    ];
  });

const topDetection =
  [...detections].sort((a, b) => {
    const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return order[b.risk] - order[a.risk] || (b.frp || 0) - (a.frp || 0);
  })[0] || null;

export function LiveDataProvider({ children }) {
  const [overrides, setOverrides] = useState([]);
  const currentDetections = useMemo(() => [...detections, ...overrides], [overrides]);
  const currentCountByType = useMemo(
    () =>
      Object.fromEntries(
        TYPE_KEYS.map((type) => [
          type,
          currentDetections.filter((detection) => detection.type === type).length
        ])
      ),
    [currentDetections]
  );
  const currentCountByRisk = useMemo(
    () =>
      Object.fromEntries(
        RISK_KEYS.map((risk) => [
          risk,
          currentDetections.filter((detection) => detection.risk === risk).length
        ])
      ),
    [currentDetections]
  );

  const value = {
    DETECTIONS: currentDetections,
    TOTAL_DETECTIONS: currentDetections.length,
    AVG_CONFIDENCE: averageConfidence,
    COUNT_BY_TYPE: currentCountByType,
    COUNT_BY_RISK: currentCountByRisk,
    TOP_LOCATIONS: topLocations,
    TOP_DETECTION: topDetection || currentDetections[0] || null,
    FIRMS_METADATA: FIRMS_SNAPSHOT.metadata,
    setDetections: setOverrides
  };

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData() {
  const context = useContext(LiveDataContext);
  if (!context) throw new Error("useLiveData must be used within a LiveDataProvider");
  return context;
}
