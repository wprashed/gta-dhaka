import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { NPCRole, ToolWeaponId, VehicleType } from '../types/game';
import {
  createBanglaNumberPlateTexture,
  createBanglaSignTexture,
  createCngBodyTexture,
  createLungiPatternTexture,
  createRickshawArtTexture,
  loadRealTexture,
} from './dhakaTextures';
import { resolveAssetUrl } from '../utils/assets';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(resolveAssetUrl('/draco/'));
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

type ModelKey =
  | 'rpm_male'
  | 'readyplayerme1'
  | 'hvgirl'
  | 'michelle'
  | 'soldier'
  | 'cesium_man'
  | 'truck'
  | 'car_concept'
  | 'ferrari'
  | 'bike_gltf';

const MODEL_PATHS: Record<ModelKey, string> = {
  rpm_male: '/models/rpm_male.glb',
  readyplayerme1: '/models/readyplayerme1.glb',
  hvgirl: '/models/HVGirl.glb',
  michelle: '/models/Michelle.glb',
  soldier: '/models/Soldier.glb',
  cesium_man: '/models/CesiumMan.glb',
  truck: '/models/CesiumMilkTruck.glb',
  car_concept: '/models/CarConcept.glb',
  ferrari: '/models/ferrari.glb',
  bike_gltf: '/models/bike.gltf',
};

const cachedGltf = new Map<ModelKey, GLTF>();
const pendingCallbacks = new Map<ModelKey, Array<(gltf: GLTF) => void>>();
const loadingFlags = new Set<ModelKey>();

export function ensureModelLoaded(key: ModelKey, cb: (gltf: GLTF) => void) {
  if (cachedGltf.has(key)) {
    cb(cachedGltf.get(key)!);
    return;
  }
  if (!pendingCallbacks.has(key)) {
    pendingCallbacks.set(key, []);
  }
  pendingCallbacks.get(key)!.push(cb);

  if (!loadingFlags.has(key)) {
    loadingFlags.add(key);
    gltfLoader.load(
      resolveAssetUrl(MODEL_PATHS[key]),
      (gltf) => {
        cachedGltf.set(key, gltf);
        const list = pendingCallbacks.get(key) || [];
        list.forEach((fn) => fn(gltf));
        pendingCallbacks.set(key, []);
      },
      undefined,
      () => {}
    );
  }
}

export function loadCustomGLBFromUrl(
  url: string,
  onLoaded: (group: THREE.Group) => void
) {
  gltfLoader.load(resolveAssetUrl(url), (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    if (maxDim > 18 || maxDim < 0.8) {
      const scale = 4.5 / maxDim;
      model.scale.setScalar(scale);
    }
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    onLoaded(model);
  });
}

/**
 * Helper to build a realistic wire-spoked bicycle/rickshaw wheel with rubber tire,
 * chrome steel rim, axle hub, and 16 crisscrossed steel wire spokes.
 */
function createSpokedRickshawWheel(radius = 0.4): THREE.Group {
  const wGroup = new THREE.Group();
  wGroup.name = 'wheel';

  const tireMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.92,
    roughness: 0.14,
  });

  // Thin bicycle rubber tire
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.032, 12, 32).rotateY(Math.PI / 2),
    tireMat
  );
  tire.castShadow = true;
  wGroup.add(tire);

  // Inner gleaming chrome rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.024, 0.016, 10, 32).rotateY(Math.PI / 2),
    chromeMat
  );
  wGroup.add(rim);

  // Central chrome hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.11, 12).rotateZ(Math.PI / 2),
    chromeMat
  );
  wGroup.add(hub);

  // 16 crisscrossed thin chrome spokes
  const spokeGeo = new THREE.CylinderGeometry(
    0.004,
    0.004,
    (radius - 0.025) * 2,
    6
  );
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(spokeGeo, chromeMat);
    spoke.rotation.x = (i * Math.PI) / 8;
    spoke.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.04;
    wGroup.add(spoke);
  }

  return wGroup;
}

/**
 * Helper to build a realistic Bajaj 3-lug white-rim scooter wheel for Dhaka CNG Auto-Rickshaws
 */
function createCngScooterWheel(x: number, y: number, z: number): THREE.Group {
  const wGroup = new THREE.Group();
  wGroup.position.set(x, y, z);
  wGroup.name = 'wheel';

  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.085, 14, 24).rotateY(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.88 })
  );
  tire.castShadow = true;
  wGroup.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.65,
      roughness: 0.28,
    })
  );
  wGroup.add(rim);

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.8,
      roughness: 0.2,
    })
  );
  wGroup.add(hubCap);

  return wGroup;
}

// ---------------------------------------------------------------------------
// Procedural car surface textures. ferrari.glb ships with no textures at all
// and CarConcept.glb only bakes tires/disks/plates, so carbon weave, alcantara
// and paint flake are generated once here and shared across all vehicles.
// ---------------------------------------------------------------------------
let carbonTexCache: THREE.Texture | null = null;
let alcantaraTexCache: THREE.Texture | null = null;
let noiseTexCache: THREE.Texture | null = null;

function createCarbonWeaveTexture(): THREE.Texture {
  if (carbonTexCache) return carbonTexCache;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = 16;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const horizontal = ((x / cell) + (y / cell)) % 2 === 0;
      const g = ctx.createLinearGradient(x, y, horizontal ? x + cell : x, horizontal ? y : y + cell);
      g.addColorStop(0, horizontal ? '#14171c' : '#262b33');
      g.addColorStop(0.5, horizontal ? '#2b3138' : '#12151a');
      g.addColorStop(1, horizontal ? '#14171c' : '#262b33');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  carbonTexCache = tex;
  return tex;
}

function createAlcantaraTexture(): THREE.Texture {
  if (alcantaraTexCache) return alcantaraTexCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1d21';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const v = 18 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  alcantaraTexCache = tex;
  return tex;
}

function createPaintFlakeTexture(): THREE.Texture {
  if (noiseTexCache) return noiseTexCache;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const v = Math.random() < 0.5 ? 40 : 215;
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  noiseTexCache = tex;
  return tex;
}

/** Factory so every car gets its own lacquer (tint varies per vehicle). */
function makeCarPaint(color: THREE.Color, metallic = true): THREE.MeshPhysicalMaterial {
  const flake = createPaintFlakeTexture();
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: metallic ? 0.72 : 0.25,
    roughness: metallic ? 0.16 : 0.28,
    roughnessMap: flake,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.35,
    iridescence: metallic ? 0.12 : 0,
    iridescenceIOR: 1.4,
  });
}

function makeCarbonFibre(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: createCarbonWeaveTexture(),
    bumpMap: createCarbonWeaveTexture(),
    bumpScale: 0.015,
    metalness: 0.55,
    roughness: 0.34,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.1,
  });
}

function makeAlcantara(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: createAlcantaraTexture(),
    metalness: 0.0,
    roughness: 0.92,
    sheen: 0.6,
    sheenRoughness: 0.9,
    sheenColor: new THREE.Color('#4b5563'),
  });
}

function makeLeather(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.0,
    roughness: 0.55,
    clearcoat: 0.28,
    clearcoatRoughness: 0.55,
    sheen: 0.35,
    sheenColor: new THREE.Color('#9ca3af'),
  });
}

interface CarAccentFit {
  fx: number; fy: number; fz: number; // front plate
  rx: number; ry: number; rz: number; // rear plate
  hx: number; hy: number; hz: number; // headlight glow
  tx: number; ty: number; tz: number; // taillight glow
  topY: number; topZ: number; // roof / beacon height
  plateInside: number;
}

/**
 * Fits BRTA plates, headlight/taillight glow lenses and the police beacon onto
 * the loaded car bodywork. Positions are computed from each GLB's real bounds
 * so nothing floats in mid-air or floats inside the body.
 */
function fitCarAccents(
  carRoot: THREE.Object3D,
  fit: CarAccentFit,
  isPolice: boolean,
  seed: number,
  plateTex: THREE.Texture
) {
  const plateMat = new THREE.MeshBasicMaterial({
    map: plateTex,
    side: THREE.DoubleSide,
  });

  const frontPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.14),
    plateMat
  );
  frontPlate.name = 'accent_plate_front';
  frontPlate.position.set(fit.fx, fit.fy, fit.fz - fit.plateInside);
  carRoot.add(frontPlate);

  const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.14), plateMat);
  rearPlate.name = 'accent_plate_rear';
  rearPlate.position.set(fit.rx, fit.ry, fit.rz + fit.plateInside);
  rearPlate.rotation.y = Math.PI;
  carRoot.add(rearPlate);

  const headMat = new THREE.MeshBasicMaterial({
    color: '#fef9c3',
    transparent: true,
    opacity: 0.85,
  });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10).scale(1.5, 0.8, 0.45),
      headMat
    );
    hl.name = 'accent_headlight';
    hl.position.set(fit.hx * sx, fit.hy, fit.hz);
    carRoot.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.05), tailMat);
    tl.name = 'accent_taillight';
    tl.position.set(fit.tx * sx, fit.ty, fit.tz);
    carRoot.add(tl);
  }

  if (isPolice) {
    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.97, 0.05, 0.22),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85 })
    );
    barBase.position.set(0, fit.topY + 0.03, fit.topZ);
    carRoot.add(barBase);

    const redLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.18),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    redLight.position.set(-0.26, fit.topY + 0.09, fit.topZ);
    redLight.name = 'siren_red';
    carRoot.add(redLight);

    const blueLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.18),
      new THREE.MeshBasicMaterial({ color: '#3b82f6' })
    );
    blueLight.position.set(0.26, fit.topY + 0.09, fit.topZ);
    blueLight.name = 'siren_blue';
    carRoot.add(blueLight);
  }
  void seed;
}

let sharedVehicleShadowTex: THREE.CanvasTexture | null = null;
function getVehicleShadowTexture(): THREE.CanvasTexture {
  if (sharedVehicleShadowTex) return sharedVehicleShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedVehicleShadowTex = new THREE.CanvasTexture(canvas);
  return sharedVehicleShadowTex;
}

