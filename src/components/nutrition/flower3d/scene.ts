import * as THREE from "three";

import { POUR_DURATION_MS, qualityForFrameTime, type WaterScene } from "../waterBloomScene";
import {
  clamp01,
  dropletCountForDelta,
  levelForProgress,
  pixelRatioForQuality,
  pourDeltaFor,
  ringOpenFor,
  smooth01,
} from "./mapping";
import { createPetalGeometry, updatePetal, type PetalShape } from "./petal";

/**
 * Water the Bloom, in 3D — Bloom's own flower (M-163).
 *
 * An original Three.js scene, built for this panel: a procedurally
 * grown flower — four petal rings over a gold heart, sepals, a stem
 * with two leaves — standing in a glass vessel of the day's water.
 * (The owner-supplied animation file was read for technique only;
 * no part of its scene is used. The flower, the vessel, the water
 * and every line of this scene are Bloom's.)
 *
 * The day drives it, through the same contract the 2D painter
 * speaks (setProgress + destroy, handed over by waterBloomSceneAuto):
 *   · openness is CONTINUOUS — a spring carries the displayed bloom
 *     toward the day's progress, and each ring unfurls across its
 *     own stretch of that spring, outer ring first, heart last, so
 *     the stage words the panel speaks (bud → opening → half → full)
 *     mean the same thing here as on the painted flower;
 *   · the water level is the same progress inside the glass
 *     (mapping.levelForProgress);
 *   · a log pours: droplets fall into the vessel over the pour the
 *     2D scene timed (POUR_DURATION_MS), each landing ripple walks
 *     the bloom toward its new opening, and the flower answers with
 *     one lift-and-sway — pour, water and bloom as one moment.
 *
 * Palette is the house tokens and nothing else: cream petals warmed
 * to gold-soft at the throat with the faintest rose at the tip's
 * edge, sage stem and leaves, a gold heart and rim, Bloom's water
 * (deep teal → sage → pale) in the glass, all of it over the ink
 * panel. Light is one warm key with a soft hemisphere fill — no
 * shadow maps; a painted contact shadow grounds the vessel.
 *
 * Smooth contract (owner: heavy animation, but smooth): one rAF
 * loop, delta-time; pixel ratio capped at 2 and stepped down under
 * sustained slow frames by the step rule both scenes share
 * (qualityForFrameTime), shedding resolution, then bubbles and
 * motes; the loop pauses offscreen and when the tab hides; reduced
 * motion never starts it — the flower renders still, at the day's
 * true opening. A lost WebGL context calls onFail and the auto-mount
 * replaces this scene with the 2D painter, silently.
 */

/* ------------------------------ the flower ------------------------------ */

interface RingCfg {
  n: number;
  length: number;
  width: number;
  tilt: readonly [number, number];
  curve: readonly [number, number];
  cup: number;
  /** This ring's stretch of the bloom: it starts opening at `start`
   *  and is fully open at start + span. Outer first, heart last. */
  start: number;
  span: number;
  y0: number;
}

const RINGS: readonly RingCfg[] = [
  { n: 7, length: 0.98, width: 0.3, tilt: [0.25, 1.28], curve: [-0.55, -0.32], cup: 0.5, start: 0.0, span: 0.55, y0: 0 },
  { n: 6, length: 0.88, width: 0.28, tilt: [0.18, 1.02], curve: [-0.5, -0.22], cup: 0.55, start: 0.12, span: 0.56, y0: 0.015 },
  { n: 5, length: 0.74, width: 0.25, tilt: [0.12, 0.74], curve: [-0.45, -0.08], cup: 0.6, start: 0.28, span: 0.54, y0: 0.03 },
  { n: 4, length: 0.56, width: 0.21, tilt: [0.06, 0.44], curve: [-0.35, 0.06], cup: 0.65, start: 0.45, span: 0.5, y0: 0.045 },
];

