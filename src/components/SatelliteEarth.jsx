import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./SatelliteEarth.css";

/* =========================================================
   SATELLITE EARTH — REALISTIC 3D ORBITAL VISUALIZATION
   Uses raw Three.js with mathematical Keplerian orbit,
   high-detail procedural satellite (GLB fallback),
   and India-centered initial Earth view.
   Rotation is based on the system/display time.
========================================================= */

// ---------- ORBITAL CONSTANTS ----------
const ORBIT_RADIUS = 4.5;           // distance from Earth center (LEO orbit)
const ORBIT_INCLINATION = 45 * (Math.PI / 180); // 45° inclination
const ORBIT_RAAN = 30 * (Math.PI / 180);        // longitude of ascending node
const EARTH_RADIUS = 2.65;           // Centered and properly proportioned Earth (fully visible)

// ---------- UTILITY: Solar Cell Grid Texture ----------
function createSolarCellTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0a1a3c";
  ctx.fillRect(0, 0, 512, 1024);

  const cols = 4;
  const rows = 16;
  const padX = 8;
  const padY = 5;
  const cellW = (512 - padX * (cols + 1)) / cols;
  const cellH = (1024 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padX + c * (cellW + padX);
      const y = padY + r * (cellH + padY);

      const cellGrad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
      cellGrad.addColorStop(0, "#3a5fbf");
      cellGrad.addColorStop(0.35, "#1f3f96");
      cellGrad.addColorStop(0.65, "#152c74");
      cellGrad.addColorStop(1, "#0d1e54");
      ctx.fillStyle = cellGrad;
      ctx.fillRect(x, y, cellW, cellH);

      const gloss = ctx.createLinearGradient(x, y, x + cellW * 0.5, y + cellH * 0.5);
      gloss.addColorStop(0, "rgba(160, 200, 255, 0.28)");
      gloss.addColorStop(1, "rgba(160, 200, 255, 0)");
      ctx.fillStyle = gloss;
      ctx.fillRect(x, y, cellW, cellH);

      ctx.strokeStyle = "rgba(200, 220, 255, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, cellW, cellH);

      ctx.strokeStyle = "rgba(210, 230, 255, 0.35)";
      ctx.lineWidth = 0.6;
      for (let g = 1; g < 5; g++) {
        const gx = x + (cellW / 5) * g;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + cellH);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(235, 245, 255, 0.85)";
      ctx.fillRect(x + cellW / 2 - 0.9, y, 1.8, cellH);
      ctx.fillRect(x + cellW * 0.18, y, 1, cellH);
      ctx.fillRect(x + cellW * 0.82, y, 1, cellH);

      ctx.strokeStyle = "rgba(200, 220, 255, 0.20)";
      ctx.lineWidth = 0.5;
      for (let t = 1; t < 3; t++) {
        ctx.beginPath();
        ctx.moveTo(x, y + (cellH / 3) * t);
        ctx.lineTo(x + cellW, y + (cellH / 3) * t);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- UTILITY: Gold MLI Foil Texture ----------
function createGoldMliTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 512, 512);
  base.addColorStop(0, "#b8862e");
  base.addColorStop(0.5, "#8a611c");
  base.addColorStop(1, "#c4932f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(255, 214, 110, ${0.02 + Math.random() * 0.09})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(130, y + (Math.random() - 0.5) * 26, 380, y + (Math.random() - 0.5) * 26, 512, y + (Math.random() - 0.5) * 34);
    ctx.stroke();
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    ctx.strokeStyle = `rgba(64, 42, 10, ${0.02 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.7 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 30, 256, x + (Math.random() - 0.5) * 30, 512);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(40, 26, 6, 0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, 464, 464);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- UTILITY: White Panel Texture ----------
function createWhitePanelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#eef1f4";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(215, 220, 226, 0.25)" : "rgba(240, 244, 248, 0.25)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  ctx.strokeStyle = "rgba(180, 190, 200, 0.18)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= 256; x += 16) { ctx.moveTo(x, 0); ctx.lineTo(x, 256); }
  for (let y = 0; y <= 256; y += 16) { ctx.moveTo(0, y); ctx.lineTo(256, y); }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- UTILITY: Environment (Reflection Lighting) ----------
function createEnvTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, "#02060c");
  bg.addColorStop(0.5, "#0a1220");
  bg.addColorStop(1, "#02040a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  const key = ctx.createRadialGradient(760, 130, 0, 760, 130, 300);
  key.addColorStop(0, "rgba(255, 240, 220, 0.9)");
  key.addColorStop(0.4, "rgba(255, 220, 180, 0.35)");
  key.addColorStop(1, "rgba(255, 220, 180, 0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, 1024, 512);

  const fill = ctx.createRadialGradient(200, 380, 0, 200, 380, 260);
  fill.addColorStop(0, "rgba(120, 170, 255, 0.25)");
  fill.addColorStop(1, "rgba(120, 170, 255, 0)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

// ---------- BUILD PROCEDURAL SATELLITE ----------
// A realistic Earth-observation satellite (INSAT-3DR style) built
// entirely from procedural geometry, canvas textures and PBR materials.
function buildProceduralSatellite() {
  const satelliteGroup = new THREE.Group();

  // --- Materials (PBR) ---
  const goldFoilTexture = createGoldMliTexture();
  const whitePanelTexture = createWhitePanelTexture();

  const silverMetallic = new THREE.MeshPhysicalMaterial({
    color: 0xe8eff6,
    metalness: 0.94,
    roughness: 0.14,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2
  });
  const darkComposite = new THREE.MeshPhysicalMaterial({
    color: 0x181e26,
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 0.15
  });
  const goldFoil = new THREE.MeshPhysicalMaterial({
    map: goldFoilTexture,
    color: 0xd4af37,
    metalness: 0.82,
    roughness: 0.38,
    emissive: 0x2a1d00,
    emissiveIntensity: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4
  });

  const solarTexture = createSolarCellTexture();
  const solarWingMat = new THREE.MeshStandardMaterial({
    map: solarTexture,
    metalness: 0.8,
    roughness: 0.18,
    side: THREE.DoubleSide
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x9aa8b8,
    metalness: 0.9,
    roughness: 0.28
  });
  const whitePaint = new THREE.MeshPhysicalMaterial({
    map: whitePanelTexture,
    color: 0xf0f2f5,
    metalness: 0.25,
    roughness: 0.42,
    clearcoat: 0.15,
    clearcoatRoughness: 0.5
  });
  const carbonFiber = new THREE.MeshPhysicalMaterial({
    color: 0x0c0f14,
    metalness: 0.6,
    roughness: 0.35,
    clearcoat: 0.05
  });

  // ============================================================
  // MAIN BUS — box-type satellite body
  // ------------------------------------------------------------
  const mainBody = new THREE.Group();

  // Central spacecraft box (gold MLI covered)
  const busBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.52, 0.5),
    goldFoil
  );
  mainBody.add(busBox);

  // White instrument deck on the +Z (front) face
  const deckPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.045),
    whitePaint
  );
  deckPlate.position.set(0, 0.06, 0.273);
  mainBody.add(deckPlate);

  // Carbon bay on the -Z (rear) face
  const rearPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.52, 0.03),
    carbonFiber
  );
  rearPlate.position.z = -0.265;
  mainBody.add(rearPlate);

  // Panel seam strips (detail lines on the bus)
  for (let i = -2; i <= 2; i++) {
    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.52, 0.5),
      frameMat
    );
    seam.position.set(i * 0.12, 0, 0);
    mainBody.add(seam);
  }

  // Sun deck (top face) — antenna mounting area
  const sunDeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.03, 0.5),
    whitePaint
  );
  sunDeck.position.y = 0.275;
  mainBody.add(sunDeck);

  // Bottom panel
  const bottomPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.03, 0.5),
    whitePaint
  );
  bottomPlate.position.y = -0.275;
  mainBody.add(bottomPlate);

  // ============================================================
  // DEPLOYABLE PARABOLIC DISH ANTENNA (communications, front)
  // ------------------------------------------------------------
  const dishGroup = new THREE.Group();

  const dishGeo = new THREE.SphereGeometry(0.24, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const dishMesh = new THREE.Mesh(dishGeo, whitePaint);
  dishGroup.add(dishMesh);

  // Dish rim rings
  for (let i = 0; i < 3; i++) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.235 - i * 0.006, 0.005, 6, 48),
      frameMat
    );
    rim.rotation.x = Math.PI / 2;
    dishGroup.add(rim);
  }

  // Feed horn (gold, front-center)
  const feedHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.024, 0.14, 12),
    silverMetallic
  );
  feedHorn.position.set(0, -0.08, 0.02);
  feedHorn.rotation.x = -Math.PI / 2;
  dishGroup.add(feedHorn);

  const feedCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.03, 12),
    goldFoil
  );
  feedCap.position.set(0, -0.145, 0.02);
  feedCap.rotation.x = -Math.PI / 2;
  dishGroup.add(feedCap);

  // Sub-reflector
  const subReflector = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 12, 12),
    goldFoil
  );
  subReflector.position.set(0, -0.12, 0.1);
  dishGroup.add(subReflector);

  // Feed support struts
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.16, 4),
      frameMat
    );
    strut.position.set(
      Math.cos(angle) * 0.1,
      -0.14,
      Math.sin(angle) * 0.1
    );
    strut.rotation.z = Math.cos(angle) * 0.4;
    strut.rotation.x = Math.sin(angle) * 0.4;
    dishGroup.add(strut);
  }

  dishGroup.position.set(0, 0.1, 0.42);
  dishGroup.rotation.set(-0.2, 0, 0);
  mainBody.add(dishGroup);

  // ============================================================
  // SOLAR ARRAY WINGS (deployed, front & back faces)
  // ------------------------------------------------------------
  const createSolarArray = (isTop) => {
    const wing = new THREE.Group();
    const dir = isTop ? 1 : -1;

    // Solar array drive (yoke / gimbal)
    const yoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.1, 10),
      silverMetallic
    );
    yoke.rotation.z = Math.PI / 2;
    yoke.position.set(0.19, 0.2 * dir, 0);
    wing.add(yoke);

    // Deployment boom
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8),
      frameMat
    );
    boom.rotation.z = Math.PI / 2;
    boom.position.set(0.19 + 0.21, 0.2 * dir, 0);
    wing.add(boom);

    const panelY = (0.2 + 0.42 + 0.36 + 0.47) * dir;

    // Panel honeycomb frame (structural base)
    const honeycomb = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.72, 0.94),
      carbonFiber
    );
    honeycomb.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY, 0);
    wing.add(honeycomb);

    // Panel frame rails on both sides
    const frameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.74, 0.02),
      frameMat
    );
    frameLeft.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY, -0.47);
    wing.add(frameLeft);

    const frameRight = frameLeft.clone();
    frameRight.position.z = 0.47;
    wing.add(frameRight);

    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.02, 0.94),
      frameMat
    );
    frameTop.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY + 0.36, 0);
    wing.add(frameTop);

    const frameBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.02, 0.94),
      frameMat
    );
    frameBottom.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY - 0.36, 0);
    wing.add(frameBottom);

    // Solar cell surfaces (front & back of the panel)
    const cellSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.72),
      solarWingMat
    );
    cellSurface.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY, 0.475);
    cellSurface.rotation.y = Math.PI / 2;
    wing.add(cellSurface);

    const cellBack = new THREE.Mesh(
      new THREE.PlaneGeometry(0.03, 0.72),
      solarWingMat
    );
    cellBack.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY, -0.475);
    cellBack.rotation.y = Math.PI / 2;
    wing.add(cellBack);

    // Cross-brace members between rails
    for (let s = -2; s <= 2; s++) {
      if (s === 0) continue;
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.012, 0.94),
        frameMat
      );
      brace.position.set(0.19 + 0.42 + 0.36 + 0.47, panelY + s * 0.2, 0);
      wing.add(brace);
    }

    // Hinge joint connecting wing to bus
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.07, 10),
      silverMetallic
    );
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0.19, 0.2 * dir, 0);
    wing.add(hinge);

    return wing;
  };

  mainBody.add(createSolarArray(true));
  mainBody.add(createSolarArray(false));

  // ============================================================
  // SENSOR PAYLOAD (optical aperture on the front face)
  // ------------------------------------------------------------
  const sensorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.16, 24),
    darkComposite
  );
  sensorHousing.position.set(0.12, 0.1, 0.28);
  sensorHousing.rotation.x = Math.PI / 2;
  mainBody.add(sensorHousing);

  // Lens aperture (reflective glass look via clearcoat)
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.02, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0x0a1220,
      metalness: 0.1,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: 0x16304f,
      emissiveIntensity: 0.6
    })
  );
  lens.position.set(0.12, 0.1, 0.365);
  lens.rotation.x = Math.PI / 2;
  mainBody.add(lens);

  const lensRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.046, 0.005, 8, 24),
    goldFoil
  );
  lensRing.position.set(0.12, 0.1, 0.36);
  lensRing.rotation.x = Math.PI / 2;
  mainBody.add(lensRing);

  // Secondary star tracker (darker, on the front payload deck)
  const starTracker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.03, 0.1, 16),
    carbonFiber
  );
  starTracker.position.set(-0.14, 0.1, 0.3);
  starTracker.rotation.x = Math.PI / 2;
  mainBody.add(starTracker);

  const trackerLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0x0a1220,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: 0x16304f,
      emissiveIntensity: 0.5
    })
  );
  trackerLens.position.set(-0.14, 0.1, 0.356);
  trackerLens.rotation.x = Math.PI / 2;
  mainBody.add(trackerLens);

  // ============================================================
  // THRUSTER CLUSTER (rear -Z face)
  // ------------------------------------------------------------
  const thruster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.045, 0.1, 16),
    darkComposite
  );
  thruster.position.set(0, 0, -0.32);
  thruster.rotation.x = Math.PI / 2;
  mainBody.add(thruster);

  const thrusterNozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.07, 0.06, 16),
    goldFoil
  );
  thrusterNozzle.position.set(0, 0, -0.39);
  thrusterNozzle.rotation.x = Math.PI / 2;
  mainBody.add(thrusterNozzle);

  // Four small attitude control thrusters
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI * 2) / 4;
    const sideThruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.022, 0.05, 10),
      silverMetallic
    );
    sideThruster.position.set(
      Math.cos(angle) * 0.18,
      Math.sin(angle) * 0.18,
      -0.32
    );
    sideThruster.rotation.x = Math.PI / 2;
    mainBody.add(sideThruster);
  }

  // ============================================================
  // ANTENNA BOOMS & DETAILS
  // ------------------------------------------------------------
  // Top mounting boom with antenna tip
  const antBoom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.34, 8),
    frameMat
  );
  antBoom.position.set(-0.24, 0.44, 0);
  mainBody.add(antBoom);

  const antTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    silverMetallic
  );
  antTip.position.set(-0.24, 0.61, 0);
  mainBody.add(antTip);

  // Side omni antenna sweep
  const sideAntenna = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.09, 14),
    whitePaint
  );
  sideAntenna.rotation.x = -Math.PI / 2;
  sideAntenna.position.set(-0.42, 0.24, 0.22);
  mainBody.add(sideAntenna);

  // Deployment wires / cables on the rear face
  for (let i = 0; i < 3; i++) {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4),
      frameMat
    );
    cable.position.set((i - 1) * 0.1, 0, -0.265);
    mainBody.add(cable);
  }

  satelliteGroup.add(mainBody);

  // Store materials for disposal
  satelliteGroup.userData.disposables = [
    silverMetallic, darkComposite, goldFoil, solarWingMat,
    frameMat, whitePaint, carbonFiber, solarTexture,
    goldFoilTexture, whitePanelTexture,
    lens.material, trackerLens.material
  ];

  return satelliteGroup;
}

// ---------- COMPUTE ORBITAL POSITION ----------
function getOrbitalPosition(theta, earthPos) {
  // Keplerian orbital mechanics — inclined orbit
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosI = Math.cos(ORBIT_INCLINATION);
  const sinI = Math.sin(ORBIT_INCLINATION);
  const cosO = Math.cos(ORBIT_RAAN);
  const sinO = Math.sin(ORBIT_RAAN);

  const x = ORBIT_RADIUS * (cosO * cosT - sinO * sinT * cosI);
  const y = ORBIT_RADIUS * sinT * sinI;
  const z = ORBIT_RADIUS * (sinO * cosT + cosO * sinT * cosI);

  return new THREE.Vector3(
    x + earthPos.x,
    y + earthPos.y,
    z + earthPos.z
  );
}

// ---------- COMPUTE ORBITAL VELOCITY (tangent) ----------
function getOrbitalVelocity(theta, earthPos) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosI = Math.cos(ORBIT_INCLINATION);
  const sinI = Math.sin(ORBIT_INCLINATION);
  const cosO = Math.cos(ORBIT_RAAN);
  const sinO = Math.sin(ORBIT_RAAN);

  // dPosition/dTheta
  const dx = ORBIT_RADIUS * (-cosO * sinT - sinO * cosT * cosI);
  const dy = ORBIT_RADIUS * cosT * sinI;
  const dz = ORBIT_RADIUS * (-sinO * sinT + cosO * cosT * cosI);

  return new THREE.Vector3(dx, dy, dz).normalize();
}

// ---------- CREATE ORBIT TRAIL ----------
function createOrbitTrail(earthPos) {
  const points = [];
  const segments = 256;

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(getOrbitalPosition(theta, earthPos));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x3366aa,
    transparent: true,
    opacity: 0.10,
    depthWrite: false
  });

  return { line: new THREE.Line(geometry, material), geometry, material };
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function SatelliteEarth() {
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    let isDisposed = false;

    // ---- SCENE ----
    const scene = new THREE.Scene();
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 560;

    // Adjust camera position (Z=11.5) to keep the entire Earth fully visible, centered, and not cropped
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 0, 11.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Completely transparent to let the page background show through
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ---- ENVIRONMENT MAP (realistic metallic reflections on the satellite) ----
    let envRT = null;
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      envRT = pmremGenerator.fromEquirectangular(createEnvTexture());
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.7;
    } catch (e) {
      scene.environment = null;
    }

    // ---- LIGHTING ----
    const sunLight = new THREE.DirectionalLight(0xfffbf0, 3.6);
    sunLight.position.set(-8, 6, 6);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0c1626, 0.95);
    scene.add(ambientLight);

    const spaceFill = new THREE.DirectionalLight(0x163458, 0.7);
    spaceFill.position.set(6, -2, -4);
    scene.add(spaceFill);

    // Key light that follows the satellite
    const satKeyLight = new THREE.PointLight(0xfff6ea, 2.2, 12);
    scene.add(satKeyLight);

    // ---- SUN FLARE (Removed for dashboard integration) ----
    // Sun sprite is not added to the scene as requested

    // ---- EARTH GROUP ----
    const earthGroup = new THREE.Group();
    // Center Earth horizontally (X=0) and vertically (Y=0) so that the entire globe and orbit are 100% visible
    const earthPosition = new THREE.Vector3(0, 0, 0);
    earthGroup.position.copy(earthPosition);

    // Axial tilt ~23.4°
    earthGroup.rotation.z = -23.4 * (Math.PI / 180);

    // Initial orientation: India front and center
    const baseRotationY = 2.86;
    earthGroup.rotation.y = baseRotationY;
    earthGroup.rotation.x = 0.26;
    scene.add(earthGroup);

    // ---- TEXTURES ----
    const textureLoader = new THREE.TextureLoader();

    const dayMap = textureLoader.load("/textures/earth_day.jpg", () => {
      if (!isDisposed) setIsLoaded(true);
    });
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;

    const normalMap = textureLoader.load("/textures/earth_normal.jpg");
    const specularMap = textureLoader.load("/textures/earth_specular.jpg");
    const cloudsMap = textureLoader.load("/textures/earth_clouds.png");
    const nightMap = textureLoader.load("/textures/earth_lights.png");
    nightMap.colorSpace = THREE.SRGBColorSpace;

    // ---- EARTH MESH ----
    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: dayMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: specularMap,
      roughness: 0.55,
      metalness: 0.08
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // ---- NIGHT LIGHTS ----
    const nightMaterial = new THREE.MeshBasicMaterial({
      map: nightMap,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.65
    });
    const nightGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.003, 48, 48);
    const nightMesh = new THREE.Mesh(nightGeometry, nightMaterial);
    earthGroup.add(nightMesh);

    // ---- CLOUDS ----
    const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.035, 48, 48);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending,
      depthWrite: false,
      roughness: 0.95
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(cloudMesh);

    // ---- ATMOSPHERE (Removed to avoid any artificial blue border around the Earth) ----
    // Atmosphere mesh is not added to the scene as requested

    // ---- ORBIT TRAIL (Removed to keep the orbital environment clean and realistic) ----
    const orbitTrail = createOrbitTrail(earthPosition);
    // Orbit line is not added to the scene as requested

    // ---- STARFIELD ----
    const starCount = 600;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
      starSizes[i] = 0.08 + Math.random() * 0.12;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xdae6f2,
      size: 0.14,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // ---- SATELLITE ----
    let satelliteGroup = null;
    let satelliteDisposables = [];

    // Try loading GLB first, fall back to procedural
    const loadSatellite = async () => {
      try {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();

        loader.load(
          "/models/satellite.glb",
          (gltf) => {
            if (isDisposed) return;
            satelliteGroup = gltf.scene;
            const box = new THREE.Box3().setFromObject(satelliteGroup);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 0.6;
            const scaleFactor = targetSize / maxDim;
            satelliteGroup.scale.setScalar(scaleFactor);

            satelliteGroup.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.envMapIntensity = 0.5;
                }
              }
            });

            positionSatellite(satelliteGroup);
            scene.add(satelliteGroup);
          },
          undefined,
          (error) => {
            if (isDisposed) return;
            satelliteGroup = buildProceduralSatellite();
            satelliteGroup.scale.set(0.85, 0.85, 0.85);
            satelliteDisposables = satelliteGroup.userData.disposables || [];
            positionSatellite(satelliteGroup);
            scene.add(satelliteGroup);
          }
        );
      } catch (e) {
        if (isDisposed) return;
        satelliteGroup = buildProceduralSatellite();
        satelliteGroup.scale.set(0.85, 0.85, 0.85);
        satelliteDisposables = satelliteGroup.userData.disposables || [];
        positionSatellite(satelliteGroup);
        scene.add(satelliteGroup);
      }
    };

    const positionSatellite = (group) => {
      const theta = ((Date.now() * 0.001) * (Math.PI * 2) / 45) % (Math.PI * 2);
      const pos = getOrbitalPosition(theta, earthPosition);
      group.position.copy(pos);
      const velocity = getOrbitalVelocity(theta, earthPosition);
      const lookTarget = new THREE.Vector3().copy(pos).add(velocity);
      const rotMatrix = new THREE.Matrix4();
      rotMatrix.lookAt(pos, lookTarget, new THREE.Vector3(0, 1, 0));
      group.quaternion.setFromRotationMatrix(rotMatrix);
    };

    loadSatellite();

    // ---- ANIMATION LOOP ----
    const targetQuat = new THREE.Quaternion();
    const upVector = new THREE.Vector3(0, 1, 0);

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      // Compute time factors directly from Date.now() system clock time
      const timeMs = Date.now();
      const timeSec = timeMs * 0.001;

      // Earth rotation based on current system time (smooth and synchronized)
      // One full rotation every 360 seconds (sped up slightly so rotation is beautiful but based on the clock)
      const earthAngle = (timeSec * (Math.PI * 2) / 360) % (Math.PI * 2);
      earthMesh.rotation.y = baseRotationY + earthAngle;
      nightMesh.rotation.y = baseRotationY + earthAngle;

      // Clouds rotate slightly faster to look dynamic
      cloudMesh.rotation.y = baseRotationY + earthAngle * 1.25;

      // Satellite orbit path is also based on the system clock time
      // One complete orbit every 45 seconds
      const orbitTheta = (timeSec * (Math.PI * 2) / 45) % (Math.PI * 2);

      if (satelliteGroup) {
        const newPos = getOrbitalPosition(orbitTheta, earthPosition);
        satelliteGroup.position.copy(newPos);

        const velocity = getOrbitalVelocity(orbitTheta, earthPosition);
        const lookTarget = new THREE.Vector3().copy(newPos).add(velocity);

        const rotMatrix = new THREE.Matrix4();
        rotMatrix.lookAt(newPos, lookTarget, upVector);
        targetQuat.setFromRotationMatrix(rotMatrix);

        // Smooth interpolation for orientation
        satelliteGroup.quaternion.slerp(targetQuat, 0.15);

        // Update key light to follow satellite
        satKeyLight.position.set(
          newPos.x - 1.5,
          newPos.y + 1.5,
          newPos.z + 3.0
        );
      }

      // Starfield subtle motion
      starField.rotation.y = timeSec * 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // ---- RESIZE ----
    const handleResize = () => {
      if (!container || isDisposed) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ---- CLEANUP ----
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      // Dispose geometries & materials
      earthGeometry.dispose();
      earthMaterial.dispose();
      nightGeometry.dispose();
      nightMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      orbitTrail.geometry.dispose();
      orbitTrail.material.dispose();

      if (envRT) envRT.dispose();
      scene.environment = null;

      // Dispose satellite materials
      satelliteDisposables.forEach((d) => {
        if (d && d.dispose) d.dispose();
      });

      if (satelliteGroup) {
        satelliteGroup.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="satellite-earth-container" ref={containerRef}>
      {!isLoaded && (
        <div className="satellite-earth-fallback">
          <div className="earth-fallback-orb" />
          <span className="earth-fallback-label">INITIALIZING 3D ORBITAL FEED...</span>
        </div>
      )}
      <div className="earth-live-tag">
        <span className="live-pulse" />
        <span>INSAT-3DR · LEO ORBIT TRACK</span>
      </div>
    </div>
  );
}