export function createVehicleMesh(
  type: VehicleType,
  customColor?: string,
  seed = 1,
  hasDriver = true
): THREE.Group {
  const group = new THREE.Group();

  // Soft radial ambient occlusion contact shadow plane beneath vehicle chassis
  const sWidth =
    type === 'bus'
      ? 3.2
      : type === 'car' || type === 'police'
      ? 2.2
      : type === 'cng'
      ? 1.9
      : 1.3;
  const sLength =
    type === 'bus'
      ? 10.4
      : type === 'car' || type === 'police'
      ? 4.8
      : type === 'cng'
      ? 3.1
      : 2.4;
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getVehicleShadowTexture(),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(sWidth, sLength),
    shadowMat
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.084;
  shadowPlane.name = 'contact_shadow';
  group.add(shadowPlane);

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.85,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.85,
    roughness: 0.2,
  });

  const addWheel = (x: number, y: number, z: number, radiusScale = 1) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(x, y, z);
    wGroup.scale.setScalar(radiusScale);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    wGroup.add(tire);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12).rotateZ(Math.PI / 2),
      alloyMat
    );
    wGroup.add(hub);

    wGroup.name = 'wheel';
    group.add(wGroup);
  };

  if (type === 'cng') {
    // ULTRA-REALISTIC SCULPTED 3D DHAKA BAJAJ RE 4-STROKE GREEN CAGED CNG AUTO-RICKSHAW (সিএনজি অটোরিকশা)
    const cngBodyTex = createCngBodyTexture(seed);
    const cngGreenCoat = new THREE.MeshPhysicalMaterial({
      color: '#15803d',
      roughness: 0.22,
      metalness: 0.28,
      clearcoat: 0.92,
      clearcoatRoughness: 0.12,
    });
    const cngTexturedMat = new THREE.MeshPhysicalMaterial({
      map: cngBodyTex,
      roughness: 0.26,
      metalness: 0.22,
      clearcoat: 0.88,
    });
    const cageSteelMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.9,
      roughness: 0.18,
    });
    const canvasRoofMat = new THREE.MeshStandardMaterial({
      color: '#1c1917',
      roughness: 0.78,
    });
    const yellowTrimMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.35,
    });
    const darkRubberMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.85,
    });

    // 1. Sculpted Curved Bajaj Rear & Mid Body Shell (ExtrudeGeometry side silhouette)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-1.18, 0.24);
    bodyShape.lineTo(0.45, 0.24);
    bodyShape.quadraticCurveTo(0.62, 0.26, 0.68, 0.58);
    bodyShape.lineTo(0.68, 0.88);
    bodyShape.lineTo(0.15, 0.88);
    bodyShape.lineTo(0.12, 0.42);
    bodyShape.lineTo(-0.42, 0.42);
    bodyShape.lineTo(-0.48, 0.94);
    bodyShape.quadraticCurveTo(-1.05, 0.96, -1.16, 0.82);
    bodyShape.quadraticCurveTo(-1.24, 0.55, -1.18, 0.24);

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 1.36,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 5,
    });
    bodyGeo.rotateY(Math.PI / 2);
    bodyGeo.translate(-0.68, 0, 0);

    const rearShell = new THREE.Mesh(bodyGeo, cngTexturedMat);
    rearShell.castShadow = true;
    rearShell.receiveShadow = true;
    group.add(rearShell);

    // 2. Sculpted Curved Bajaj Aerodynamic Front Nose Cone & Leg-Shield Apron
    const noseShape = new THREE.Shape();
    noseShape.moveTo(0.42, 0.26);
    noseShape.quadraticCurveTo(1.16, 0.26, 1.28, 0.52);
    noseShape.quadraticCurveTo(1.34, 0.78, 1.08, 0.96);
    noseShape.lineTo(0.74, 1.06);
    noseShape.lineTo(0.56, 0.92);
    noseShape.lineTo(0.42, 0.26);

    const noseGeo = new THREE.ExtrudeGeometry(noseShape, {
      depth: 0.88,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 6,
    });
    noseGeo.rotateY(Math.PI / 2);
    noseGeo.translate(-0.44, 0, 0);

    const frontNose = new THREE.Mesh(noseGeo, cngGreenCoat);
    frontNose.castShadow = true;
    group.add(frontNose);

    // Central raised spine rib on the front Bajaj apron
    const apronRib = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.48, 8, 12),
      cngGreenCoat
    );
    apronRib.position.set(0, 0.72, 1.24);
    apronRib.rotation.x = -0.35;
    group.add(apronRib);

    // Flared Curved Front Wheel Mudguard (সামনের মাডগার্ড)
    const frontMudguard = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.34,
        0.34,
        0.26,
        20,
        1,
        false,
        -0.2,
        Math.PI + 0.4
      ).rotateZ(Math.PI / 2),
      cngGreenCoat
    );
    frontMudguard.position.set(0, 0.34, 1.28);
    frontMudguard.castShadow = true;
    group.add(frontMudguard);

    // Rear Curved Wheel Fenders
    [-0.74, 0.74].forEach((fx) => {
      const rearFender = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.35,
          0.35,
          0.24,
          18,
          1,
          false,
          0,
          Math.PI
        ).rotateZ(Math.PI / 2),
        darkRubberMat
      );
      rearFender.position.set(fx, 0.34, -0.86);
      group.add(rearFender);
    });

    // 3. Slanted Sheet-Metal Windshield Cowl & Laminated Curved Glass Windshield
    const cowlFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.72, 0.07),
      cngGreenCoat
    );
    cowlFrame.position.set(0, 1.28, 0.82);
    cowlFrame.rotation.x = -0.32;
    group.add(cowlFrame);

    const windshieldGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.56, 0.09),
      new THREE.MeshPhysicalMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.52,
        roughness: 0.04,
        metalness: 0.15,
        clearcoat: 1.0,
      })
    );
    windshieldGlass.position.set(0, 1.3, 0.83);
    windshieldGlass.rotation.x = -0.32;
    group.add(windshieldGlass);

    // Wiper motor box & angled wiper arm
    const wiperMotor = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.08),
      darkRubberMat
    );
    wiperMotor.position.set(0, 1.02, 0.94);
    group.add(wiperMotor);

    const wiperArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.48, 0.025),
      darkRubberMat
    );
    wiperArm.position.set(0.08, 1.26, 0.88);
    wiperArm.rotation.z = 0.28;
    wiperArm.rotation.x = -0.32;
    group.add(wiperArm);

    // Left & Right Stalk Side-View Mirrors (সিএনজি লুকিং গ্লাস)
    [-0.72, 0.72].forEach((mx) => {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8).rotateZ(
          mx > 0 ? -0.6 : 0.6
        ),
        darkRubberMat
      );
      stalk.position.set(mx, 1.24, 0.86);
      group.add(stalk);

      const mirrorHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.1, 0.04),
        cageSteelMat
      );
      mirrorHead.position.set(mx * 1.14, 1.3, 0.86);
      group.add(mirrorHead);
    });

    // 4. Curved Arched Tarpaulin Canopy Roof (বাঁকানো ত্রিপলের ছাদ)
    const roofCurveShape = new THREE.Shape();
    roofCurveShape.moveTo(-1.22, 1.54);
    roofCurveShape.quadraticCurveTo(-1.18, 1.78, -0.82, 1.82);
    roofCurveShape.lineTo(0.42, 1.82);
    roofCurveShape.quadraticCurveTo(0.68, 1.8, 0.74, 1.62);
    roofCurveShape.lineTo(0.66, 1.58);
    roofCurveShape.quadraticCurveTo(0.58, 1.72, 0.38, 1.73);
    roofCurveShape.lineTo(-0.8, 1.73);
    roofCurveShape.quadraticCurveTo(-1.08, 1.7, -1.12, 1.52);
    roofCurveShape.closePath();

    const roofGeo = new THREE.ExtrudeGeometry(roofCurveShape, {
      depth: 1.38,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 4,
    });
    roofGeo.rotateY(Math.PI / 2);
    roofGeo.translate(-0.69, 0, 0);

    const canopyRoof = new THREE.Mesh(roofGeo, canvasRoofMat);
    canopyRoof.castShadow = true;
    group.add(canopyRoof);

    // Yellow front roof visor band with Bangla blessing
    const visorBand = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.11, 0.06),
      yellowTrimMat
    );
    visorBand.position.set(0, 1.64, 0.72);
    group.add(visorBand);

    // 5. Authentic Dhaka CNG Wire-Mesh Security Cage Doors (সবুজ সিএনজির লোহার খাঁচা)
    [-0.72, 0.72].forEach((sideX) => {
      // Vertical steel pillars
      [-1.08, -0.45, 0.18, 0.62].forEach((pz) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.88, 8),
          cageSteelMat
        );
        pillar.position.set(sideX, 1.28, pz);
        group.add(pillar);
      });

      // Vertical & cross wire-mesh grille bars inside the door opening
      for (let i = 0; i < 8; i++) {
        const barV = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011, 0.011, 0.78, 6),
          cageSteelMat
        );
        barV.position.set(sideX, 1.28, -0.98 + i * 0.22);
        group.add(barV);
      }
      [0.96, 1.16, 1.36, 1.54].forEach((by) => {
        const barH = new THREE.Mesh(
          new THREE.BoxGeometry(0.022, 0.022, 1.72),
          cageSteelMat
        );
        barH.position.set(sideX, by, -0.22);
        group.add(barH);
      });
    });

    // 6. Detailed Interior: Handlebar Steering Column, Driver Seat, Quilted Rear Bench & 3D Human Driver
    const steeringPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.68, 8),
      darkRubberMat
    );
    steeringPost.position.set(0, 0.78, 0.76);
    steeringPost.rotation.x = -0.35;
    group.add(steeringPost);

    const handlebars = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.62, 8).rotateZ(Math.PI / 2),
      cageSteelMat
    );
    handlebars.position.set(0, 1.06, 0.64);
    group.add(handlebars);

    const driverSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.16, 0.42),
      darkRubberMat
    );
    driverSeat.position.set(0, 0.66, 0.32);
    group.add(driverSeat);

    const passengerBench = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.22, 0.52),
      new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.6 })
    );
    passengerBench.position.set(0, 0.7, -0.62);
    group.add(passengerBench);

    const passengerBackrest = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.48, 0.14),
      new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6 })
    );
    passengerBackrest.position.set(0, 1.02, -0.88);
    group.add(passengerBackrest);

    // Real 3D Human GLB CNG Driver sitting inside the cockpit (traffic only)
    if (hasDriver) {
      ensureModelLoaded('readyplayerme1', (gltf) => {
        if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
        try {
          const driver = SkeletonUtils.clone(gltf.scene);
          driver.name = 'npc_driver';
          driver.scale.setScalar(0.78);
          driver.position.set(0, 0.12, 0.28);
          driver.traverse((c) => {
            if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
              c.visible = false;
            }
          });
          group.add(driver);
        } catch {}
      });
    }

    // 7. Chrome-Bezel Round Bajaj Headlamp, Amber Turn Indicators, Rear Bumper & Bangla Number Plate
    const headlightHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.16, 20).rotateX(Math.PI / 2),
      cageSteelMat
    );
    headlightHousing.position.set(0, 0.76, 1.34);
    group.add(headlightHousing);

    const headlightLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#fef08a' })
    );
    headlightLens.scale.set(1, 1, 0.45);
    headlightLens.position.set(0, 0.76, 1.41);
    group.add(headlightLens);

    [-0.52, 0.52].forEach((ix) => {
      const indPod = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.05, 0.06, 8, 12).rotateZ(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#f59e0b' })
      );
      indPod.position.set(ix, 0.72, 1.18);
      group.add(indPod);

      const tailLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 0.06),
        new THREE.MeshBasicMaterial({ color: '#ef4444' })
      );
      tailLamp.position.set(ix, 0.58, -1.24);
      group.add(tailLamp);
    });

    const rearBumper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.44, 10).rotateZ(Math.PI / 2),
      cageSteelMat
    );
    rearBumper.position.set(0, 0.34, -1.26);
    group.add(rearBumper);

    const plateTex = createBanglaNumberPlateTexture(
      `ঢাকা মেট্রো-থ ১১-${4210 + (seed % 9) * 73}`,
      true
    );
    const rearPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.18),
      new THREE.MeshBasicMaterial({ map: plateTex, side: THREE.DoubleSide })
    );
    rearPlate.position.set(0, 0.52, -1.25);
    rearPlate.rotation.y = Math.PI;
    group.add(rearPlate);

    group.add(createCngScooterWheel(0, 0.32, 1.28));
    group.add(createCngScooterWheel(-0.74, 0.32, -0.86));
    group.add(createCngScooterWheel(0.74, 0.32, -0.86));

    return group;
  }

  if (type === 'rickshaw') {
    // ULTRA-REALISTIC 3D BANGLADESHI CYCLE RICKSHAW (বাংলাদেশি রিকশা)
    // Built with real wire-spoked bicycle wheels, bike.gltf frame + curved accordion folding hood + 3D Human Puller
    const artTex = createRickshawArtTexture(seed);
    const hoodMat = new THREE.MeshStandardMaterial({
      map: artTex,
      roughness: 0.34,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.92,
      roughness: 0.15,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      metalness: 0.85,
      roughness: 0.22,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      roughness: 0.75,
    });
    const framePaintMat = new THREE.MeshStandardMaterial({
      color: '#065f46',
      metalness: 0.5,
      roughness: 0.3,
    });
    const seatColors = ['#be123c', '#047857', '#1d4ed8', '#b45309'];
    const seatMat = new THREE.MeshStandardMaterial({
      color: seatColors[Math.abs(seed) % seatColors.length],
      roughness: 0.42,
    });

    // 1. 3 Realistic Wire-Spoked Bicycle/Rickshaw Wheels
    const frontWheel = createSpokedRickshawWheel(0.41);
    frontWheel.position.set(0, 0.41, 1.12);
    group.add(frontWheel);

    const rearWheelL = createSpokedRickshawWheel(0.42);
    rearWheelL.position.set(-0.7, 0.42, -0.78);
    group.add(rearWheelL);

    const rearWheelR = createSpokedRickshawWheel(0.42);
    rearWheelR.position.set(0.7, 0.42, -0.78);
    group.add(rearWheelR);

    // Curved painted mudguards over all 3 wheels
    [-0.7, 0.7].forEach((wx) => {
      const fender = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.45,
          0.45,
          0.11,
          20,
          1,
          false,
          -0.2,
          Math.PI + 0.4
        ).rotateZ(Math.PI / 2),
        hoodMat
      );
      fender.position.set(wx, 0.43, -0.78);
      group.add(fender);
    });
    const frontFender = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.44,
        0.44,
        0.09,
        18,
        1,
        false,
        0,
        Math.PI
      ).rotateZ(Math.PI / 2),
      chromeMat
    );
    frontFender.position.set(0, 0.42, 1.12);
    group.add(frontFender);

    // 2. Tubular Diamond Bicycle Frame, Rear Leaf-Spring Axle, Chainring & Handlebars
    const rearAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.42, 10).rotateZ(Math.PI / 2),
      chromeMat
    );
    rearAxle.position.set(0, 0.42, -0.78);
    group.add(rearAxle);

    // Load real 3D GLTF Bicycle frame/pedals/handlebars from /models/bike.gltf
    ensureModelLoaded('bike_gltf', (gltf) => {
      try {
        const bikeClone = gltf.scene.clone(true);
        // Hide the built-in 2 wheels of bike.gltf so our 3 spoked tricycle wheels spin cleanly
        bikeClone.traverse((node) => {
          if (
            node.name.startsWith('B_') ||
            node.name.startsWith('F_') ||
            node.name.startsWith('Break')
          ) {
            node.visible = false;
          }
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
          }
        });
        bikeClone.rotation.y = -Math.PI / 2;
        bikeClone.scale.setScalar(0.38);
        bikeClone.position.set(0, 0.85, 0.36);
        group.add(bikeClone);
      } catch {}
    });

    // Tubular steel frame tubes, steering fork, handlebars & brass rickshaw bell
    const headTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.72, 10),
      framePaintMat
    );
    headTube.position.set(0, 0.86, 0.96);
    headTube.rotation.x = -0.24;
    group.add(headTube);

    const downTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.92, 10),
      framePaintMat
    );
    downTube.position.set(0, 0.68, 0.56);
    downTube.rotation.x = 1.05;
    group.add(downTube);

    const topTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.78, 10).rotateX(Math.PI / 2),
      framePaintMat
    );
    topTube.position.set(0, 0.92, 0.56);
    group.add(topTube);

    const seatPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.58, 10),
      chromeMat
    );
    seatPost.position.set(0, 0.72, 0.18);
    seatPost.rotation.x = -0.2;
    group.add(seatPost);

    const bikeSaddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.07, 0.28),
      new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.7 })
    );
    bikeSaddle.position.set(0, 1.02, 0.12);
    group.add(bikeSaddle);

    const chainGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.88),
      hoodMat
    );
    chainGuard.position.set(0.11, 0.45, -0.28);
    group.add(chainGuard);

    const handlebar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.68, 10).rotateZ(Math.PI / 2),
      chromeMat
    );
    handlebar.position.set(0, 1.22, 0.88);
    group.add(handlebar);

    // Brass Dhaka Rickshaw Bell (টুংটাং রিকশার ঘণ্টা)
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 12),
      brassMat
    );
    bell.position.set(0.22, 1.25, 0.88);
    group.add(bell);

    // 3. Sculpted Passenger Carriage: Angled Footboard, Quilted Velvet Sofa & Curved Armrests
    const footboard = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.08, 0.72),
      hoodMat
    );
    footboard.position.set(0, 0.54, -0.34);
    footboard.rotation.x = 0.12;
    group.add(footboard);

    const underSeatBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.28, 0.56),
      hoodMat
    );
    underSeatBox.position.set(0, 0.64, -0.78);
    group.add(underSeatBox);

    const seatCushion = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 0.16, 0.54),
      seatMat
    );
    seatCushion.position.set(0, 0.84, -0.78);
    group.add(seatCushion);

    const backrestCushion = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.48, 0.14),
      seatMat
    );
    backrestCushion.position.set(0, 1.14, -1.02);
    backrestCushion.rotation.x = -0.1;
    group.add(backrestCushion);

    // 4. Curved Accordion Folding Bamboo & Painted Rexine Rickshaw Hood (ভাঁজ করা রিকশার হুড)
    const hoodArchShape = new THREE.Shape();
    hoodArchShape.moveTo(-1.12, 0.92);
    hoodArchShape.quadraticCurveTo(-1.18, 1.65, -0.88, 1.98);
    hoodArchShape.quadraticCurveTo(-0.52, 2.18, -0.18, 1.92);
    hoodArchShape.lineTo(-0.24, 1.84);
    hoodArchShape.quadraticCurveTo(-0.54, 2.06, -0.82, 1.88);
    hoodArchShape.quadraticCurveTo(-1.06, 1.58, -1.02, 0.92);
    hoodArchShape.closePath();

    const hoodArchGeo = new THREE.ExtrudeGeometry(hoodArchShape, {
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 4,
    });
    hoodArchGeo.rotateY(Math.PI / 2);
    hoodArchGeo.translate(-0.62, 0, 0);

    const curvedHood = new THREE.Mesh(hoodArchGeo, hoodMat);
    curvedHood.castShadow = true;
    group.add(curvedHood);

    // Curved Side Hood Cheeks & Bamboo Rib Struts
    [-0.61, 0.61].forEach((sx) => {
      const sidePanel = new THREE.Mesh(
        new THREE.CircleGeometry(0.54, 18, 0, Math.PI * 0.88),
        hoodMat
      );
      sidePanel.rotation.y = Math.PI / 2;
      sidePanel.position.set(sx, 1.46, -0.72);
      group.add(sidePanel);

      // Brass Peacock/Heart Medallion on each side of the hood
      const medallion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16).rotateZ(Math.PI / 2),
        brassMat
      );
      medallion.position.set(sx * 1.03, 1.48, -0.74);
      group.add(medallion);

      // Diagonal bamboo folding struts
      [-0.3, 0.1, 0.45].forEach((ang) => {
        const rib = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6),
          bambooMat
        );
        rib.position.set(sx * 0.96, 1.38, -0.82);
        rib.rotation.x = ang;
        group.add(rib);
      });
    });

    // Gold-fringed front valance (ঝালর) hanging from the top of the rickshaw hood
    const valance = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 0.14, 0.04),
      brassMat
    );
    valance.position.set(0, 1.86, -0.2);
    group.add(valance);

    // Hand-Painted Bangladeshi Rickshaw Art Rear Tin Plate (রিকশা পেইন্টিং প্লেট)
    const rearArtPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.78, 0.04),
      hoodMat
    );
    rearArtPanel.position.set(0, 1.18, -1.14);
    group.add(rearArtPanel);

    // 5. Real 3D Human GLB Rickshaw Puller in Checkered Bangladeshi Lungi gripping handlebars (traffic only)
    if (hasDriver) {
      ensureModelLoaded('readyplayerme1', (gltf) => {
        if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
        try {
          const puller = SkeletonUtils.clone(gltf.scene);
          puller.name = 'npc_driver';
          puller.scale.setScalar(0.88);
          puller.position.set(0, 0.22, 0.34);
          const lungiTex = createLungiPatternTexture('#1e3a8a', '#facc15');
          const reachQuat = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.32)
            .multiply(
              new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1),
                -0.68
              )
            );
          puller.traverse((c) => {
            if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
              c.visible = false;
            }
            if (c.name === 'LeftArm' || c.name === 'RightArm') {
              c.quaternion.multiply(reachQuat);
            }
            if ((c as THREE.Mesh).isMesh) {
              const m = c as THREE.Mesh;
              if (m.name === 'Wolf3D_Outfit_Bottom') {
                m.material = new THREE.MeshStandardMaterial({
                  map: lungiTex,
                  roughness: 0.65,
                });
              } else if (m.name === 'Wolf3D_Outfit_Top') {
                const mat = (
                  m.material as THREE.MeshStandardMaterial
                ).clone() as THREE.MeshStandardMaterial;
                mat.color.set('#d97706');
                m.material = mat;
              }
            }
          });
          group.add(puller);
        } catch {}
      });
    }

    return group;
  }

  if (type === 'pickup') {
    const fallbackGroup = new THREE.Group();
    const truckMat = new THREE.MeshPhysicalMaterial({
      color: customColor || '#0284c7',
      clearcoat: 0.8,
      roughness: 0.3,
    });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 4.8), truckMat);
    bed.position.set(0, 0.7, 0);
    bed.castShadow = true;
    fallbackGroup.add(bed);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 1.9), truckMat);
    cab.position.set(0, 1.45, 0.8);
    cab.castShadow = true;
    fallbackGroup.add(cab);
    group.add(fallbackGroup);

    ensureModelLoaded('truck', (gltf) => {
      const cloned = gltf.scene.clone(true);
      cloned.scale.setScalar(1.05);
      // CesiumMilkTruck.glb tires reach y = -0.07 in model space.
      cloned.position.y = 0.074;
      cloned.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.remove(fallbackGroup);
      group.add(cloned);

      // 3D Human driver seated in the car's driver seat (traffic only)
      if (hasDriver) {
        ensureModelLoaded(isPolice ? 'soldier' : 'readyplayerme1', (driverGltf) => {
          if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
          try {
            const driver = SkeletonUtils.clone(driverGltf.scene);
            driver.name = 'npc_driver';
            driver.scale.setScalar(0.72);
            driver.position.set(-0.35, 0.22, 0.08);
            driver.rotation.y = 0;
            driver.traverse((c) => {
              if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
                c.visible = false;
              }
            });
            cloned.add(driver);
          } catch {}
        });
      }
    });

    return group;
  }

  if (type === 'bus') {
    const busSkinTex = loadRealTexture('/textures/dhaka_bus_skin.jpg', 1, 1, false);
    const busBodyMat = new THREE.MeshPhysicalMaterial({
      color: customColor || '#b91c1c',
      roughness: 0.24,
      metalness: 0.25,
      clearcoat: 0.85,
    });
    const busGreenMat = new THREE.MeshPhysicalMaterial({
      color: '#15803d',
      roughness: 0.26,
      metalness: 0.22,
      clearcoat: 0.82,
    });
    const busSideSkinMat = new THREE.MeshPhysicalMaterial({
      map: busSkinTex,
      roughness: 0.28,
      metalness: 0.18,
      clearcoat: 0.78,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.52,
      metalness: 0.25,
      roughness: 0.08,
    });

    // Lower green BRTC skirt & chassis
    const lowerSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(2.68, 0.92, 8.6),
      busGreenMat
    );
    lowerSkirt.position.set(0, 0.82, 0);
    lowerSkirt.castShadow = true;
    group.add(lowerSkirt);

    // Upper crimson coach body
    const upperBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.66, 1.82, 8.54),
      busBodyMat
    );
    upperBody.position.set(0, 2.12, 0);
    upperBody.castShadow = true;
    group.add(upperBody);

    // Orthographic Photorealistic Dhaka BRTC Bus Side Skins (ফার্মগেট - শাহবাগ - মতিঝিল - উত্তরা)
    [-1.345, 1.345].forEach((sx) => {
      const sidePanel = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 2.55),
        busSideSkinMat
      );
      sidePanel.position.set(sx, 1.66, 0);
      sidePanel.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(sidePanel);
    });

    // Panoramic Front & Rear Bus Windshields
    const frontWindshield = new THREE.Mesh(
      new THREE.PlaneGeometry(2.42, 1.12),
      glassMat
    );
    frontWindshield.position.set(0, 2.18, 4.28);
    group.add(frontWindshield);

    const rearWindshield = new THREE.Mesh(
      new THREE.PlaneGeometry(2.36, 0.92),
      glassMat
    );
    rearWindshield.position.set(0, 2.22, -4.28);
    rearWindshield.rotation.y = Math.PI;
    group.add(rearWindshield);

    // Illuminated Bangla Destination Board (ফার্মগেট - মতিঝিল - উত্তরা)
    const routeSign = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.38, 0.08),
      new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(seed + 2) })
    );
    routeSign.position.set(0, 2.86, 4.26);
    group.add(routeSign);

    const roofAc = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.28, 3.4),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 })
    );
    roofAc.position.set(0, 3.14, 0.3);
    group.add(roofAc);

    // Front Bumper, Grille & Glowing Xenon Headlights
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 0.36, 0.22),
      new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.5 })
    );
    frontBumper.position.set(0, 0.54, 4.28);
    group.add(frontBumper);

    [-0.96, 0.96].forEach((hx) => {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.24, 0.1),
        new THREE.MeshBasicMaterial({ color: '#fef08a' })
      );
      hl.position.set(hx, 0.86, 4.29);
      group.add(hl);

      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.26, 0.1),
        new THREE.MeshBasicMaterial({ color: '#ef4444' })
      );
      tl.position.set(hx, 0.92, -4.29);
      group.add(tl);
    });

    const busPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.18),
      new THREE.MeshBasicMaterial({
        map: createBanglaNumberPlateTexture(`ঢাকা মেট্রো-ব ১১-${4102 + (seed % 9) * 17}`, false),
        side: THREE.DoubleSide,
      })
    );
    busPlate.position.set(0, 0.54, 4.4);
    group.add(busPlate);

    addWheel(-1.34, 0.48, 2.65, 1.35);
    addWheel(1.34, 0.48, 2.65, 1.35);
    addWheel(-1.34, 0.48, -2.55, 1.35);
    addWheel(1.34, 0.48, -2.55, 1.35);

    // Bus driver seated in the elevated front driver cabin (traffic only)
    if (hasDriver) {
      ensureModelLoaded('readyplayerme1', (driverGltf) => {
        if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
        try {
          const driver = SkeletonUtils.clone(driverGltf.scene);
          driver.name = 'npc_driver';
          driver.scale.setScalar(0.85);
          driver.position.set(-0.65, 1.15, 3.8);
          driver.traverse((c) => {
            if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
              c.visible = false;
            }
          });
          group.add(driver);
        } catch {}
      });
    }

    return group;
  }

  if (type === 'motorcycle') {
    const bikeMat = new THREE.MeshPhysicalMaterial({
      color: customColor || '#e11d48',
      metalness: 0.65,
      roughness: 0.16,
      clearcoat: 0.95,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.6,
      roughness: 0.35,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      metalness: 0.92,
      roughness: 0.12,
    });

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.46, 1.48),
      darkMat
    );
    frame.position.set(0, 0.6, 0);
    frame.castShadow = true;
    group.add(frame);

    // Sculpted Teardrop Fuel Tank (Bajaj Pulsar / Yamaha FZ 150cc Dhaka Style)
    const tank = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12).scale(0.85, 0.72, 1.45),
      bikeMat
    );
    tank.position.set(0, 0.96, 0.24);
    tank.castShadow = true;
    group.add(tank);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.76),
      darkMat
    );
    seat.position.set(0, 0.88, -0.36);
    group.add(seat);

    // Rear Sporty Cowl & Angled Mudguard / Fender (Bajaj Pulsar / Yamaha FZ Style)
    const rearCowl = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.38),
      bikeMat
    );
    rearCowl.position.set(0, 0.86, -0.74);
    rearCowl.rotation.x = -0.18;
    group.add(rearCowl);

    const rearFender = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, 0.44),
      darkMat
    );
    rearFender.position.set(0, 0.62, -0.84);
    rearFender.rotation.x = -0.38;
    group.add(rearFender);

    // Rear Glowing LED Brake Light
    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    tailLight.position.set(0, 0.74, -0.92);
    group.add(tailLight);

    // Official Dhaka Metropolitan Police Motorcycle Digital Number Plate
    const bikePlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.12),
      new THREE.MeshBasicMaterial({
        map: createBanglaNumberPlateTexture(`ঢাকা মেট্রো-হ ১২-${5100 + (seed % 9) * 23}`, false),
        side: THREE.DoubleSide,
      })
    );
    bikePlate.position.set(0, 0.54, -0.98);
    bikePlate.rotation.x = 0.15;
    group.add(bikePlate);

    // Twin Rear Heavy-Duty Coil Spring Shock Absorbers
    [-0.14, 0.14].forEach((sx) => {
      const shock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.44, 8),
        chromeMat
      );
      shock.position.set(sx, 0.52, -0.62);
      shock.rotation.x = 0.45;
      group.add(shock);
    });

    // Engine Block with Horizontal Aluminum Cooling Fins (150cc DTS-i Style)
    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.34, 0.44),
      darkMat
    );
    engineBlock.position.set(0, 0.48, 0.08);
    engineBlock.castShadow = true;
    group.add(engineBlock);

    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.27, 0.02, 0.38),
        chromeMat
      );
      fin.position.set(0, 0.38 + f * 0.07, 0.08);
      group.add(fin);
    }

    // Rear Drive Swingarm & Enclosed Chain Guard
    const swingarm = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.68),
      darkMat
    );
    swingarm.position.set(-0.12, 0.36, -0.42);
    group.add(swingarm);

    // Dynamic Steerable Handlebar & Front Assembly Group
    const handlebarGroup = new THREE.Group();
    handlebarGroup.name = 'handlebar_group';
    handlebarGroup.position.set(0, 0, 0.72);
    group.add(handlebarGroup);

    // Telescopic Chrome Front Forks (Steered with Handlebars)
    [-0.11, 0.11].forEach((fx) => {
      const fork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.02, 0.78, 10),
        chromeMat
      );
      fork.position.set(fx, 0.72, -0.04);
      fork.rotation.x = -0.34;
      handlebarGroup.add(fork);
    });

    const bars = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.74, 8).rotateZ(Math.PI / 2),
      chromeMat
    );
    bars.position.set(0, 1.16, -0.16);
    handlebarGroup.add(bars);

    // Glowing Digital Speedometer Display Console
    const speedo = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.08),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    speedo.position.set(0, 1.21, -0.20);
    speedo.rotation.x = 0.45;
    handlebarGroup.add(speedo);

    // Handlebar Dual Rearview Mirrors
    [-0.34, 0.34].forEach((mx) => {
      const mirrorStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6),
        chromeMat
      );
      mirrorStem.position.set(mx, 1.24, -0.18);
      mirrorStem.rotation.z = mx > 0 ? -0.35 : 0.35;
      handlebarGroup.add(mirrorStem);

      const mirrorHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.05, 0.02),
        darkMat
      );
      mirrorHead.position.set(mx * 1.08, 1.32, -0.18);
      handlebarGroup.add(mirrorHead);
    });

    // Streetfighter Aerodynamic Headlamp & Bright Projector Light
    const hlCowl = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.22, 0.18),
      bikeMat
    );
    hlCowl.position.set(0, 1.02, 0.04);
    handlebarGroup.add(hlCowl);

    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 14),
      new THREE.MeshBasicMaterial({ color: '#fef08a' })
    );
    hl.position.set(0, 1.04, 0.12);
    handlebarGroup.add(hl);

    // Front Steerable Wheel with Disc Brake
    const frontWheelGroup = new THREE.Group();
    frontWheelGroup.position.set(0, 0.35, 0.04);
    frontWheelGroup.name = 'front_wheel';
    const fTire = new THREE.Mesh(wheelGeo, tireMat);
    fTire.scale.set(0.92, 0.92, 0.72);
    fTire.castShadow = true;
    frontWheelGroup.add(fTire);
    const discBrake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.02, 16).rotateZ(Math.PI / 2),
      chromeMat
    );
    discBrake.position.set(0.08, 0, 0);
    frontWheelGroup.add(discBrake);
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.10, 0.06),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.8, roughness: 0.3 })
    );
    caliper.position.set(0.09, 0.14, -0.06);
    frontWheelGroup.add(caliper);
    handlebarGroup.add(frontWheelGroup);

    // Chrome Exhaust Muffler Pipe
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.036, 0.72, 12).rotateX(Math.PI / 2),
      chromeMat
    );
    exhaust.position.set(0.18, 0.48, -0.45);
    exhaust.rotation.x = 0.15;
    group.add(exhaust);

    // Rear Fixed Wheel
    addWheel(0, 0.35, -0.76, 0.98);

    // 3D Human GLB Rider seated on Dhaka Motorcycle gripping handlebars (traffic only)
    if (hasDriver) {
      ensureModelLoaded('rpm_male', (gltf) => {
        if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
        try {
          const rider = SkeletonUtils.clone(gltf.scene);
          rider.name = 'npc_driver';
          rider.scale.setScalar(0.84);
          rider.position.set(0, 0.26, -0.14);

          const hipBendQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            1.05
          );
          const kneeBendQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -1.15
          );
          const leftArmQuat = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.42)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.45));
          const rightArmQuat = new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.42)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.45));

          rider.traverse((c) => {
            // Hide any fedora hat / headwear so traffic bikers have realistic hair/helmets
            if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
              c.visible = false;
            }
            if (c.name === 'Spine' || c.name === 'Spine1') {
              c.quaternion.multiply(
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.22)
              );
            } else if (c.name === 'LeftArm') {
              c.quaternion.multiply(leftArmQuat);
            } else if (c.name === 'RightArm') {
              c.quaternion.multiply(rightArmQuat);
            } else if (c.name === 'LeftUpLeg' || c.name === 'RightUpLeg') {
              c.quaternion.multiply(hipBendQuat);
            } else if (c.name === 'LeftLeg' || c.name === 'RightLeg') {
              c.quaternion.multiply(kneeBendQuat);
            }

            // Dress biker in dark leather biker jacket and dark denim jeans
            if ((c as THREE.Mesh).isMesh) {
              const m = c as THREE.Mesh;
              const nameLower = (m.name || '').toLowerCase();
              if (nameLower.includes('top') || nameLower.includes('outfit_top')) {
                m.material = new THREE.MeshStandardMaterial({
                  color: '#1e293b', // Sleek black leather biker jacket
                  roughness: 0.38,
                  metalness: 0.12,
                });
              } else if (nameLower.includes('bottom') || nameLower.includes('outfit_bottom')) {
                m.material = new THREE.MeshStandardMaterial({
                  color: '#334155', // Charcoal denim rider trousers
                  roughness: 0.65,
                  metalness: 0.05,
                });
              } else if (nameLower.includes('footwear') || nameLower.includes('shoes')) {
                m.material = new THREE.MeshStandardMaterial({
                  color: '#0f172a',
                  roughness: 0.45,
                });
              }
            }
          });
          group.add(rider);
        } catch {}
      });
    }

    return group;
  }

  // PHOTOREALISTIC 3D .GLB AUTOMOBILES FOR ALL CARS & DMP POLICE CRUISERS
  // Loads /models/CarConcept.glb (101-node 3D car with interior, brake discs & clearcoat paint)
  // and /models/ferrari.glb (51-mesh 3D sports sedan via DRACOLoader)
  const isPolice = type === 'police';
  const carPalette = [
    '#f8fafc', // Toyota Pearl White
    '#cbd5e1', // Metallic Silver
    '#1e3a8a', // Midnight Blue
    '#b91c1c', // Crimson Red
    '#0f172a', // Obsidian Black
    '#047857', // Emerald Metallic
    '#d97706', // Golden Amber
  ];
  const bodyHex = isPolice
    ? '#1e3a8a'
    : customColor || carPalette[Math.abs(seed) % carPalette.length];

  // Sculpted curved sedan placeholder shown only for the first ~50ms before GLB swap
  const fallbackGroup = new THREE.Group();
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: bodyHex,
    metalness: 0.65,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const sedanProfile = new THREE.Shape();
  sedanProfile.moveTo(-2.15, 0.28);
  sedanProfile.lineTo(2.15, 0.28);
  sedanProfile.quadraticCurveTo(2.26, 0.56, 2.08, 0.82);
  sedanProfile.lineTo(1.08, 0.92);
  sedanProfile.quadraticCurveTo(0.65, 1.38, 0.25, 1.44);
  sedanProfile.lineTo(-0.85, 1.44);
  sedanProfile.quadraticCurveTo(-1.35, 1.36, -1.62, 0.92);
  sedanProfile.lineTo(-2.12, 0.86);
  sedanProfile.quadraticCurveTo(-2.22, 0.58, -2.15, 0.28);

  const sedanGeo = new THREE.ExtrudeGeometry(sedanProfile, {
    depth: 1.78,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 5,
  });
  sedanGeo.rotateY(Math.PI / 2);
  sedanGeo.translate(-0.89, 0, 0);

  const fallbackBody = new THREE.Mesh(sedanGeo, paintMat);
  fallbackBody.castShadow = true;
  fallbackBody.receiveShadow = true;
  fallbackGroup.add(fallbackBody);
  group.add(fallbackGroup);

  const carModelKey: ModelKey =
    !isPolice && Math.abs(seed) % 2 === 1 ? 'ferrari' : 'car_concept';

  // BRTA Bangla registration plate (ঢাকা মেট্রো-গ ৩৪-৮৯১২) shared by body + accents
  const frontPlateTex = createBanglaNumberPlateTexture(
    isPolice
      ? `ঢাকা মেট্রো-প ১১-${1020 + (seed % 9) * 31}`
      : `ঢাকা মেট্রো-গ ৩৪-${5120 + (seed % 9) * 83}`,
    false
  );

  ensureModelLoaded(carModelKey, (gltf) => {
    try {
      const cloned = gltf.scene.clone(true);

      if (carModelKey === 'car_concept') {
        // CarConcept.glb tire contact patch sits at y = 0.000 once the baked
        // showroom wheel rotations are reset, so a 2cm lift keeps the tires
        // flush on the road without sinking the floor pan.
        cloned.scale.setScalar(1.06);
        cloned.position.y = 0.02;
      } else {
        // ferrari.glb faces -Z after load (headlights at -Z); rotating Y by
        // Math.PI faces +Z. Tires already touch y = 0 in model space.
        cloned.rotation.y = Math.PI;
        cloned.scale.setScalar(1.08);
        cloned.position.y = 0.02;
      }

      const targetColor = new THREE.Color(bodyHex);

      // Fix baked showroom wheel rotations on CarConcept.glb (cambered/drooped wheels)
      // and tag all 4 wheels so the engine can spin them. localX is the true axle.
      if (carModelKey === 'car_concept') {
        for (const wheelName of [
          'WheelFrontL',
          'WheelFrontR',
          'WheelRearL',
          'WheelRearR',
        ]) {
          const wheelNode = cloned.getObjectByName(wheelName);
          if (wheelNode) {
            wheelNode.rotation.set(0, 0, 0);
            wheelNode.name = 'wheel';
            wheelNode.userData.spinAxis = 'x';
            wheelNode.userData.steer =
              wheelName === 'WheelFrontL' || wheelName === 'WheelFrontR';
            wheelNode.userData.steerAxis = 'y';
          }
        }
      } else {
        // ferrari.glb: wheel parts (tire/rim/brake/centre/nuts) are SIBLINGS of a
        // node named 'wheel', so nothing visible ever rotated. Re-parent each
        // wheel's parts under a pivot at the hub, axle = local X (verified).
        for (const wheelName of [
          'wheel_fl',
          'wheel_fr',
          'wheel_rl',
          'wheel_rr',
        ]) {
          const hub = cloned.getObjectByName(wheelName);
          if (!hub) continue;
          const pivot = new THREE.Group();
          pivot.name = 'wheel';
          pivot.userData.spinAxis = 'x';
          const parts = hub.children.slice();
          if (parts.length === 0) continue;
          const hubInv = new THREE.Matrix4();
          hub.updateWorldMatrix(true, false);
          hubInv.copy(hub.matrixWorld).invert();
          const localMat = new THREE.Matrix4();
          for (const part of parts) {
            part.updateWorldMatrix(true, false);
            localMat.copy(hubInv).multiply(part.matrixWorld);
            localMat.decompose(part.position, part.quaternion, part.scale);
            // The rim mesh is also named 'wheel'; rename it so the engine only
            // spins the single pivot (avoids a double-speed rim).
            if (part.name === 'wheel') part.name = 'wheel_rim';
            hub.remove(part);
            pivot.add(part);
          }
          hub.add(pivot);
          pivot.userData.steer = wheelName === 'wheel_fl' || wheelName === 'wheel_fr';
        }
      }

      cloned.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const m = node as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          const origMat = Array.isArray(m.material)
            ? m.material[0]
            : m.material;
          if (!origMat) return;
          const mName = origMat.name || '';

          // ---- Body paint (CarConcept 'Paint 1/2', ferrari 'Body_Color') ----
          if (mName === 'Body_Color' || mName.startsWith('Paint 1')) {
            m.material = makeCarPaint(targetColor);
          } else if (mName.startsWith('Paint 2')) {
            if (m.name === 'BodyRoofPanel') {
              // Panoramic roof glass: dark, glossy, lightly transmissive.
              m.material = new THREE.MeshPhysicalMaterial({
                color: '#0b1220',
                transparent: true,
                opacity: 0.62,
                metalness: 0.1,
                roughness: 0.04,
                clearcoat: 1.0,
                clearcoatRoughness: 0.02,
                envMapIntensity: 1.5,
              });
            } else if (m.name === 'BodyHoodTopgrill') {
              m.material = new THREE.MeshStandardMaterial({
                color: '#111827',
                metalness: 0.85,
                roughness: 0.42,
              });
            } else if (m.name === 'BodyPanelsColor2') {
              // Contrasting trim: white livery on police, graphite on civilian.
              m.material = makeCarPaint(
                isPolice ? new THREE.Color('#f8fafc') : new THREE.Color('#232a33'),
                !isPolice
              );
            } else {
              m.material = makeCarPaint(
                isPolice ? new THREE.Color('#f8fafc') : targetColor
              );
            }
          } else if (mName === 'License') {
            const plateTex = createBanglaNumberPlateTexture(
              isPolice
                ? `ঢাকা মেট্রো-প ১১-${1020 + (seed % 9) * 31}`
                : `ঢাকা মেট্রো-গ ৩৪-${5120 + (seed % 9) * 83}`,
              false
            );
            m.material = new THREE.MeshStandardMaterial({
              map: plateTex,
              side: THREE.DoubleSide,
              roughness: 0.45,
              metalness: 0.1,
            });
          } else if (mName === 'Signallight') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#f59e0b',
              emissive: '#f59e0b',
              emissiveIntensity: 1.4,
              roughness: 0.15,
            });
          } else if (mName === 'Mirror') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#f8fafc',
              metalness: 1.0,
              roughness: 0.02,
              envMapIntensity: 2.0,
            });
          } else if (mName === 'Glass' || mName === 'Glass_Gray') {
            m.material = new THREE.MeshPhysicalMaterial({
              color: '#0b1220',
              transparent: true,
              opacity: 0.38,
              metalness: 0.1,
              roughness: 0.03,
              clearcoat: 1.0,
              clearcoatRoughness: 0.02,
              envMapIntensity: 1.6,
            });
          } else if (mName === 'Headlight' || mName === 'Projector_Glass') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#fefce8',
              emissive: '#fde68a',
              emissiveIntensity: 2.2,
              roughness: 0.06,
              metalness: 0.4,
            });
          } else if (
            mName === 'Brakelight' ||
            mName === 'Taillight_Glass' ||
            mName === 'Turn_Signal_LED'
          ) {
            m.material = new THREE.MeshStandardMaterial({
              color: '#dc2626',
              emissive: '#b91c1c',
              emissiveIntensity: 2.0,
              roughness: 0.12,
              metalness: 0.2,
            });
          } else if (mName === 'Rim1' || mName === 'Rim2') {
            // Polished alloy: bright metal, sharp environment reflections.
            m.material = new THREE.MeshStandardMaterial({
              color: '#cbd5e1',
              metalness: 1.0,
              roughness: 0.16,
              envMapIntensity: 1.8,
            });
          } else if (
            mName === 'metal_chrome' ||
            mName === 'metal_gray' ||
            mName === 'Hardware'
          ) {
            m.material = new THREE.MeshStandardMaterial({
              color: '#e2e8f0',
              metalness: 1.0,
              roughness: 0.12,
              envMapIntensity: 1.9,
            });
          } else if (mName === 'Brake') {
            // Brake caliper: painted, slightly rough cast metal.
            m.material = new THREE.MeshStandardMaterial({
              color: isPolice ? '#1d4ed8' : '#b91c1c',
              metalness: 0.55,
              roughness: 0.42,
            });
          } else if (mName === 'Disc') {
            const clonedMat = (origMat as THREE.MeshStandardMaterial).clone();
            clonedMat.roughness = 0.42;
            clonedMat.metalness = 0.85;
            m.material = clonedMat;
          } else if (mName === 'Tireside') {
            // Keep the baked tire sidewall (branding/lettering) but make it rubber.
            const clonedMat = (origMat as THREE.MeshStandardMaterial).clone();
            clonedMat.roughness = 0.88;
            clonedMat.metalness = 0.0;
            m.material = clonedMat;
          } else if (mName === 'Tiretread' || mName === 'Tires') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#0d1014',
              roughness: 0.94,
              metalness: 0.02,
            });
          } else if (mName === 'Carbon_Fiber' || mName === 'carbon_fibre_trim') {
            m.material = makeCarbonFibre();
          } else if (mName === 'Leather') {
            m.material = makeLeather('#1e2229');
          } else if (mName === 'Leather_red' || mName === 'trim') {
            m.material = makeLeather('#7f1d1d');
          } else if (mName === 'Interior_dark' || mName === 'Interior_light') {
            m.material = makeAlcantara();
          } else if (mName === 'Carpet') {
            m.material = makeAlcantara();
          } else if (mName === 'plastic_gray') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#2b3038',
              roughness: 0.72,
              metalness: 0.05,
            });
          } else if (mName === 'Ferrari_Yellow') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#facc15',
              metalness: 0.3,
              roughness: 0.35,
            });
          } else if (mName === '_0098_DodgerBlue') {
            m.material = new THREE.MeshStandardMaterial({
              color: '#1d4ed8',
              metalness: 0.4,
              roughness: 0.4,
            });
          } else if (mName === 'Dashboard') {
            m.material = new THREE.MeshPhysicalMaterial({
              color: '#15181d',
              metalness: 0.1,
              roughness: 0.6,
              clearcoat: 0.4,
            });
          } else if (
            mName.startsWith('Interior') ||
            mName === 'Floormat' ||
            mName === 'Panel Sides'
          ) {
            // Interior trims: soft-touch surfaces with a subtle sheen.
            const clonedMat = (origMat as THREE.MeshStandardMaterial).clone();
            clonedMat.roughness = Math.max(0.5, clonedMat.roughness ?? 0.5);
            clonedMat.metalness = 0.05;
            m.material = clonedMat;
          }
        }
      });

      group.remove(fallbackGroup);
      group.add(cloned);

      // 3D Human driver seated in the car's driver seat (traffic only)
      if (hasDriver) {
        ensureModelLoaded(isPolice ? 'soldier' : 'readyplayerme1', (driverGltf) => {
          if (!hasDriver || (group as any).isPlayerDriven || group.userData?.noDriver) return;
          try {
            const driver = SkeletonUtils.clone(driverGltf.scene);
            driver.name = 'npc_driver';
            driver.scale.setScalar(0.72);
            driver.position.set(-0.35, 0.22, 0.08);
            driver.rotation.y = 0;
            driver.traverse((c) => {
              if (c.name === 'Mesh' || c.name === 'Wolf3D_Headwear') {
                c.visible = false;
              }
            });
            cloned.add(driver);
          } catch {}
        });
      }

      // Fit plates / glow / beacon to this GLB's real bounds (local space).
      if (carModelKey === 'car_concept') {
        const sc = cloned.scale.x;
        fitCarAccents(cloned, {
          fx: 0,
          fy: 0.3 * sc + cloned.position.y,
          fz: 2.2 * sc,
          rx: 0,
          ry: 0.33 * sc + cloned.position.y,
          rz: -1.9 * sc,
          hx: 0.52 * sc,
          hy: 0.66 * sc + cloned.position.y,
          hz: 2.2 * sc,
          tx: 0.6 * sc,
          ty: 0.97 * sc + cloned.position.y,
          tz: -1.56 * sc,
          topY: 1.16 * sc + cloned.position.y,
          topZ: 0.2,
          plateInside: 0.01,
        }, isPolice, seed, frontPlateTex);
      } else {
        // ferrari.glb is authored front-at--Z and then flipped by rotation.y = PI,
        // so its front work is the -Z side of local space (was inverted before).
        const sc = cloned.scale.x;
        fitCarAccents(cloned, {
          fx: 0,
          fy: 0.24 * sc + cloned.position.y,
          fz: -2.19 * sc,
          rx: 0,
          ry: 0.26 * sc + cloned.position.y,
          rz: 2.12 * sc,
          hx: 0.63 * sc,
          hy: 0.6 * sc + cloned.position.y,
          hz: -2.19 * sc,
          tx: 0.62 * sc,
          ty: 0.86 * sc + cloned.position.y,
          tz: 2.13 * sc,
          topY: 1.2 * sc + cloned.position.y,
          topZ: -0.1,
          plateInside: 0.01,
        }, isPolice, seed, frontPlateTex);
      }
    } catch {}
  });

  // Plates, headlight/taillight glow and the police beacon are fitted to the
  // loaded bodywork inside the loader callback above (see fitCarAccents), so
  // they always land on the real model instead of a guessed offset.

  return group;
}