/* Deterministic scatter (seeded LCG) — every machine grows the
   same flower. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface PetalRec {
  geo: THREE.BufferGeometry;
  shape: PetalShape;
  ring: number;
  jitter: number;
}

/* ------------------------------- the vessel ------------------------------ */

/** The vessel's profile (radius, height) — a swelling body that
 *  narrows to a neck and flares a little at the rim. */
const VESSEL_PROFILE: readonly (readonly [number, number])[] = [
  [0.001, 0],
  [0.28, 0],
  [0.35, 0.02],
  [0.43, 0.18],
  [0.46, 0.4],
  [0.415, 0.64],
  [0.27, 0.88],
  [0.205, 1.02],
  [0.215, 1.12],
  [0.25, 1.17],
];

function radiusAt(profile: readonly (readonly [number, number])[], y: number): number {
  for (let i = 1; i < profile.length; i++) {
    const b = profile[i]!;
    if (b[1] >= y) {
      const a = profile[i - 1]!;
      const t = (y - a[1]) / Math.max(1e-5, b[1] - a[1]);
      return a[0] + (b[0] - a[0]) * t;
    }
  }
  return profile[profile.length - 1]![0];
}

const WATER_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform float uLevel;
  uniform float uTime;
  varying vec3 vLocal;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    if (vLocal.y > uLevel) discard;
    float h = clamp(vLocal.y / max(uLevel, 0.001), 0.0, 1.0);
    vec3 deep = vec3(0.13, 0.35, 0.35);
    vec3 top = vec3(0.62, 0.87, 0.76);
    vec3 col = mix(deep, top, pow(h, 0.8));
    float f = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 2.0);
    float ang = atan(vLocal.z, vLocal.x);
    float shimmer = sin(vLocal.y * 30.0 - uTime * 1.1 + sin(ang * 3.0 + uTime * 0.7) * 1.5) * 0.5 + 0.5;
    col += vec3(0.55, 0.85, 0.72) * pow(shimmer, 6.0) * 0.12;
    col += vec3(0.98, 0.94, 0.84) * f * 0.3;
    gl_FragColor = vec4(col, 0.52 + f * 0.3);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* -------------------------------- sprites -------------------------------- */