export interface RpmBoneRig {
  leftUpLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightUpLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftFoot?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightFoot?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftForeArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightForeArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  spine?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  phase: number;
}

export interface CharacterLimbs {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  head: THREE.Object3D;
  weaponMesh: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions?: {
    idle?: THREE.AnimationAction;
    walk?: THREE.AnimationAction;
    run?: THREE.AnimationAction;
  };
  currentActionName?: 'idle' | 'walk' | 'run';
  gltfRoot?: THREE.Object3D;
  rpmRig?: RpmBoneRig;
  driveRig?: RpmBoneRig;
  weaponHand?: THREE.Object3D;
  fingerBones?: Array<{ bone: THREE.Object3D; rest: THREE.Quaternion }>;
  gripAmount?: number;
  aimBones?: {
    rightArm: THREE.Object3D;
    rightArmRest: THREE.Quaternion;
    rightForeArm: THREE.Object3D;
    rightForeArmRest: THREE.Quaternion;
    leftArm?: THREE.Object3D;
    leftArmRest?: THREE.Quaternion;
    leftForeArm?: THREE.Object3D;
    leftForeArmRest?: THREE.Quaternion;
    spine?: THREE.Object3D;
    spineRest?: THREE.Quaternion;
  };
}

const SOUTH_ASIAN_SKIN_TONES = [
  '#f5d0b5',
  '#e2b18c',
  '#c9936b',
  '#b07850',
  '#96613d',
  '#dfaa82',
];

const LUNGI_PALETTES = [
  { a: '#1e3a8a', b: '#38bdf8' },
  { a: '#065f46', b: '#fde047' },
  { a: '#7f1d1d', b: '#fca5a5' },
  { a: '#4c1d95', b: '#c4b5fd' },
];

const HAIR_COLORS = ['#0f172a', '#1c1917', '#292524', '#44403c', '#cbd5e1'];

let characterSeedCounter = 0;

/**
 * Loads ACTUAL 3D HUMAN .GLB MODELS for every character and pedestrian in Dhaka City:
 * - /models/rpm_male.glb (ReadyPlayerMe 3D Human Man with full sculpted 3D hair, face, 3D eyes, teeth, top, trousers, shoes)
 * - /models/readyplayerme1.glb (ReadyPlayerMe 3D Human Man with 3D beard, cap/tupi headwear, face, eyes, jacket/panjabi, trousers/lungi)
 * - /models/HVGirl.glb (3D Human Woman with realistic face, eyes, hair, T-shirt/blouse, skirt & native skeletal animations)
 * - /models/Michelle.glb (3D Human Woman in street attire)
 * - /models/Soldier.glb (3D Tactical Human Officer for DMP Police & Security Guards)
 *
 * Every instance clones its materials and customizes skin tone, hair/beard visibility & color,
 * headwear (Tupi skullcap, Gamcha cap, or bare-headed hair), shirt/saree/panjabi colors,
 * and checkered Bangladeshi Lungi textures so NO TWO humans look identical.
 */