function makeSprite(kind: "soft" | "ring" | "shadow"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  if (kind === "soft") {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.3, "rgba(255,255,255,0.5)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  } else if (kind === "ring") {
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(32, 32, 24, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = 12;
    g.beginPath();
    g.arc(32, 32, 22, 0, Math.PI * 2);
    g.stroke();
  } else {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(0,0,0,0.6)");
    r.addColorStop(0.6, "rgba(0,0,0,0.22)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* --------------------------------- scene --------------------------------- */

const N_BUBBLES = 18;
const N_MOTES = 36;
const N_DROPS = 12;
const N_RIPPLES = 5;
const BUBBLE_COUNTS: readonly number[] = [18, 18, 10, 6];
const MOTE_COUNTS: readonly number[] = [36, 36, 24, 16];
const FRAME_WINDOW = 40;
const POUR_S = POUR_DURATION_MS / 1000;

interface Drop {
  active: boolean;
  age: number;
  dur: number;
  x: number;
  z: number;
  pTo: number;
  last: boolean;
}
interface Ripple {
  active: boolean;
  age: number;
  x: number;
  z: number;
}

class FlowerScene3d {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private key: THREE.DirectionalLight;
  private disposables: { dispose(): void }[] = [];

  private plant = new THREE.Group();
  private head = new THREE.Group();
  private heart = new THREE.Group();
  private petals: PetalRec[] = [];
  private sepals: PetalRec[] = [];
  private stamens: { pivot: THREE.Group; splay: number }[] = [];
  private stem!: THREE.Mesh;
  private leafGroups: { group: THREE.Group; t: number }[] = [];
  private lastDroop = -1;

  private waterMat: THREE.ShaderMaterial;
  private surface: THREE.Mesh;
  private innerProfile: (readonly [number, number])[];

  private bubbles: THREE.Points;
  private bubPos: Float32Array;
  private bubData: { a: number; r: number; sp: number }[] = [];
  private motes: THREE.Points;
  private motePos: Float32Array;
  private moteData: { sp: number; ph: number }[] = [];

  private drops: Drop[] = [];
  private dropMeshes: THREE.Mesh[] = [];
  private ripples: Ripple[] = [];
  private rippleMeshes: THREE.Mesh[] = [];

  private bloom = 0;
  private bloomV = 0;
  private bloomTarget = 0;
  private level = levelForProgress(0);
  private levelTarget = levelForProgress(0);
  private glow = 0;
  private pourT0 = -10;
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private width = 1;
  private height = 1;

  private quality = 0;
  private frameSum = 0;
  private frameCount = 0;
  private goodWindows = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer = r;
    r.setPixelRatio(pixelRatioForQuality(0, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);

    /* one warm key, one soft fill — restraint */
    this.key = new THREE.DirectionalLight(0xffe9c4, 1.7);
    this.key.position.set(-2.4, 5.2, 3.6);
    this.key.target.position.set(0, 1.6, 0);
    const hemi = new THREE.HemisphereLight(0xf2e4c6, 0x0a0b0e, 0.55);
    this.scene.add(this.key, this.key.target, hemi);

    const rand = seeded(20261120);

    /* ---- the vessel and its water ---- */
    const outerPts = VESSEL_PROFILE.map(([rr, y]) => new THREE.Vector2(rr, y));
    const glassGeo = new THREE.LatheGeometry(outerPts, 64);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2e4c6,
      transparent: true,
      opacity: 0.16,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.renderOrder = 3;
    glass.frustumCulled = false;
    this.disposables.push(glassGeo, glassMat);

    this.innerProfile = VESSEL_PROFILE.map(([rr, y]) => [Math.max(0.001, rr * 0.93), y + 0.015] as const);
    const waterGeo = new THREE.LatheGeometry(this.innerProfile.map(([rr, y]) => new THREE.Vector2(rr, y)), 48);
    this.waterMat = new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: { uLevel: { value: this.level }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const water = new THREE.Mesh(waterGeo, this.waterMat);
    water.renderOrder = 1;
    water.frustumCulled = false;
    this.disposables.push(waterGeo, this.waterMat);

    const surfGeo = new THREE.CircleGeometry(1, 48);
    const surfMat = new THREE.MeshStandardMaterial({ color: 0xbfe3d0, transparent: true, opacity: 0.9, roughness: 0.2 });
    this.surface = new THREE.Mesh(surfGeo, surfMat);
    this.surface.rotation.x = -Math.PI / 2;
    this.surface.renderOrder = 2;
    this.surface.frustumCulled = false;
    this.disposables.push(surfGeo, surfMat);

    const rimGeo = new THREE.TorusGeometry(0.25, 0.011, 10, 56);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xdcc08f,
      metalness: 0.55,
      roughness: 0.35,
      emissive: 0xdcc08f,
      emissiveIntensity: 0.1,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.17;
    rim.renderOrder = 4;
    this.disposables.push(rimGeo, rimMat);

    /* the painted contact shadow the vessel stands on */
    const shTex = makeSprite("shadow");
    const shGeo = new THREE.PlaneGeometry(1.7, 1.7);
    const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(shGeo, shMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.01;
    shadow.renderOrder = 0;
    this.disposables.push(shTex, shGeo, shMat);

    this.scene.add(shadow, water, this.surface, glass, rim);

    /* ---- the flower ---- */
    const petalMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0,
      side: THREE.DoubleSide,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xf2e4c6),
      sheenRoughness: 0.5,
    });
    const leafMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0,
      side: THREE.DoubleSide,
      sheen: 0.3,
      sheenColor: new THREE.Color(0x8fc7a2),
      sheenRoughness: 0.6,
    });
    this.disposables.push(petalMat, leafMat);

    RINGS.forEach((cfg, ri) => {
      for (let i = 0; i < cfg.n; i++) {
        const geo = createPetalGeometry("petal");
        const mesh = new THREE.Mesh(geo, petalMat);
        mesh.frustumCulled = false;
        mesh.position.y = cfg.y0;
        mesh.rotation.y = ((i + (ri % 2) * 0.5) / cfg.n) * Math.PI * 2 + (rand() - 0.5) * 0.16 + ri * 0.19;
        this.head.add(mesh);
        this.disposables.push(geo);
        this.petals.push({
          geo,
          ring: ri,
          jitter: (rand() - 0.5) * 0.14,
          shape: {
            length: cfg.length * (0.94 + rand() * 0.12),
            width: cfg.width,
            tilt: cfg.tilt,
            curve: cfg.curve,
            cup: cfg.cup,
            fold: 0.35,
            ripple: 0.09,
            phase: rand() * 6,
          },
        });
      }
    });

    /* sepals — small sage blades under the head */
    for (let i = 0; i < 5; i++) {
      const geo = createPetalGeometry("leaf");
      const mesh = new THREE.Mesh(geo, leafMat);
      mesh.frustumCulled = false;
      mesh.position.y = -0.03;
      mesh.rotation.y = (i / 5) * Math.PI * 2 + 0.4;
      this.head.add(mesh);
      this.disposables.push(geo);
      this.sepals.push({
        geo,
        ring: -1,
        jitter: 0,
        shape: { length: 0.34, width: 0.09, tilt: [0.3, 1.3], curve: [0, 0.5], cup: 0.3, fold: 0.3, ripple: 0, phase: i * 1.3 },
      });
    }

    /* the heart: a receptacle, a gold dome, stamen dots on stalks */
    const recMat = new THREE.MeshStandardMaterial({ color: 0x3a7454, roughness: 0.6 });
    const recGeo = new THREE.SphereGeometry(0.1, 18, 12);
    const rec = new THREE.Mesh(recGeo, recMat);
    rec.scale.set(1, 0.75, 1);
    rec.position.y = -0.02;
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xdcc08f,
      roughness: 0.4,
      emissive: 0xdcc08f,
      emissiveIntensity: 0.14,
    });
    const domeGeo = new THREE.SphereGeometry(0.07, 18, 12);
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.scale.set(1, 0.8, 1);
    dome.position.y = 0.05;
    this.heart.add(rec, dome);
    this.disposables.push(recMat, recGeo, domeMat, domeGeo);

    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xf2e4c6, roughness: 0.6 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xdcc08f, roughness: 0.45, emissive: 0xdcc08f, emissiveIntensity: 0.3 });
    const stalkGeo = new THREE.CylinderGeometry(0.0035, 0.005, 0.13, 6);
    stalkGeo.translate(0, 0.065, 0);
    const tipGeo = new THREE.SphereGeometry(0.0135, 8, 8);
    tipGeo.translate(0, 0.135, 0);
    this.disposables.push(stalkMat, tipMat, stalkGeo, tipGeo);
    for (let i = 0; i < 9; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = 0.03;
      pivot.rotation.y = (i / 9) * Math.PI * 2 + rand() * 0.3;
      pivot.add(new THREE.Mesh(stalkGeo, stalkMat), new THREE.Mesh(tipGeo, tipMat));
      this.heart.add(pivot);
      this.stamens.push({ pivot, splay: 0.35 + rand() * 0.25 });
    }
    this.head.add(this.heart);

    /* stem + leaves (the stem is laid out per droop, below) */
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x8fc7a2, roughness: 0.6 });
    this.stem = new THREE.Mesh(new THREE.BufferGeometry(), stemMat);
    this.stem.frustumCulled = false;
    this.plant.add(this.stem);
    this.disposables.push(stemMat);
    const leafSpecs = [
      { t: 0.45, az: 0.6, length: 0.8, width: 0.16 },
      { t: 0.63, az: Math.PI + 0.9, length: 0.66, width: 0.14 },
    ];
    for (const s of leafSpecs) {
      const geo = createPetalGeometry("leaf");
      updatePetal(
        geo,
        { length: s.length, width: s.width, tilt: [1.0, 1.0], curve: [1.15, 1.15], cup: 0.15, fold: 0.5, ripple: 0.1, phase: 1.3 },
        0.65,
        0,
      );
      const mesh = new THREE.Mesh(geo, leafMat);
      mesh.frustumCulled = false;
      const group = new THREE.Group();
      group.rotation.y = s.az;
      group.add(mesh);
      this.plant.add(group);
      this.leafGroups.push({ group, t: s.t });
      this.disposables.push(geo);
    }

    this.plant.add(this.head);
    this.scene.add(this.plant);
    this.layoutStem(1, true);

    /* ---- bubbles, motes, droplets, ripples ---- */
    const ringTex = makeSprite("ring");
    this.bubPos = new Float32Array(N_BUBBLES * 3);
    for (let i = 0; i < N_BUBBLES; i++) {
      this.bubData.push({ a: rand() * Math.PI * 2, r: rand() * 0.75, sp: 0.05 + rand() * 0.11 });
      this.bubPos[i * 3 + 1] = 0.06 + rand() * 0.14;
    }
    const bubGeo = new THREE.BufferGeometry();
    bubGeo.setAttribute("position", new THREE.BufferAttribute(this.bubPos, 3));
    this.bubbles = new THREE.Points(
      bubGeo,
      new THREE.PointsMaterial({ size: 0.05, map: ringTex, transparent: true, depthWrite: false, opacity: 0.8, color: 0xd8efe2 }),
    );
    this.bubbles.frustumCulled = false;
    this.bubbles.renderOrder = 2;
    this.scene.add(this.bubbles);
    this.disposables.push(ringTex, bubGeo, this.bubbles.material as THREE.Material);

    const softTex = makeSprite("soft");
    this.motePos = new Float32Array(N_MOTES * 3);
    for (let i = 0; i < N_MOTES; i++) {
      this.motePos[i * 3] = (rand() - 0.5) * 2.6;
      this.motePos[i * 3 + 1] = 0.7 + rand() * 2.4;
      this.motePos[i * 3 + 2] = (rand() - 0.5) * 1.2;
      this.moteData.push({ sp: 0.15 + rand() * 0.3, ph: rand() * 10 });
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(this.motePos, 3));
    this.motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        size: 0.045,
        map: softTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.4,
        color: 0xf2e4c6,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 5;
    this.scene.add(this.motes);
    this.disposables.push(softTex, moteGeo, this.motes.material as THREE.Material);

    const dropGeo = new THREE.SphereGeometry(0.032, 12, 10);
    const dropMat = new THREE.MeshStandardMaterial({ color: 0xcfeadb, transparent: true, opacity: 0.85, roughness: 0.1 });
    this.disposables.push(dropGeo, dropMat);
    for (let i = 0; i < N_DROPS; i++) {
      const m = new THREE.Mesh(dropGeo, dropMat);
      m.visible = false;
      m.renderOrder = 4;
      this.scene.add(m);
      this.dropMeshes.push(m);
      this.drops.push({ active: false, age: -1, dur: 0.5, x: 0, z: 0, pTo: 0, last: false });
    }

    const ripGeo = new THREE.RingGeometry(0.86, 1, 44);
    const ripMat = new THREE.MeshBasicMaterial({ color: 0xece8e1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    this.disposables.push(ripGeo, ripMat);
    for (let i = 0; i < N_RIPPLES; i++) {
      const m = new THREE.Mesh(ripGeo, ripMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 2.6;
      this.scene.add(m);
      this.rippleMeshes.push(m);
      this.ripples.push({ active: false, age: 0, x: 0, z: 0 });
      this.disposables.push(m.material as THREE.Material);
    }

    this.setLevel(this.level);
  }

  /* ------------------------------ stem layout ----------------------------- */

  private layoutStem(droop: number, force = false) {
    if (!force && Math.abs(droop - this.lastDroop) < 0.008) return;
    this.lastDroop = droop;
    const d = droop;
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0.04, 0),
        new THREE.Vector3(0.04, 0.62, 0.03),
        new THREE.Vector3(0.07 + d * 0.18, 1.32, 0.01),
        new THREE.Vector3(0.03 + d * 0.55, 2.0 - d * 0.34, -0.01),
      ],
      false,
      "catmullrom",
      0.5,
    );
    const tube = new THREE.TubeGeometry(curve, 40, 0.03, 8, false);
    this.stem.geometry.dispose();
    this.stem.geometry = tube;
    const end = curve.getPoint(1);
    this.head.position.copy(end);
    this.head.userData["baseY"] = end.y;
    for (const l of this.leafGroups) {
      l.group.position.copy(curve.getPointAt(l.t));
    }
  }

  /* --------------------------------- water -------------------------------- */

  private setLevel(y: number) {
    this.level = y;
    this.waterMat.uniforms["uLevel"]!.value = y;
    const r = Math.max(0.02, radiusAt(this.innerProfile, y) - 0.008);
    this.surface.position.y = y;
    this.surface.scale.setScalar(r);
  }

  private addRipple(x: number, z: number) {
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i]!;
      if (r.active) continue;
      r.active = true;
      r.age = 0;
      r.x = x;
      r.z = z;
      return;
    }
  }

  /* ------------------------------- the contract ---------------------------- */

  resize(w: number, h: number) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  /** Spring to a progress value without pouring. */
  setProgress(p: number) {
    const to = clamp01(p);
    this.bloomTarget = to;
    this.levelTarget = levelForProgress(to);
    this.glow = Math.max(this.glow, 0.4);
  }

  /** Pour: droplets carry the bloom to the new progress, landing one
   *  by one; the flower lifts and sways through the pour's envelope. */
  pour(delta: number, p: number) {
    const to = clamp01(p);
    const from = this.bloomTarget;
    const n = dropletCountForDelta(delta);
    this.pourT0 = this.time;
    let slot = 0;
    for (let k = 0; k < n; k++) {
      while (slot < this.drops.length && this.drops[slot]!.active) slot++;
      if (slot >= this.drops.length) {
        this.bloomTarget = to;
        this.levelTarget = levelForProgress(to);
        break;
      }
      const d = this.drops[slot]!;
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.random() * 0.09;
      d.x = Math.cos(ang) * rr;
      d.z = Math.sin(ang) * rr;
      d.dur = 0.46 + Math.random() * 0.07;
      d.age = -(k * 0.085 + Math.random() * 0.03);
      d.pTo = from + ((to - from) * (k + 1)) / n;
      d.last = k === n - 1;
      d.active = true;
      slot++;
    }
  }

  /** Reduced motion: stand exactly at the progress given and render
   *  one still frame — no spring, no droplets, no loop. */
  settleTo(p: number) {
    const to = clamp01(p);
    this.bloomTarget = to;
    this.levelTarget = levelForProgress(to);
    this.bloom = to;
    this.bloomV = 0;
    this.setLevel(this.levelTarget);
    for (const d of this.drops) d.active = false;
    this.renderFrame(0.016);
  }

  renderStill() {
    this.renderFrame(0.016);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /* ----------------------------- adaptive quality -------------------------- */

  private applyQuality() {
    this.renderer.setPixelRatio(pixelRatioForQuality(this.quality, window.devicePixelRatio || 1));
    (this.bubbles.geometry as THREE.BufferGeometry).setDrawRange(0, BUBBLE_COUNTS[this.quality] ?? N_BUBBLES);
    (this.motes.geometry as THREE.BufferGeometry).setDrawRange(0, MOTE_COUNTS[this.quality] ?? N_MOTES);
  }

  private trackFrame(ms: number) {
    this.frameSum += ms;
    this.frameCount += 1;
    if (this.frameCount < FRAME_WINDOW) return;
    const avg = this.frameSum / this.frameCount;
    this.frameSum = 0;
    this.frameCount = 0;
    const next = qualityForFrameTime(this.quality, avg);
    if (next > this.quality) {
      this.quality = next;
      this.goodWindows = 0;
      this.applyQuality();
    } else if (next < this.quality) {
      this.goodWindows += 1;
      if (this.goodWindows >= 2) {
        this.quality = next;
        this.goodWindows = 0;
        this.applyQuality();
      }
    } else {
      this.goodWindows = 0;
    }
  }

  /* --------------------------------- frame -------------------------------- */

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (this.last) this.trackFrame(Math.min(100, now - this.last));
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.renderFrame(dt);
  };

  private renderFrame(dt: number) {
    this.time += dt;
    const t = this.time;

    /* the bloom spring — slightly under-damped, so it feels alive */
    this.bloomV += ((this.bloomTarget - this.bloom) * 5.2 - this.bloomV * 4.0) * dt;
    this.bloom += this.bloomV * dt;
    const b = clamp01(this.bloom);
    const levelNow = this.level + (this.levelTarget - this.level) * (1 - Math.exp(-dt * 2.6));
    this.setLevel(levelNow);
    this.glow *= Math.exp(-dt * 0.7);
    this.waterMat.uniforms["uTime"]!.value = t;

    /* droop while the day is dry; the stem re-lays as it changes */
    const droop = Math.pow(clamp01(1 - b / 0.45), 1.4);
    this.layoutStem(droop);

    /* the pour's one connected moment: lift + sway over its envelope */
    const pourAge = t - this.pourT0;
    const pourEnv = pourAge >= 0 && pourAge < POUR_S ? Math.sin((pourAge / POUR_S) * Math.PI) : 0;

    /* petals: each ring unfurls across its stretch of the bloom */
    for (const p of this.petals) {
      const cfg = RINGS[p.ring]!;
      const open = ringOpenFor(b, cfg.start, cfg.span) + p.jitter * smooth01(b);
      updatePetal(p.geo, p.shape, open, t);
    }
    const sepalOpen = ringOpenFor(b, 0, 0.4);
    for (const s of this.sepals) updatePetal(s.geo, s.shape, sepalOpen, t);

    /* the heart comes last */
    const heartOpen = ringOpenFor(b, 0.6, 0.4);
    this.heart.scale.setScalar(0.55 + 0.45 * heartOpen);
    for (const s of this.stamens) s.pivot.rotation.z = -s.splay * heartOpen;

    /* head: faces the light more as it opens, leans as it droops,
       and lifts through a pour */
    const baseY = (this.head.userData["baseY"] as number) ?? 2;
    this.head.position.y = baseY + pourEnv * 0.05;
    this.head.rotation.set(0.16 + b * 0.3 + droop * 0.22, 0, -droop * 0.3);

    /* the plant's idle sway, deepened a breath by a pour */
    const swayAmp = 1 + pourEnv * 0.9;
    this.plant.rotation.z = (Math.sin(t * 0.5) * 0.012 + Math.sin(t * 1.27 + 1) * 0.004) * swayAmp;
    this.plant.rotation.x = Math.sin(t * 0.42 + 2) * 0.006 * swayAmp;

    /* the key light breathes with the bloom */
    this.key.intensity = 1.55 + b * 0.3 + this.glow * 0.7;

    /* droplets */
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i]!;
      const m = this.dropMeshes[i]!;
      if (!d.active) {
        m.visible = false;
        continue;
      }
      d.age += dt;
      if (d.age < 0) {
        m.visible = false;
        continue;
      }
      if (d.age >= d.dur) {
        d.active = false;
        m.visible = false;
        this.addRipple(d.x, d.z);
        this.bloomTarget = d.pTo;
        this.levelTarget = levelForProgress(d.pTo);
        if (d.last) this.glow = 1;
        continue;
      }
      const s = d.age / d.dur;
      m.visible = true;
      /* a fall from above the rim to the water's surface */
      const y = 2.55 + (this.level - 2.55) * s * s;
      m.position.set(d.x, y, d.z);
      m.scale.set(1, 1 + s * 0.7, 1);
    }

    /* ripples */
    const maxR = Math.max(0.05, radiusAt(this.innerProfile, this.level) - 0.02);
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i]!;
      const m = this.rippleMeshes[i]!;
      if (!r.active) {
        m.visible = false;
        continue;
      }
      r.age += dt;
      const rt = r.age / 0.85;
      if (rt >= 1) {
        r.active = false;
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.set(r.x, this.level + 0.004, r.z);
      m.scale.setScalar(0.04 + rt * maxR);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - rt) * 0.5;
    }

    /* bubbles rising through the water */
    const top = this.level - 0.04;
    for (let i = 0; i < N_BUBBLES; i++) {
      const d = this.bubData[i]!;
      let y = this.bubPos[i * 3 + 1]! + d.sp * dt;
      if (y > top) y = 0.06;
      const rr = Math.max(0.02, radiusAt(this.innerProfile, y) - 0.06) * d.r;
      this.bubPos[i * 3] = Math.cos(d.a + t * 0.25) * rr;
      this.bubPos[i * 3 + 1] = y;
      this.bubPos[i * 3 + 2] = Math.sin(d.a + t * 0.25) * rr;
    }
    (this.bubbles.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    /* motes drifting in the light */
    for (let i = 0; i < N_MOTES; i++) {
      const d = this.moteData[i]!;
      this.motePos[i * 3] = this.motePos[i * 3]! + Math.sin(t * d.sp + d.ph) * 0.0006;
      this.motePos[i * 3 + 1] = this.motePos[i * 3 + 1]! + dt * 0.014 * d.sp;
      if (this.motePos[i * 3 + 1]! > 3.2) this.motePos[i * 3 + 1] = 0.6;
    }
    (this.motes.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    /* camera: a slow idle drift */
    const aspect = this.width / this.height;
    const dist = 6.6 * Math.max(1, 0.8 / aspect);
    this.camera.position.set(Math.sin(t * 0.13) * 0.07, 2.0, dist);
    this.camera.lookAt(0, 1.38, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.stem.geometry.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/**
 * Mount the 3D scene on a canvas, speaking the WaterScene contract.
 * Throws if WebGL initialisation fails — the caller (the auto-mount)
 * catches and falls back to the 2D painter. A context lost AFTER a
 * successful mount is reported through onFail instead.
 */
export function mountFlowerScene3d(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean; onFail: () => void },
): WaterScene {
  const reduced = opts.reducedMotion;
  const scene = new FlowerScene3d(canvas);
  let destroyed = false;
  let failed = false;
  let inView = true;
  let seenFirst = false;
  let prev = 0;

  function resize() {
    scene.resize(canvas.clientWidth || 1, canvas.clientHeight || 1);
    if (reduced) scene.renderStill();
  }

  function syncLoop() {
    if (reduced) return;
    if (inView && !document.hidden) scene.start();
    else scene.stop();
  }

  const onVisibility = () => syncLoop();
  document.addEventListener("visibilitychange", onVisibility);

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        syncLoop();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);
  }

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  }

  const onContextLost = (e: Event) => {
    e.preventDefault();
    if (failed || destroyed) return;
    failed = true;
    opts.onFail();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  resize();
  syncLoop();

  return {
    setProgress(p: number) {
      const next = clamp01(p);
      if (reduced) {
        scene.settleTo(next);
        prev = next;
        seenFirst = true;
        return;
      }
      /* The first value is the day as it already stands — the bloom
         springs to it, but nothing pours; a pour is for a log. */
      const delta = seenFirst ? pourDeltaFor(prev, next) : null;
      if (delta !== null) scene.pour(delta, next);
      else scene.setProgress(next);
      prev = next;
      seenFirst = true;
    },
    destroy() {
      destroyed = true;
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.dispose();
    },
  };
}