export function createCharacterMesh(
  shirtColor: string,
  pantsColor: string,
  role?: NPCRole,
  isStoryNPC = false,
  storyId?: string,
  isPlayer = false
): CharacterLimbs {
  const seed = isPlayer
    ? 0
    : storyId
    ? storyId.charCodeAt(storyId.length - 1) * 17
    : ++characterSeedCounter;

  const group = new THREE.Group();

  // Dummy Pivot Nodes for backwards-compatibility while .GLB loads
  const leftLeg = new THREE.Object3D();
  const rightLeg = new THREE.Object3D();
  const leftArm = new THREE.Object3D();
  const rightArm = new THREE.Object3D();
  const head = new THREE.Object3D();
  const weaponMesh = new THREE.Group();

  const limbs: CharacterLimbs = {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    head,
    weaponMesh,
  };

  const isNadia = Boolean(storyId?.includes('nadia'));
  const isKamal = Boolean(storyId?.includes('kamal'));
  const isSikder = Boolean(storyId?.includes('sikder'));
  const isPolice = role === 'police_officer';

  const isFemale =
    isNadia ||
    (!isPlayer &&
      !isKamal &&
      !isSikder &&
      !isPolice &&
      role !== 'rickshaw_puller' &&
      seed % 3 === 1);

  const wearsLungi =
    !isPlayer &&
    !isFemale &&
    (role === 'rickshaw_puller' ||
      role === 'tea_seller' ||
      role === 'street_vendor');

  const isHajiElder =
    !isPlayer && !isFemale && (role === 'shopkeeper' || isSikder);

  // Choose which Actual 3D Human .GLB Model to load for this person
  let modelKey: ModelKey = 'rpm_male';
  if (isPlayer) {
    modelKey = 'rpm_male'; // Realistic 3D Human Man with full hair for Arif Rahman
  } else if (isFemale) {
    modelKey = 'michelle'; // Photorealistic 3D Human Woman
  } else if (isPolice) {
    modelKey = 'soldier';
  } else if (isKamal || isSikder || isHajiElder || wearsLungi) {
    modelKey = seed % 3 === 0 ? 'rpm_male' : 'readyplayerme1';
  } else {
    modelKey = seed % 2 === 0 ? 'rpm_male' : 'readyplayerme1';
  }

  ensureModelLoaded(modelKey, (gltf) => {
    try {
      const clonedScene = SkeletonUtils.clone(gltf.scene);

      // Exact verified human scale for each .GLB model so every human stands ~1.72m - 1.82m
      // with shoes planted flush on y = 0 (avoids SkinnedMesh Box3 distortion)
      const heightVar = isPlayer ? 1.0 : 0.96 + (seed % 5) * 0.025;
      const widthVar = isKamal
        ? 1.12
        : isSikder
        ? 1.14
        : isPlayer
        ? 1.0
        : 0.95 + (seed % 4) * 0.035;

      if (modelKey === 'soldier' || modelKey === 'michelle') {
        // Uniform scaling only — non-uniform Y stretch visibly distorts faces
        // and limbs on fully sculpted humans.
        const s = heightVar;
        clonedScene.scale.setScalar(s);
      } else {
        // rpm_male.glb (1.85m native) and readyplayerme1.glb (1.87m native)
        const baseScale = 0.96;
        clonedScene.scale.set(
          baseScale * widthVar,
          baseScale * heightVar,
          baseScale * widthVar
        );
      }

      // Face forward (+Z) in the game engine's coordinate system
      if (modelKey === 'soldier') {
        clonedScene.rotation.y = Math.PI;
      }

      const skinTint = new THREE.Color(
        SOUTH_ASIAN_SKIN_TONES[seed % SOUTH_ASIAN_SKIN_TONES.length]
      );
      // Keep garment colours close to the authored palette: heavy white mixing
      // was making panjabis and shirts look neon and plastic.
      const brightTopTint = new THREE.Color(
        isSikder ? '#334155' : shirtColor
      ).lerp(new THREE.Color('#ffffff'), 0.12);
      const brightBottomTint = new THREE.Color(
        isSikder ? '#e2e8f0' : pantsColor
      ).lerp(new THREE.Color('#ffffff'), 0.1);
      const lungiPal = LUNGI_PALETTES[seed % LUNGI_PALETTES.length];
      const lungiTex = wearsLungi
        ? createLungiPatternTexture(lungiPal.a, lungiPal.b)
        : null;

      // Customize sub-meshes & materials while preserving photorealistic baked PBR textures!
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;

          // Hide sci-fi helmet visor on Soldier.glb so DMP officer looks human
          if (m.name === 'vanguard_visor') {
            m.visible = false;
            return;
          }

          // Player (Arif Rahman) is a young Dhaka hero: ALWAYS clean dark hair, NO fedora hat / headwear / beard
          if (isPlayer) {
            if (
              m.name === 'Wolf3D_Headwear' ||
              m.name === 'Mesh' ||
              m.name === 'Wolf3D_Beard'
            ) {
              m.visible = false;
              return;
            }
          }

          // Beard & headwear for NPCs: readyplayerme1.glb uses 'Wolf3D_Beard' and
          // 'Wolf3D_Headwear' / 'Mesh'. Women and player never get a beard.
          if (m.name === 'Wolf3D_Beard') {
            m.visible =
              !isPlayer &&
              !isFemale &&
              (isKamal ||
                isSikder ||
                isHajiElder ||
                wearsLungi ||
                seed % 2 === 0);
          }
          if (m.name === 'Mesh' || m.name === 'Wolf3D_Headwear') {
            m.visible =
              !isPlayer &&
              !isFemale &&
              (isHajiElder || isKamal || (wearsLungi && seed % 2 === 0));
          }

          const mat = (
            Array.isArray(m.material)
              ? m.material[0].clone()
              : (m.material as THREE.MeshStandardMaterial).clone()
          ) as THREE.MeshStandardMaterial;
          m.material = mat;
          if (modelKey === 'michelle') {
            mat.roughness = Math.min(0.85, Math.max(0.6, mat.roughness ?? 0.7));
            mat.metalness = 0;
          }
          const matName = mat.name || '';

          if (
            m.name === 'Wolf3D_Outfit_Top' ||
            matName === 'Wolf3D_Outfit_Top' ||
            matName === 'T-shirt'
          ) {
            mat.color.copy(brightTopTint);
            mat.roughness = 0.88;
            mat.metalness = 0.0;
            if ('sheen' in mat) {
              (mat as THREE.MeshPhysicalMaterial).sheen = 0.35;
              (mat as THREE.MeshPhysicalMaterial).sheenColor =
                new THREE.Color('#ffffff');
            }
          } else if (
            m.name === 'Wolf3D_Outfit_Bottom' ||
            matName === 'Wolf3D_Outfit_Bottom' ||
            matName === 'short'
          ) {
            if (wearsLungi && lungiTex) {
              mat.map = lungiTex;
              mat.color.set('#ffffff');
            } else {
              mat.color.copy(brightBottomTint);
            }
            mat.roughness = 0.9;
            mat.metalness = 0.0;
          } else if (
            m.name === 'Wolf3D_Skin' ||
            m.name === 'Wolf3D_Head' ||
            m.name === 'Wolf3D_Body' ||
            matName === 'Wolf3D_Skin' ||
            matName === 'skin'
          ) {
            mat.color.set('#ffffff').lerp(skinTint, 0.55);
          } else if (m.name === 'Mesh' || matName === 'Wolf3D_Headwear') {
            mat.color.set(
              isHajiElder ? '#ffffff' : wearsLungi ? '#f87171' : '#93c5fd'
            );
          } else if (modelKey === 'soldier') {
            mat.color.set('#ffffff').lerp(brightTopTint, 0.18);
          }

          m.material = mat;
        }
      });

      // Set up skeletal animation: native AnimationMixer for Soldier,
      // and smooth humanoid bone rig for ReadyPlayerMe & Michelle
      if (
        modelKey === 'soldier' &&
        gltf.animations &&
        gltf.animations.length > 0
      ) {
        const mixer = new THREE.AnimationMixer(clonedScene);
        const idleClip =
          THREE.AnimationClip.findByName(gltf.animations, 'Idle') ||
          THREE.AnimationClip.findByName(gltf.animations, 'idle') ||
          gltf.animations[0];
        const walkClip =
          THREE.AnimationClip.findByName(gltf.animations, 'Walk') ||
          THREE.AnimationClip.findByName(gltf.animations, 'Walking') ||
          THREE.AnimationClip.findByName(gltf.animations, 'walk') ||
          idleClip;
        const runClip =
          THREE.AnimationClip.findByName(gltf.animations, 'Run') ||
          THREE.AnimationClip.findByName(gltf.animations, 'run') ||
          walkClip;

        const actions: CharacterLimbs['actions'] = {};
        if (idleClip) {
          actions.idle = mixer.clipAction(idleClip);
          actions.idle.play();
        }
        if (walkClip) actions.walk = mixer.clipAction(walkClip);
        if (runClip) actions.run = mixer.clipAction(runClip);

        limbs.mixer = mixer;
        limbs.actions = actions;
        limbs.currentActionName = 'idle';
      } else {
        // Humanoid Skeleton Bone Rig (rpm_male.glb, readyplayerme1.glb, Michelle.glb)
        const rig: RpmBoneRig = { phase: seed * 1.3 };
        // Relaxed arm quaternions in Mixamo shoulder space so Michelle is never in T-pose
        const relaxedLeftArmQuat = new THREE.Quaternion(
          0.476682,
          0.0426,
          -0.058619,
          0.876084
        );
        const relaxedRightArmQuat = new THREE.Quaternion(
          0.47668,
          -0.042601,
          0.058619,
          0.876085
        );
        // Bring ReadyPlayerMe arms inward from 30° A-pose to natural relaxed standing posture
        const rpmAdductQuat = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          0.3
        );

        clonedScene.traverse((node) => {
          const n = node.name.replace(/^mixamorig[:_]?/, '');
          if (n === 'LeftUpLeg')
            rig.leftUpLeg = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'RightUpLeg')
            rig.rightUpLeg = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'LeftLeg')
            rig.leftLeg = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'RightLeg')
            rig.rightLeg = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'LeftFoot')
            rig.leftFoot = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'RightFoot')
            rig.rightFoot = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'LeftArm') {
            if (modelKey === 'michelle') {
              node.quaternion.copy(relaxedLeftArmQuat);
            } else {
              node.quaternion.multiply(rpmAdductQuat);
            }
            rig.leftArm = { bone: node, rest: node.quaternion.clone() };
          } else if (n === 'RightArm') {
            if (modelKey === 'michelle') {
              node.quaternion.copy(relaxedRightArmQuat);
            } else {
              node.quaternion.multiply(rpmAdductQuat);
            }
            rig.rightArm = { bone: node, rest: node.quaternion.clone() };
          } else if (n === 'LeftForeArm')
            rig.leftForeArm = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'RightForeArm')
            rig.rightForeArm = { bone: node, rest: node.quaternion.clone() };
          else if (n === 'Spine')
            rig.spine = { bone: node, rest: node.quaternion.clone() };
        });
        limbs.rpmRig = rig;
        limbs.driveRig = rig;
      }

      // Upgrade to real 65-bone Mixamo motion capture from HVGirl.glb
      // (Idle + Walking) retargeted onto rpm_male / readyplayerme1 / Michelle.
      // Verified in Node: Head stays ~[0,1.64,-0.04], hands swing naturally.
      if (modelKey !== 'soldier') {
        ensureModelLoaded('hvgirl', (hvGltf) => {
          try {
            if (!hvGltf.animations || hvGltf.animations.length === 0) return;
            const isMichelle = modelKey === 'michelle';
            // HVGirl.glb is authored Z-up, so its Hips rotation only lines up
            // with the Y-up RPM rig after a -90deg X correction. Michelle.glb
            // already shares HVGirl's rig/orientation and needs no fix, but its
            // mocap translations are in a different unit, so scale them down.
            const hipsFix = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0),
              Math.PI / 2
            );
            const retarget = (clip: THREE.AnimationClip) => {
              const c = clip.clone();
              // HVGirl.glb's clips carry centimetre-scale .position/.scale tracks
              // that would shatter the RPM skeleton; rotation-only retargeting
              // keeps Head at ~1.64m with hands at ±0.30m (verified in Node).
              c.tracks = c.tracks
                .filter((track) => track.name.endsWith('.quaternion'))
                .map((track) => {
                const t = track.clone();
                t.name = t.name.replace(/^mixamorig[:_]?/, '');
                if (!isMichelle && t.name === 'Hips.quaternion') {
                  const v = (t as unknown as { values: number[] }).values;
                  const q = new THREE.Quaternion();
                  const q2 = new THREE.Quaternion();
                  for (let i = 0; i < v.length; i += 4) {
                    q.set(v[i], v[i + 1], v[i + 2], v[i + 3]);
                    q2.copy(hipsFix).multiply(q);
                    v[i] = q2.x;
                    v[i + 1] = q2.y;
                    v[i + 2] = q2.z;
                    v[i + 3] = q2.w;
                  }
                }
                return t;
              });
              return c;
            };
            const idleClip =
              THREE.AnimationClip.findByName(hvGltf.animations, 'Idle') ||
              hvGltf.animations[0];
            const walkClip =
              THREE.AnimationClip.findByName(hvGltf.animations, 'Walking') ||
              THREE.AnimationClip.findByName(hvGltf.animations, 'Walk') ||
              idleClip;
            if (!idleClip) return;
            // GLTFLoader sanitizes 'mixamorig:' to 'mixamorig_', so Michelle's
            // bones must be renamed to the bare Mixamo names or the clips
            // silently bind to nothing (verified: hips stayed frozen before).
            if (isMichelle) {
              clonedScene.traverse((o) => {
                if (o.name.startsWith('mixamorig')) {
                  o.name = o.name.replace(/^mixamorig[:_]?/, '');
                }
              });
            }
            const mixer = new THREE.AnimationMixer(clonedScene);
            const actions: CharacterLimbs['actions'] = {};
            actions.idle = mixer.clipAction(retarget(idleClip));
            actions.idle.play();
            // De-sync the crowd so no two people breathe/stand in lockstep.
            actions.idle.time =
              ((seed * 0.6180339887) % 1) * idleClip.duration;
            actions.idle.timeScale = 0.92 + ((seed % 7) / 7) * 0.18;
            if (walkClip) actions.walk = mixer.clipAction(retarget(walkClip));
            if (walkClip) {
              actions.run = mixer.clipAction(retarget(walkClip));
              actions.run.timeScale = 1.7;
            }
            limbs.mixer = mixer;
            limbs.actions = actions;
            limbs.currentActionName = 'idle';
            limbs.rpmRig = undefined;
          } catch {}
        });
      }

      // Cache upper-body bones for aim/slash overrides on the mixer path.
      {
        let ra: THREE.Object3D | undefined;
        let rfa: THREE.Object3D | undefined;
        let la: THREE.Object3D | undefined;
        let lfa: THREE.Object3D | undefined;
        let sp: THREE.Object3D | undefined;
        clonedScene.traverse((node) => {
          const n = node.name.replace(/^mixamorig[:_]?/, '');
          if (n === 'RightArm' && !ra) ra = node;
          else if (n === 'RightForeArm' && !rfa) rfa = node;
          else if (n === 'LeftArm' && !la) la = node;
          else if (n === 'LeftForeArm' && !lfa) lfa = node;
          else if (n === 'Spine' && !sp) sp = node;
        });
        if (ra && rfa) {
          limbs.aimBones = {
            rightArm: ra,
            rightArmRest: ra.quaternion.clone(),
            rightForeArm: rfa,
            rightForeArmRest: rfa.quaternion.clone(),
            leftArm: la,
            leftArmRest: la ? la.quaternion.clone() : undefined,
            leftForeArm: lfa,
            leftForeArmRest: lfa ? lfa.quaternion.clone() : undefined,
            spine: sp,
            spineRest: sp ? sp.quaternion.clone() : undefined,
          };
        }
      }

      // Attach weapon to the RightHand bone so it tracks the hand exactly.
      {
        let rightHand: THREE.Object3D | undefined;
        clonedScene.traverse((node) => {
          if (!rightHand && node.name.replace(/^mixamorig[:_]?/, '') === 'RightHand') {
            rightHand = node;
          }
        });
        if (rightHand) {
          limbs.weaponHand = rightHand;
          // Cache every right-hand finger joint so the hand can close into a grip.
          const fingers: Array<{
            bone: THREE.Object3D;
            rest: THREE.Quaternion;
          }> = [];
          clonedScene.traverse((node) => {
            if (
              /^RightHand(Thumb|Index|Middle|Ring|Pinky)[1-4]$/.test(
                node.name.replace(/^mixamorig[:_]?/, '')
              )
            ) {
              fingers.push({ bone: node, rest: node.quaternion.clone() });
            }
          });
          limbs.fingerBones = fingers;
          rightHand.add(weaponMesh);
          weaponMesh.position.set(0, 0, 0.06);
          weaponMesh.rotation.set(0.22, 0, 0);
        } else {
          weaponMesh.position.set(-0.26, 1.02, 0.16);
          group.add(weaponMesh);
        }
      }
      group.add(clonedScene);
      limbs.gltfRoot = clonedScene;

      // Story Contact Overhead 3D Gold Beacon
      if (isStoryNPC) {
        const beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.16, 0),
          new THREE.MeshBasicMaterial({ color: '#facc15' })
        );
        beacon.position.set(0, 2.08, 0);
        group.add(beacon);
      }
    } catch {}
  });

  return limbs;
}


const _hwPos = new THREE.Vector3();
const _hwQuat = new THREE.Quaternion();
const _hwTmp = new THREE.Vector3();

/**
 * Accumulates the world position / rotation of `node` up to `root` without
 * touching matrixWorld (cheap enough to run per character, per frame).
 */
function accumulateTransform(
  node: THREE.Object3D,
  root: THREE.Object3D,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
) {
  const chain: THREE.Object3D[] = [];
  let cur: THREE.Object3D | null = node;
  while (cur && cur !== root) {
    chain.push(cur);
    cur = cur.parent;
  }
  outPos.set(0, 0, 0);
  outQuat.identity();
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i];
    _hwTmp.copy(n.position).applyQuaternion(outQuat);
    outPos.add(_hwTmp);
    outQuat.multiply(n.quaternion);
  }
}

const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);
const _tmpQuat = new THREE.Quaternion();

export function setCharacterAnimationState(
  limbs: CharacterLimbs,
  targetState: 'idle' | 'walk' | 'run',
  dt: number,
  attackTimer = 0,
  isAimingGun = false,
  /** Playback speed for the walk/run clip; keeps feet in sync with the ground. */
  speedScale = 1,
  weaponCategory: 'fists' | 'melee' | 'pistol' | 'rifle' = 'fists',
  comboStep = 0
) {
  // Close the right hand into a grip around the weapon (fingers curl on +X,
  // measured on the live RPM hand: index tip travels 3.0cm toward the palm at
  // 0.7 rad). Relaxed when nothing is held.
  if (limbs.fingerBones && limbs.fingerBones.length > 0) {
    const holdsWeapon = limbs.weaponMesh.children.length > 0;
    const target = holdsWeapon ? 1 : 0;
    // Reuse the rig accumulator's field for smoothing.
    const cur = limbs.gripAmount ?? target;
    const next = cur + (target - cur) * Math.min(1, dt * 9);
    limbs.gripAmount = next;
    for (const f of limbs.fingerBones) {
      const name = f.bone.name.replace(/^mixamorig[:_]?/, '');
      const isThumb = name.startsWith('RightHandThumb');
      // Thumb wraps across the grip and therefore curls less.
      const amount = next * (isThumb ? 0.45 : 1.15);
      _tmpQuat.setFromAxisAngle(_axisX, amount);
      f.bone.quaternion.copy(f.rest).multiply(_tmpQuat);
    }
  }

  // Animate 3D weapon held in RightHand. When attached to the hand bone,
  // positions are local to the hand; otherwise they are group-space.
  if (limbs.weaponMesh) {
    const attachedToHand =
      limbs.weaponMesh.parent && limbs.weaponMesh.parent !== limbs.group;
    if (attachedToHand) {
      if (weaponCategory === 'rifle') {
        if (isAimingGun || attackTimer > 0) {
          const recoil = attackTimer > 0 ? Math.sin(attackTimer * 28) * 0.16 : 0;
          limbs.weaponMesh.position.set(0.01, -0.01, 0.10 - recoil * 0.28);
          limbs.weaponMesh.rotation.set(-recoil * 0.75, 0, 0);
        } else {
          // Low-ready patrol angle
          limbs.weaponMesh.position.set(0.03, -0.04, 0.08);
          limbs.weaponMesh.rotation.set(0.48, 0.12, 0);
        }
      } else if (weaponCategory === 'pistol') {
        if (isAimingGun || attackTimer > 0) {
          const recoil = attackTimer > 0 ? Math.sin(attackTimer * 28) * 0.22 : 0;
          limbs.weaponMesh.position.set(0, 0, 0.07 - recoil * 0.25);
          limbs.weaponMesh.rotation.set(-recoil * 1.1, 0, 0);
        } else {
          // Low-ready sidearm angle
          limbs.weaponMesh.position.set(0, -0.02, 0.06);
          limbs.weaponMesh.rotation.set(0.38, 0, 0);
        }
      } else if (attackTimer > 0) {
        if (comboStep === 1) {
          // Horizontal Cleave / Bat Swing
          const sweep = Math.sin((1 - attackTimer / 0.35) * Math.PI);
          limbs.weaponMesh.position.set(-sweep * 0.09, 0, 0.07 + sweep * 0.06);
          limbs.weaponMesh.rotation.set(0.2, sweep * 1.8, -sweep * 0.5);
        } else if (comboStep === 2) {
          // Brutal Uppercut / Smash
          const fin = Math.sin((1 - attackTimer / 0.35) * Math.PI);
          limbs.weaponMesh.position.set(0, -0.04 + fin * 0.15, 0.07 + fin * 0.08);
          limbs.weaponMesh.rotation.set(-fin * 1.4, 0, fin * 0.35);
        } else {
          // Diagonal / Overhead Chop
          const slash = Math.sin((1 - attackTimer / 0.35) * Math.PI);
          limbs.weaponMesh.position.set(0, slash * 0.06, 0.07 + slash * 0.05);
          limbs.weaponMesh.rotation.set(slash * 1.55, slash * 0.35, 0);
        }
      } else if (weaponCategory === 'melee') {
        limbs.weaponMesh.position.set(0, 0, 0.07);
        limbs.weaponMesh.rotation.set(0.32, 0.12, 0);
      } else {
        limbs.weaponMesh.position.set(0, 0, 0.06);
        limbs.weaponMesh.rotation.set(0.22, 0, 0);
      }
    } else if (isAimingGun) {
      const recoil = attackTimer > 0 ? Math.sin(attackTimer * 28) * 0.14 : 0;
      limbs.weaponMesh.position.set(-0.25, 1.33, 0.46 - recoil * 0.5);
      limbs.weaponMesh.rotation.set(-recoil, 0, 0);
    } else if (attackTimer > 0) {
      const slash = Math.sin((1 - attackTimer / 0.35) * Math.PI);
      limbs.weaponMesh.position.set(
        -0.26 + slash * 0.18,
        1.16 - slash * 0.22,
        0.38 + slash * 0.28
      );
      limbs.weaponMesh.rotation.set(slash * 1.45, slash * 0.45, 0);
    } else {
      limbs.weaponMesh.position.set(-0.28, 1.0, 0.18);
      limbs.weaponMesh.rotation.set(0.22, 0, 0);
    }
  }

  // 1. Drive ReadyPlayerMe & Michelle 3D Human Skeleton Bones smoothly
  if (limbs.rpmRig) {
    const rig = limbs.rpmRig;
    const speed =
      targetState === 'run' ? 14 : targetState === 'walk' ? 9 : 2.2;
    rig.phase += dt * speed;

    const amp =
      targetState === 'run' ? 0.65 : targetState === 'walk' ? 0.42 : 0.03;
    const s = Math.sin(rig.phase) * amp;

    if (rig.leftUpLeg) {
      _tmpQuat.setFromAxisAngle(_axisX, s);
      rig.leftUpLeg.bone.quaternion
        .copy(rig.leftUpLeg.rest)
        .multiply(_tmpQuat);
    }
    if (rig.rightUpLeg) {
      _tmpQuat.setFromAxisAngle(_axisX, -s);
      rig.rightUpLeg.bone.quaternion
        .copy(rig.rightUpLeg.rest)
        .multiply(_tmpQuat);
    }
    if (rig.leftLeg) {
      const kneeBend = targetState === 'idle' ? 0 : -Math.max(0, -s) * 0.85;
      _tmpQuat.setFromAxisAngle(_axisX, kneeBend);
      rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest).multiply(_tmpQuat);
    }
    if (rig.rightLeg) {
      const kneeBend = targetState === 'idle' ? 0 : -Math.max(0, s) * 0.85;
      _tmpQuat.setFromAxisAngle(_axisX, kneeBend);
      rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest).multiply(_tmpQuat);
    }
    if (rig.leftFoot) {
      const ankleFlex = targetState === 'idle' ? 0 : s * 0.32;
      _tmpQuat.setFromAxisAngle(_axisX, ankleFlex);
      rig.leftFoot.bone.quaternion.copy(rig.leftFoot.rest).multiply(_tmpQuat);
    }
    if (rig.rightFoot) {
      const ankleFlex = targetState === 'idle' ? 0 : -s * 0.32;
      _tmpQuat.setFromAxisAngle(_axisX, ankleFlex);
      rig.rightFoot.bone.quaternion.copy(rig.rightFoot.rest).multiply(_tmpQuat);
    }
    if (rig.spine) {
      const sprintLean =
        targetState === 'run'
          ? 0.14
          : targetState === 'walk'
          ? 0.05
          : Math.sin(rig.phase) * 0.015;
      _tmpQuat.setFromAxisAngle(_axisX, sprintLean);
      rig.spine.bone.quaternion.copy(rig.spine.rest).multiply(_tmpQuat);
    }
    if (limbs.gltfRoot) {
      limbs.gltfRoot.position.y =
        targetState === 'idle' ? 0 : Math.abs(Math.sin(rig.phase)) * 0.025;
    }
    if (rig.leftArm && rig.leftForeArm) {
      if (weaponCategory === 'rifle') {
        if (isAimingGun || attackTimer > 0) {
          _tmpQuat.setFromAxisAngle(_axisZ, 1.15);
          rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, 0.45);
          rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(_tmpQuat);
        } else {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.45);
          rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, 0.32);
          rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(_tmpQuat);
        }
      } else if (weaponCategory === 'pistol' && (isAimingGun || attackTimer > 0)) {
        _tmpQuat.setFromAxisAngle(_axisZ, 0.85);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, 0.55);
        rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(_tmpQuat);
      } else if (weaponCategory === 'fists' && attackTimer > 0) {
        if (comboStep === 0) {
          const p = Math.sin((attackTimer / 0.32) * Math.PI);
          _tmpQuat.setFromAxisAngle(_axisZ, 1.35 * p);
          rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, 0.25 * p);
          rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(_tmpQuat);
        } else {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.72);
          rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, 0.65);
          rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(_tmpQuat);
        }
      } else {
        _tmpQuat.setFromAxisAngle(_axisZ, -s * 0.7);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
        const elbowBend =
          targetState === 'run'
            ? -0.65 - Math.max(0, s) * 0.35
            : targetState === 'walk'
            ? -0.28 - Math.max(0, s) * 0.22
            : -0.12;
        _tmpQuat.setFromAxisAngle(_axisZ, elbowBend);
        rig.leftForeArm.bone.quaternion
          .copy(rig.leftForeArm.rest)
          .multiply(_tmpQuat);
      }
    }
    if (rig.rightArm && rig.rightForeArm) {
      if (weaponCategory === 'rifle') {
        const recoilKick = attackTimer > 0 ? Math.sin(attackTimer * 25) * 0.18 : 0;
        if (isAimingGun || attackTimer > 0) {
          _tmpQuat.setFromAxisAngle(_axisZ, -1.22 + recoilKick);
          rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.22);
          rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
        } else {
          _tmpQuat.setFromAxisAngle(_axisZ, -0.55);
          rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.32);
          rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
        }
      } else if (weaponCategory === 'pistol') {
        const recoilKick = attackTimer > 0 ? Math.sin(attackTimer * 25) * 0.22 : 0;
        if (isAimingGun || attackTimer > 0) {
          _tmpQuat.setFromAxisAngle(_axisZ, -1.15 + recoilKick);
          rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.15);
          rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
        } else {
          _tmpQuat.setFromAxisAngle(_axisZ, -0.42);
          rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.25);
          rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
        }
      } else if (attackTimer > 0) {
        if (weaponCategory === 'fists') {
          if (comboStep === 1) {
            const p = Math.sin((attackTimer / 0.32) * Math.PI);
            _tmpQuat.setFromAxisAngle(_axisZ, -1.45 * p);
            rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
            _tmpQuat.setFromAxisAngle(_axisZ, -0.25 * p);
            rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
          } else if (comboStep === 2) {
            const p = Math.sin((attackTimer / 0.35) * Math.PI);
            _tmpQuat.setFromAxisAngle(_axisZ, -1.25 * p);
            rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
            _tmpQuat.setFromAxisAngle(_axisZ, -0.75 * p);
            rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
          } else {
            _tmpQuat.setFromAxisAngle(_axisZ, -0.75);
            rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
            _tmpQuat.setFromAxisAngle(_axisZ, -0.65);
            rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
          }
        } else {
          const swingAngle = -1.35 * Math.sin((attackTimer / 0.35) * Math.PI);
          _tmpQuat.setFromAxisAngle(_axisZ, swingAngle);
          rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.45 * Math.sin((attackTimer / 0.35) * Math.PI));
          rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
        }
      } else if (weaponCategory === 'melee') {
        _tmpQuat.setFromAxisAngle(_axisZ, -0.45);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, -0.28);
        rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(_tmpQuat);
      } else {
        _tmpQuat.setFromAxisAngle(_axisZ, -s * 0.7);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
        const rElbowBend =
          targetState === 'run'
            ? -0.65 - Math.max(0, -s) * 0.35
            : targetState === 'walk'
            ? -0.28 - Math.max(0, -s) * 0.22
            : -0.12;
        _tmpQuat.setFromAxisAngle(_axisZ, rElbowBend);
        rig.rightForeArm.bone.quaternion
          .copy(rig.rightForeArm.rest)
          .multiply(_tmpQuat);
      }
    }
    return;
  }

  // 2. Drive native GLTF AnimationMixer for Soldier & mocap-retargeted humans
  if (!limbs.mixer || !limbs.actions) return;
  if (limbs.currentActionName !== targetState) {
    const prev = limbs.currentActionName
      ? limbs.actions[limbs.currentActionName]
      : undefined;
    const next = limbs.actions[targetState];
    if (next) {
      next.reset().fadeIn(0.18).play();
      if (prev && prev !== next) {
        prev.fadeOut(0.18);
      }
      limbs.currentActionName = targetState;
    }
  }
  // Sync the gait to the character's real ground speed so the feet stop
  // sliding: crouch-walking plays slower, sprinting plays faster.
  if (limbs.actions) {
    const clampScale = Math.max(0.45, Math.min(1.9, speedScale));
    if (limbs.actions.walk) limbs.actions.walk.timeScale = 0.85 * clampScale;
    if (limbs.actions.run) limbs.actions.run.timeScale = 1.15 * clampScale;
  }
  limbs.mixer.update(dt);

  // Upper-body aim / stance overrides applied AFTER the mixer so gun stances,
  // low-ready carries and fighting combos read cleanly over the mocap base pose.
  if (
    limbs.aimBones &&
    (isAimingGun || attackTimer > 0 || weaponCategory !== 'fists')
  ) {
    const ab = limbs.aimBones;
    if (weaponCategory === 'rifle') {
      const recoilKick =
        attackTimer > 0 ? Math.sin(attackTimer * 25) * 0.18 : 0;
      if (isAimingGun || attackTimer > 0) {
        _tmpQuat.setFromAxisAngle(_axisZ, -1.22 + recoilKick);
        ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, -0.22);
        ab.rightForeArm.quaternion
          .copy(ab.rightForeArmRest)
          .multiply(_tmpQuat);
        if (ab.leftArm && ab.leftArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 1.15);
          ab.leftArm.quaternion.copy(ab.leftArmRest).multiply(_tmpQuat);
        }
        if (ab.leftForeArm && ab.leftForeArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.45);
          ab.leftForeArm.quaternion.copy(ab.leftForeArmRest).multiply(_tmpQuat);
        }
        if (ab.spine && ab.spineRest) {
          _tmpQuat.setFromAxisAngle(_axisX, -0.09 + recoilKick * 0.35);
          ab.spine.quaternion.copy(ab.spineRest).multiply(_tmpQuat);
        }
      } else {
        _tmpQuat.setFromAxisAngle(_axisZ, -0.55);
        ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, -0.32);
        ab.rightForeArm.quaternion
          .copy(ab.rightForeArmRest)
          .multiply(_tmpQuat);
        if (ab.leftArm && ab.leftArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.45);
          ab.leftArm.quaternion.copy(ab.leftArmRest).multiply(_tmpQuat);
        }
        if (ab.leftForeArm && ab.leftForeArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.32);
          ab.leftForeArm.quaternion.copy(ab.leftForeArmRest).multiply(_tmpQuat);
        }
      }
    } else if (weaponCategory === 'pistol') {
      const recoilKick =
        attackTimer > 0 ? Math.sin(attackTimer * 25) * 0.22 : 0;
      if (isAimingGun || attackTimer > 0) {
        _tmpQuat.setFromAxisAngle(_axisZ, -1.15 + recoilKick);
        ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, -0.15);
        ab.rightForeArm.quaternion
          .copy(ab.rightForeArmRest)
          .multiply(_tmpQuat);
        if (ab.leftArm && ab.leftArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.85);
          ab.leftArm.quaternion.copy(ab.leftArmRest).multiply(_tmpQuat);
        }
        if (ab.leftForeArm && ab.leftForeArmRest) {
          _tmpQuat.setFromAxisAngle(_axisZ, 0.55);
          ab.leftForeArm.quaternion.copy(ab.leftForeArmRest).multiply(_tmpQuat);
        }
        if (ab.spine && ab.spineRest) {
          _tmpQuat.setFromAxisAngle(_axisX, -0.06);
          ab.spine.quaternion.copy(ab.spineRest).multiply(_tmpQuat);
        }
      } else {
        _tmpQuat.setFromAxisAngle(_axisZ, -0.42);
        ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(_axisZ, -0.25);
        ab.rightForeArm.quaternion
          .copy(ab.rightForeArmRest)
          .multiply(_tmpQuat);
      }
    } else if (attackTimer > 0) {
      if (weaponCategory === 'fists') {
        if (comboStep === 0) {
          const p = Math.sin((attackTimer / 0.32) * Math.PI);
          if (ab.leftArm && ab.leftArmRest) {
            _tmpQuat.setFromAxisAngle(_axisZ, 1.35 * p);
            ab.leftArm.quaternion.copy(ab.leftArmRest).multiply(_tmpQuat);
          }
          if (ab.leftForeArm && ab.leftForeArmRest) {
            _tmpQuat.setFromAxisAngle(_axisZ, 0.25 * p);
            ab.leftForeArm.quaternion.copy(ab.leftForeArmRest).multiply(_tmpQuat);
          }
          _tmpQuat.setFromAxisAngle(_axisZ, -0.75);
          ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        } else if (comboStep === 1) {
          const p = Math.sin((attackTimer / 0.32) * Math.PI);
          _tmpQuat.setFromAxisAngle(_axisZ, -1.45 * p);
          ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.25 * p);
          ab.rightForeArm.quaternion.copy(ab.rightForeArmRest).multiply(_tmpQuat);
          if (ab.leftArm && ab.leftArmRest) {
            _tmpQuat.setFromAxisAngle(_axisZ, 0.75);
            ab.leftArm.quaternion.copy(ab.leftArmRest).multiply(_tmpQuat);
          }
        } else {
          const p = Math.sin((attackTimer / 0.35) * Math.PI);
          _tmpQuat.setFromAxisAngle(_axisZ, -1.25 * p);
          ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
          _tmpQuat.setFromAxisAngle(_axisZ, -0.75 * p);
          ab.rightForeArm.quaternion.copy(ab.rightForeArmRest).multiply(_tmpQuat);
        }
      } else {
        const swingAngle = -1.35 * Math.sin((attackTimer / 0.35) * Math.PI);
        _tmpQuat.setFromAxisAngle(_axisZ, swingAngle);
        ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
        _tmpQuat.setFromAxisAngle(
          _axisZ,
          -0.45 * Math.sin((attackTimer / 0.35) * Math.PI)
        );
        ab.rightForeArm.quaternion
          .copy(ab.rightForeArmRest)
          .multiply(_tmpQuat);
      }
    } else if (weaponCategory === 'melee') {
      _tmpQuat.setFromAxisAngle(_axisZ, -0.45);
      ab.rightArm.quaternion.copy(ab.rightArmRest).multiply(_tmpQuat);
      _tmpQuat.setFromAxisAngle(_axisZ, -0.28);
      ab.rightForeArm.quaternion
        .copy(ab.rightForeArmRest)
        .multiply(_tmpQuat);
    }

    // Point the gun along the character's facing (not the hand's twist) so it
    // never aims sideways while the arm is raised.
    const wm = limbs.weaponMesh;
    if (wm && limbs.weaponHand && limbs.group) {
      accumulateTransform(limbs.weaponHand, limbs.group, _hwPos, _hwQuat);
      wm.quaternion.copy(_hwQuat).invert();
      _tmpQuat.setFromAxisAngle(_axisX, -0.04);
      wm.quaternion.multiply(_tmpQuat);
      wm.position.set(0, 0.02, 0.08).applyQuaternion(wm.quaternion);
    }
  }
}

/**
 * Poses the character (player Arif Rahman or NPCs) realistically inside / on any vehicle:
 * - Motorcycle: knees bent back tightly against tank, feet on footpegs, spine leaning over tank,
 *   hands holding handlebar grips, leaning into wheelies and cornering bank angles.
 * - Rickshaw: standing and pedaling on pedals with alternating legs, hands on handlebars.
 * - CNG / Car / Police Cruiser / Pickup / Bus: seated in driver seat with knees bent 90°, hands on steering wheel / handlebar.
 */
export function setDrivingPose(
  limbs: CharacterLimbs,
  vehicleType: VehicleType,
  speed: number,
  steer: number,
  wheeliePitch: number,
  dt: number
) {
  // 1. Hide weapon while driving so hands grip controls
  if (limbs.weaponMesh) {
    limbs.weaponMesh.visible = false;
  }

  // 2. Stop or mute on-foot mixer clips so they do not fight driving bone transforms
  if (limbs.actions) {
    if (limbs.actions.idle && limbs.actions.idle.isRunning()) {
      limbs.actions.idle.stop();
    }
    if (limbs.actions.walk && limbs.actions.walk.isRunning()) {
      limbs.actions.walk.stop();
    }
    if (limbs.actions.run && limbs.actions.run.isRunning()) {
      limbs.actions.run.stop();
    }
    limbs.currentActionName = undefined;
  }

  // 3. Drive the bone rig into realistic vehicle postures
  const rig = limbs.rpmRig || limbs.driveRig;
  if (!rig) return;

  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const tmpQ = new THREE.Quaternion();

  if (vehicleType === 'motorcycle') {
    // MOTORCYCLE BIKER POSE:
    // Hips bent forward, knees bent back, feet planted on footpegs, spine leaning forward over tank,
    // arms reaching forward holding handlebars, banking into turns and leaning into wheelies
    if (rig.leftUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 1.15).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, 0.2));
      rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest).multiply(tmpQ);
    }
    if (rig.rightUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 1.15).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, -0.2));
      rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest).multiply(tmpQ);
    }
    if (rig.leftLeg) {
      tmpQ.setFromAxisAngle(axisX, -1.25);
      rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest).multiply(tmpQ);
    }
    if (rig.rightLeg) {
      tmpQ.setFromAxisAngle(axisX, -1.25);
      rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest).multiply(tmpQ);
    }
    if (rig.leftFoot) {
      tmpQ.setFromAxisAngle(axisX, 0.35);
      rig.leftFoot.bone.quaternion.copy(rig.leftFoot.rest).multiply(tmpQ);
    }
    if (rig.rightFoot) {
      tmpQ.setFromAxisAngle(axisX, 0.35);
      rig.rightFoot.bone.quaternion.copy(rig.rightFoot.rest).multiply(tmpQ);
    }
    if (rig.spine) {
      const speedLean = Math.min(0.25, Math.abs(speed) * 0.012);
      const forwardLean = 0.32 + speedLean + wheeliePitch * 0.45;
      const turnLean = -steer * 0.28;
      tmpQ.setFromAxisAngle(axisX, forwardLean).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, turnLean));
      rig.spine.bone.quaternion.copy(rig.spine.rest).multiply(tmpQ);
    }
    if (rig.leftArm) {
      tmpQ.setFromAxisAngle(axisX, 0.52)
        .multiply(new THREE.Quaternion().setFromAxisAngle(axisY, -0.22))
        .multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, -0.45));
      rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(tmpQ);
    }
    if (rig.rightArm) {
      tmpQ.setFromAxisAngle(axisX, 0.52)
        .multiply(new THREE.Quaternion().setFromAxisAngle(axisY, 0.22))
        .multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, 0.45));
      rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(tmpQ);
    }
    if (rig.leftForeArm) {
      tmpQ.setFromAxisAngle(axisZ, -0.25);
      rig.leftForeArm.bone.quaternion.copy(rig.leftForeArm.rest).multiply(tmpQ);
    }
    if (rig.rightForeArm) {
      tmpQ.setFromAxisAngle(axisZ, 0.25);
      rig.rightForeArm.bone.quaternion.copy(rig.rightForeArm.rest).multiply(tmpQ);
    }
  } else if (vehicleType === 'rickshaw') {
    // RICKSHAW PULLER STANDING & PEDALING POSE:
    const pedalTime = performance.now() * 0.008 * (speed || 0.6);
    const leftPedal = Math.sin(pedalTime);
    const rightPedal = Math.sin(pedalTime + Math.PI);
    if (rig.leftUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 0.65 + leftPedal * 0.35);
      rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest).multiply(tmpQ);
    }
    if (rig.rightUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 0.65 + rightPedal * 0.35);
      rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest).multiply(tmpQ);
    }
    if (rig.leftLeg) {
      tmpQ.setFromAxisAngle(axisX, -0.55 - Math.max(0, leftPedal) * 0.65);
      rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest).multiply(tmpQ);
    }
    if (rig.rightLeg) {
      tmpQ.setFromAxisAngle(axisX, -0.55 - Math.max(0, rightPedal) * 0.65);
      rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest).multiply(tmpQ);
    }
    if (rig.spine) {
      tmpQ.setFromAxisAngle(axisX, 0.22);
      rig.spine.bone.quaternion.copy(rig.spine.rest).multiply(tmpQ);
    }
    if (rig.leftArm) {
      tmpQ.setFromAxisAngle(axisX, 0.45).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, -0.35));
      rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(tmpQ);
    }
    if (rig.rightArm) {
      tmpQ.setFromAxisAngle(axisX, 0.45).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, 0.35));
      rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(tmpQ);
    }
  } else {
    // CAR, CNG, POLICE CRUISER, PICKUP, BUS SEATED DRIVER:
    // Sitting with legs bent ~90 degrees, hands holding steering wheel or handlebars
    if (rig.leftUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 1.25).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, 0.12));
      rig.leftUpLeg.bone.quaternion.copy(rig.leftUpLeg.rest).multiply(tmpQ);
    }
    if (rig.rightUpLeg) {
      tmpQ.setFromAxisAngle(axisX, 1.25).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, -0.12));
      rig.rightUpLeg.bone.quaternion.copy(rig.rightUpLeg.rest).multiply(tmpQ);
    }
    if (rig.leftLeg) {
      tmpQ.setFromAxisAngle(axisX, -1.35);
      rig.leftLeg.bone.quaternion.copy(rig.leftLeg.rest).multiply(tmpQ);
    }
    if (rig.rightLeg) {
      tmpQ.setFromAxisAngle(axisX, -1.35);
      rig.rightLeg.bone.quaternion.copy(rig.rightLeg.rest).multiply(tmpQ);
    }
    if (rig.spine) {
      tmpQ.setFromAxisAngle(axisX, 0.08);
      rig.spine.bone.quaternion.copy(rig.spine.rest).multiply(tmpQ);
    }
    if (rig.leftArm) {
      tmpQ.setFromAxisAngle(axisX, 0.48).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, -0.28));
      rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(tmpQ);
    }
    if (rig.rightArm) {
      tmpQ.setFromAxisAngle(axisX, 0.48).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, 0.28));
      rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(tmpQ);
    }
  }

  // Curl fingers naturally to hold grips / steering wheel
  if (limbs.fingerBones && limbs.fingerBones.length > 0) {
    for (const f of limbs.fingerBones) {
      tmpQ.setFromAxisAngle(axisX, 1.15);
      f.bone.quaternion.copy(f.rest).multiply(tmpQ);
    }
  }
}

export function tintCharacterOutfit(
  limbs: CharacterLimbs,
  shirtHex: string,
  pantsHex?: string
) {
  if (!limbs.gltfRoot) return;
  const isDefault = shirtHex === '#0f766e';
  limbs.gltfRoot.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat || !('color' in mat)) return;
      if (
        m.name === 'Wolf3D_Outfit_Top' ||
        mat.name === 'Wolf3D_Outfit_Top' ||
        mat.name === 'T-shirt'
      ) {
        if (isDefault) {
          mat.color.set('#ffffff');
        } else {
          mat.color.set(shirtHex).lerp(new THREE.Color('#ffffff'), 0.55);
        }
      } else if (
        pantsHex &&
        (m.name === 'Wolf3D_Outfit_Bottom' ||
          mat.name === 'Wolf3D_Outfit_Bottom')
      ) {
        if (isDefault) {
          mat.color.set('#ffffff');
        } else {
          mat.color.set(pantsHex).lerp(new THREE.Color('#ffffff'), 0.55);
        }
      }
    }
  });
}

export function updateWeaponAttachment(
  weaponGroup: THREE.Group,
  toolId: ToolWeaponId
) {
  while (weaponGroup.children.length > 0) {
    weaponGroup.remove(weaponGroup.children[0]);
  }
  if (toolId === 'fists') return;

  const steelMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.92,
    roughness: 0.18,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.85,
    roughness: 0.25,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.65,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    metalness: 0.85,
    roughness: 0.22,
  });

  if (toolId === 'ramda') {
    // Authentic Bangladeshi Curved Ramda Machete (দেশীয় রামদা)
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.28, 10).rotateX(Math.PI / 2),
      woodMat
    );
    grip.position.set(0, 0, 0.08);
    weaponGroup.add(grip);

    const bolster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.05, 10).rotateX(Math.PI / 2),
      brassMat
    );
    bolster.position.set(0, 0, 0.22);
    weaponGroup.add(bolster);

    const ramdaShape = new THREE.Shape();
    ramdaShape.moveTo(0, -0.025);
    ramdaShape.lineTo(0.56, -0.045);
    ramdaShape.quadraticCurveTo(0.68, -0.01, 0.64, 0.095);
    ramdaShape.quadraticCurveTo(0.45, 0.06, 0, 0.025);
    ramdaShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(ramdaShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    bladeGeo.rotateY(-Math.PI / 2);
    const blade = new THREE.Mesh(bladeGeo, steelMat);
    blade.position.set(0.006, 0, 0.23);
    weaponGroup.add(blade);
    return;
  }

  if (toolId === 'chapati_cleaver') {
    // Old Dhaka Broad Rectangular Chapati Cleaver (পুরান ঢাকার চাপাতি)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.22, 10).rotateX(Math.PI / 2),
      woodMat
    );
    handle.position.set(0, 0, 0.06);
    weaponGroup.add(handle);

    const cleaverBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.14, 0.42),
      steelMat
    );
    cleaverBlade.position.set(0, 0.03, 0.36);
    weaponGroup.add(cleaverBlade);
    return;
  }

  if (toolId === 'cricket_bat') {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.28, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6 })
    );
    handle.position.set(0, 0, 0.08);
    weaponGroup.add(handle);

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.045, 0.64),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.45 })
    );
    blade.position.set(0, 0, 0.52);
    weaponGroup.add(blade);
    return;
  }

  if (toolId === 'bamboo_lathi') {
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.03, 1.25, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.55 })
    );
    stick.position.set(0, 0, 0.48);
    weaponGroup.add(stick);
    return;
  }

  if (toolId === 'stun_baton') {
    const baton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.68, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#0ea5e9',
        emissive: '#0284c7',
        emissiveIntensity: 0.9,
      })
    );
    baton.position.set(0, 0, 0.32);
    weaponGroup.add(baton);
    return;
  }

  if (toolId === 'deshi_pipegun') {
    // Improvised Bangladeshi Deshi One-Shot Pipe Gun (দেশীয় পাইপগান / কাটা রাইফেল)
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.16, 0.07),
      woodMat
    );
    grip.position.set(0, -0.07, 0.08);
    grip.rotation.x = 0.32;
    weaponGroup.add(grip);

    const breech = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.065, 0.18),
      brassMat
    );
    breech.position.set(0, 0.02, 0.14);
    weaponGroup.add(breech);

    const pipeBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, 0.44, 12).rotateX(Math.PI / 2),
      steelMat
    );
    pipeBarrel.position.set(0, 0.03, 0.42);
    weaponGroup.add(pipeBarrel);
    return;
  }

  if (toolId === 'pistol_9mm') {
    // 9mm Type-54 / Beretta Semi-Auto Pistol (৯মিমি পিস্তল)
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.14, 0.055),
      gunmetalMat
    );
    grip.position.set(0, -0.06, 0.06);
    grip.rotation.x = 0.25;
    weaponGroup.add(grip);

    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.048, 0.24),
      steelMat
    );
    slide.position.set(0, 0.025, 0.15);
    weaponGroup.add(slide);
    return;
  }

  if (toolId === 'bd08_rifle') {
    // BD-08 / Type-81 Bangladesh Assault Rifle (বিডি-০৮ অ্যাসল্ট রাইফেল)
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.1, 0.26),
      woodMat
    );
    stock.position.set(0, -0.02, -0.08);
    weaponGroup.add(stock);

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.075, 0.28),
      gunmetalMat
    );
    receiver.position.set(0, 0.02, 0.18);
    weaponGroup.add(receiver);

    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.058, 0.24),
      woodMat
    );
    handguard.position.set(0, 0.02, 0.42);
    weaponGroup.add(handguard);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.36, 10).rotateX(Math.PI / 2),
      gunmetalMat
    );
    barrel.position.set(0, 0.03, 0.66);
    weaponGroup.add(barrel);

    // Curved 30-round banana magazine
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.18, 0.065),
      gunmetalMat
    );
    mag.position.set(0, -0.09, 0.24);
    mag.rotation.x = -0.35;
    weaponGroup.add(mag);
    return;
  }

  if (toolId === 'police_shotgun') {
    // 12-Gauge Tactical Pump Shotgun (১২-গেজ শটগান)
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.044, 0.11, 0.26),
      gunmetalMat
    );
    stock.position.set(0, -0.02, -0.06);
    weaponGroup.add(stock);

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.075, 0.26),
      steelMat
    );
    receiver.position.set(0, 0.02, 0.18);
    weaponGroup.add(receiver);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.56, 12).rotateX(Math.PI / 2),
      gunmetalMat
    );
    barrel.position.set(0, 0.04, 0.56);
    weaponGroup.add(barrel);

    const pump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.2, 10).rotateX(Math.PI / 2),
      woodMat
    );
    pump.position.set(0, 0.0, 0.46);
    weaponGroup.add(pump);
    return;
  }

  if (toolId === 'smg_uzi') {
    // Compact Micro-SMG (মাইক্রো এসএমজি)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.085, 0.28),
      gunmetalMat
    );
    body.position.set(0, 0.03, 0.16);
    weaponGroup.add(body);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.22, 0.048),
      gunmetalMat
    );
    mag.position.set(0, -0.1, 0.14);
    weaponGroup.add(mag);

    const suppressor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.18, 12).rotateX(Math.PI / 2),
      steelMat
    );
    suppressor.position.set(0, 0.03, 0.38);
    weaponGroup.add(suppressor);
  }
}

export function createStreetStallMesh(
  type: 'tea_stall' | 'fuchka_stall'
): THREE.Group {
  const group = new THREE.Group();
  const woodTex = loadRealTexture('/textures/hardwood2_diffuse.jpg', 1, 1, true);

  if (type === 'tea_stall') {
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.7,
    });
    const redCounterMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      roughness: 0.5,
    });
    const tinMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.55,
      roughness: 0.35,
    });

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.05, 1.4),
      redCounterMat
    );
    counter.position.set(0, 0.52, 0);
    counter.castShadow = true;
    group.add(counter);

    const kettle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.32, 12),
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    kettle.position.set(-0.55, 1.21, 0.25);
    group.add(kettle);

    [-0.1, 0.35, 0.75].forEach((jx, idx) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.28, 10),
        new THREE.MeshPhysicalMaterial({
          color: idx === 0 ? '#fde047' : '#fb923c',
          transparent: true,
          opacity: 0.78,
        })
      );
      jar.position.set(jx, 1.19, 0.32);
      group.add(jar);
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 2.2), tinMat);
    roof.position.set(0, 2.35, 0.15);
    roof.rotation.x = 0.1;
    roof.castShadow = true;
    group.add(roof);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.48, 0.08),
      new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(0) })
    );
    sign.position.set(0, 2.68, 1.12);
    group.add(sign);

    [
      [-1.2, -0.6],
      [1.2, -0.6],
      [-1.2, 0.6],
      [1.2, 0.6],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 2.3, 8),
        woodMat
      );
      post.position.set(px, 1.15, pz);
      group.add(post);
    });

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.42, 0.45),
      woodMat
    );
    bench.position.set(0, 0.21, 1.25);
    group.add(bench);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#fef08a' })
    );
    lantern.position.set(0, 2.08, 0.45);
    group.add(lantern);

    return group;
  }

  const cartMat = new THREE.MeshStandardMaterial({
    map: createRickshawArtTexture(3),
    roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.92, 1.3), cartMat);
  body.position.set(0, 0.68, 0);
  body.castShadow = true;
  group.add(body);

  const glassCase = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.58, 0.95),
    new THREE.MeshPhysicalMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
    })
  );
  glassCase.position.set(0, 1.42, 0);
  group.add(glassCase);

  const umbrella = new THREE.Mesh(
    new THREE.ConeGeometry(1.75, 0.72, 16),
    new THREE.MeshStandardMaterial({
      map: createRickshawArtTexture(2),
      roughness: 0.4,
    })
  );
  umbrella.position.set(0, 2.62, 0);
  group.add(umbrella);

  return group;
}

export function createBurigangaLaunchMesh(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.45,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#0d9488' });
  const windowGlow = new THREE.MeshBasicMaterial({ color: '#fef08a' });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.4, 28), hullMat);
  hull.position.set(0, 0.8, 0);
  group.add(hull);

  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(6.0, 8.0, 4)
      .rotateX(Math.PI / 2)
      .rotateZ(Math.PI / 4),
    hullMat
  );
  bow.position.set(0, 0.8, 17);
  group.add(bow);

  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(7.8, 2.2, 24), deckMat);
  deck1.position.set(0, 3.0, -0.5);
  deck1.castShadow = true;
  group.add(deck1);

  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.1, 20), deckMat);
  deck2.position.set(0, 5.1, -1.0);
  deck2.castShadow = true;
  group.add(deck2);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.8, 7), trimMat);
  bridge.position.set(0, 7.0, 4.5);
  group.add(bridge);

  const lightStrip1 = new THREE.Mesh(
    new THREE.BoxGeometry(8.0, 0.35, 22),
    windowGlow
  );
  lightStrip1.position.set(0, 3.2, -0.5);
  group.add(lightStrip1);

  const lightStrip2 = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.35, 18),
    windowGlow
  );
  lightStrip2.position.set(0, 5.3, -1.0);
  group.add(lightStrip2);

  return group;
}

export function createSketchfabAssetPropMesh(
  spawnType: string,
  thumbnailUrl: string
): THREE.Group {
  const group = new THREE.Group();
  const tex = loadRealTexture(thumbnailUrl, 1, 1, true);

  if (spawnType === 'money_stacks') {
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.16, 1.4),
      new THREE.MeshStandardMaterial({
        map: loadRealTexture('/textures/hardwood2_diffuse.jpg'),
      })
    );
    pallet.position.y = 0.08;
    group.add(pallet);

    const cashMat = new THREE.MeshStandardMaterial({
      color: '#22c55e',
      roughness: 0.4,
    });
    for (let y = 0; y < 3; y++) {
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(1.4 - y * 0.15, 0.26, 1.0 - y * 0.1),
        cashMat
      );
      stack.position.y = 0.28 + y * 0.26;
      stack.castShadow = true;
      group.add(stack);
    }
    return group;
  }

  if (spawnType === 'crime_scene') {
    const tapeMat = new THREE.MeshBasicMaterial({
      color: '#facc15',
      side: THREE.DoubleSide,
    });
    const postMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });
    [
      [-2.2, -2.2],
      [2.2, -2.2],
      [2.2, 2.2],
      [-2.2, 2.2],
    ].forEach(([px, pz]) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.95, 10),
        postMat
      );
      cone.position.set(px, 0.48, pz);
      group.add(cone);
    });
    const tape1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 4.4), tapeMat);
    tape1.position.y = 0.78;
    group.add(tape1);
    return group;
  }

  if (spawnType === 'briefcase') {
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.58, 0.24),
      new THREE.MeshStandardMaterial({
        color: '#451a03',
        metalness: 0.4,
        roughness: 0.3,
      })
    );
    caseMesh.position.y = 0.35;
    caseMesh.castShadow = true;
    group.add(caseMesh);
    return group;
  }

  if (spawnType === 'billboard') {
    const poleMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.7,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 9, 12),
      poleMat
    );
    pole.position.y = 4.5;
    group.add(pole);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 4.8, 0.4),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    screen.position.y = 9.2;
    group.add(screen);
    return group;
  }

  const height = spawnType === 'hongkong_tower' ? 28 : 12;
  const width = spawnType === 'asian_shop' ? 8 : 13;
  const bMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, width),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      metalness: 0.2,
    })
  );
  bMesh.position.y = height / 2;
  bMesh.castShadow = true;
  bMesh.receiveShadow = true;
  group.add(bMesh);
  return group;
}

export function createFlyoverGantryTexture(
  line1Bn: string,
  line1En: string,
  line2Bn: string,
  line2En: string
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14532d'; // Highway Green
  ctx.fillRect(0, 0, 1024, 320);

  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(16, 16, 992, 288);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`↑  ${line1Bn}`, 48, 85);
  ctx.font = '600 28px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`    ${line1En}`, 48, 130);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(48, 160);
  ctx.lineTo(976, 160);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`↗  ${line2Bn}`, 48, 225);
  ctx.font = '600 28px sans-serif';
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`    ${line2En}`, 48, 270);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFobBillboardTexture(
  brand: string,
  headlineBn: string,
  subEn: string,
  bgColor: string
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px sans-serif';
  ctx.fillText(brand, 48, 75);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText(headlineBn, 48, 145);

  ctx.font = '600 26px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(subEn, 48, 205);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStadiumScoreboardTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 996, 484);

  // Header
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('🏏 SHER-E-BANGLA NATIONAL CRICKET STADIUM | 1ST ODI', 48, 70);

  // Teams & Scores
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('BANGLADESH', 48, 150);
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 54px monospace';
  ctx.fillText('324 / 5', 460, 150);
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('(48.4 ov)', 740, 150);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('OPPONENTS', 48, 230);
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 54px monospace';
  ctx.fillText('308 / 8', 460, 230);
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('(50.0 ov)', 740, 230);

  // Batsmen
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('SHAKIB AL HASAN: 96* (68b)  |  MUSFIQUR RAHIM: 64 (52b)', 48, 320);
  ctx.fillStyle = '#facc15';
  ctx.fillText('PARTNERSHIP: 142 RUNS (112b)', 48, 375);

  // Result Banner
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(36, 415, 952, 65);
  ctx.fillStyle = '#090d16';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('🎉 BANGLADESH WON BY 5 WICKETS - TIGERS ROAR! 🐅', 80, 460);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMallSignboardTexture(
  mallNameBn: string,
  mallNameEn: string,
  tagline: string,
  primaryColor: string
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 1024, 320);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 1000, 296);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(mallNameBn, 48, 90);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(mallNameEn, 48, 160);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 26px sans-serif';
  ctx.fillText(tagline, 48, 240);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
