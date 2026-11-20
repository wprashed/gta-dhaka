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
  gltfLoader.load(url, (gltf) => {
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

export function createVehicleMesh(
  type: VehicleType,
  customColor?: string,
  seed = 1
): THREE.Group {
  const group = new THREE.Group();

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

    // Real 3D Human GLB CNG Driver sitting inside the cockpit
    ensureModelLoaded('readyplayerme1', (gltf) => {
      try {
        const driver = SkeletonUtils.clone(gltf.scene);
        driver.scale.setScalar(0.78);
        driver.position.set(0, 0.12, 0.28);
        group.add(driver);
      } catch {}
    });

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

    // 5. Real 3D Human GLB Rickshaw Puller in Checkered Bangladeshi Lungi
    ensureModelLoaded('readyplayerme1', (gltf) => {
      try {
        const puller = SkeletonUtils.clone(gltf.scene);
        puller.scale.setScalar(0.88);
        puller.position.set(0, 0.22, 0.34);
        const lungiTex = createLungiPatternTexture('#1e3a8a', '#facc15');
        puller.traverse((c) => {
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

    addWheel(-1.05, 0.38, 1.48, 1.1);
    addWheel(1.05, 0.38, 1.48, 1.1);
    addWheel(-1.05, 0.38, -1.48, 1.1);
    addWheel(1.05, 0.38, -1.48, 1.1);
    group.add(fallbackGroup);

    ensureModelLoaded('truck', (gltf) => {
      const cloned = gltf.scene.clone(true);
      cloned.scale.setScalar(1.05);
      cloned.traverse((c) => {
        if (c.name && (c.name.includes('Wheel') || c.name.includes('wheel'))) {
          c.name = 'wheel';
        }
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.remove(fallbackGroup);
      group.add(cloned);
    });

    return group;
  }

  if (type === 'bus') {
    const busColors = ['#0f766e', '#b91c1c', '#1d4ed8', '#15803d'];
    const bodyColor =
      customColor || busColors[Math.abs(seed) % busColors.length];
    const busMat = new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.28,
      clearcoat: 0.8,
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#dc2626' });
    const creamMat = new THREE.MeshStandardMaterial({ color: '#fef3c7' });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.65,
      metalness: 0.2,
      roughness: 0.1,
    });

    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.68, 1.38, 8.5),
      busMat
    );
    lowerBody.position.set(0, 1.06, 0);
    lowerBody.castShadow = true;
    group.add(lowerBody);

    const redStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.72, 0.32, 8.54),
      stripeMat
    );
    redStripe.position.set(0, 1.56, 0);
    group.add(redStripe);

    const upperCabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.64, 1.28, 8.42),
      creamMat
    );
    upperCabin.position.set(0, 2.34, 0);
    upperCabin.castShadow = true;
    group.add(upperCabin);

    const windows = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.82, 7.7),
      glassMat
    );
    windows.position.set(0, 2.38, 0.1);
    group.add(windows);

    const routeSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.36, 0.08),
      new THREE.MeshBasicMaterial({ map: createBanglaSignTexture(seed + 2) })
    );
    routeSign.position.set(0, 2.86, 4.24);
    group.add(routeSign);

    const roofAc = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.28, 3.2),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0' })
    );
    roofAc.position.set(0, 3.12, 1.2);
    group.add(roofAc);

    // Roof luggage carrier with blue and yellow tarp parcels (বাসের ছাদের মালবাহী ক্যারিয়ার)
    const carrier = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.22, 3.8),
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.3 })
    );
    carrier.position.set(0, 3.12, -1.2);
    group.add(carrier);

    [-0.45, 0.45].forEach((sx, sIdx) => {
      const sack = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.42, 1.3),
        new THREE.MeshStandardMaterial({
          color: sIdx === 0 ? '#0284c7' : '#eab308',
          roughness: 0.85,
        })
      );
      sack.position.set(sx, 3.36, -1.2 + (sIdx === 0 ? -0.4 : 0.4));
      group.add(sack);
    });

    // Heavy steel anti-ram crash guard on front
    const bullBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.48, 0.16),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 })
    );
    bullBar.position.set(0, 0.62, 4.34);
    group.add(bullBar);

    // Rear Bangla blessing plate: "মা বাবার দোয়া"
    const rearSignTex = createBanglaNumberPlateTexture('মা বাবার দোয়া', true);
    const rearBlessing = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.32),
      new THREE.MeshBasicMaterial({ map: rearSignTex, side: THREE.DoubleSide })
    );
    rearBlessing.position.set(0, 2.65, -4.26);
    rearBlessing.rotation.y = Math.PI;
    group.add(rearBlessing);

    [-0.95, 0.95].forEach((hx) => {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.24, 0.1),
        new THREE.MeshBasicMaterial({ color: '#fef08a' })
      );
      hl.position.set(hx, 0.85, 4.26);
      group.add(hl);
    });

    addWheel(-1.34, 0.48, 2.65, 1.35);
    addWheel(1.34, 0.48, 2.65, 1.35);
    addWheel(-1.34, 0.48, -2.55, 1.35);
    addWheel(1.34, 0.48, -2.55, 1.35);

    return group;
  }

  if (type === 'motorcycle') {
    const bikePalette = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#09090b'];
    const bikeHex = customColor || bikePalette[Math.abs(seed) % bikePalette.length];
    const bikeMat = new THREE.MeshPhysicalMaterial({
      color: bikeHex,
      metalness: 0.65,
      roughness: 0.18,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.25,
    });
    const engineMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      metalness: 0.8,
      roughness: 0.35,
    });
    const leatherSeatMat = new THREE.MeshStandardMaterial({
      color: '#18181b',
      roughness: 0.85,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.95,
      roughness: 0.1,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#0f172a',
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2,
    });

    // 1. Perimeter Twin-Spar Alloy Frame
    const mainFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.48, 1.75),
      frameMat
    );
    mainFrame.position.set(0, 0.64, 0.02);
    mainFrame.castShadow = true;
    group.add(mainFrame);

    // 2. Sculpted 150cc 4-Valve Engine Block with Cooling Fins & Crankcase
    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.38, 0.52),
      engineMat
    );
    engineBlock.position.set(0, 0.44, 0.08);
    group.add(engineBlock);

    [-0.06, 0.02, 0.1].forEach((finY) => {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.02, 0.48),
        frameMat
      );
      fin.position.set(0, 0.44 + finY, 0.08);
      group.add(fin);
    });

    // Round chrome clutch cover
    const clutchCover = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16).rotateZ(Math.PI / 2),
      chromeMat
    );
    clutchCover.position.set(0.19, 0.42, 0.05);
    group.add(clutchCover);

    // 3. Muscular Sculpted Fuel Tank with Knee Indents
    const tankShape = new THREE.Shape();
    tankShape.moveTo(-0.4, 0);
    tankShape.quadraticCurveTo(-0.42, 0.25, -0.25, 0.32);
    tankShape.lineTo(0.2, 0.32);
    tankShape.quadraticCurveTo(0.42, 0.22, 0.38, 0);
    tankShape.closePath();

    const tankGeo = new THREE.ExtrudeGeometry(tankShape, {
      depth: 0.46,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 4,
    });
    tankGeo.rotateY(Math.PI / 2);
    tankGeo.translate(-0.23, 0.72, 0.16);
    const tank = new THREE.Mesh(tankGeo, bikeMat);
    tank.castShadow = true;
    group.add(tank);

    // Chrome Fuel Cap
    const fuelCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.025, 16),
      chromeMat
    );
    fuelCap.position.set(0, 1.06, 0.22);
    group.add(fuelCap);

    // 4. Aggressive Twin LED Hawk-Eye Front Headlight Mask & Windscreen
    const cowl = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.34),
      bikeMat
    );
    cowl.position.set(0, 1.08, 0.82);
    group.add(cowl);

    // Twin angular LED projectors
    [-0.1, 0.1].forEach((hlX) => {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.09, 0.06),
        new THREE.MeshBasicMaterial({ color: '#fef08a' })
      );
      hl.position.set(hlX, 1.06, 0.98);
      group.add(hl);
    });

    // Tinted sports aerodynamic windscreen
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.24, 0.08),
      glassMat
    );
    screen.rotation.x = -0.45;
    screen.position.set(0, 1.25, 0.84);
    group.add(screen);

    // 5. Clip-On Handlebars, Controls & Rearview Mirrors
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.78, 10).rotateZ(Math.PI / 2),
      frameMat
    );
    bar.position.set(0, 1.15, 0.68);
    group.add(bar);

    [-0.38, 0.38].forEach((mirrorX) => {
      const mirrorStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6).rotateZ(mirrorX > 0 ? -0.4 : 0.4),
        frameMat
      );
      mirrorStem.position.set(mirrorX * 0.85, 1.22, 0.68);
      group.add(mirrorStem);

      const mirrorHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.07, 0.03),
        chromeMat
      );
      mirrorHead.position.set(mirrorX, 1.28, 0.68);
      group.add(mirrorHead);
    });

    // Digital Instrument Cluster
    const cluster = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.04, 0.1),
      new THREE.MeshBasicMaterial({ color: '#06b6d4' })
    );
    cluster.rotation.x = -0.3;
    cluster.position.set(0, 1.16, 0.62);
    group.add(cluster);

    // 6. Stepped Two-Tier Rider and Pillion Saddle
    const riderSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.46),
      leatherSeatMat
    );
    riderSeat.position.set(0, 0.9, -0.22);
    group.add(riderSeat);

    const pillionSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.38),
      leatherSeatMat
    );
    pillionSeat.position.set(0, 1.01, -0.6);
    group.add(pillionSeat);

    // Sharp aerodynamic tail cowl
    const tailCowl = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.48, 4).rotateX(-Math.PI / 2),
      bikeMat
    );
    tailCowl.position.set(0, 0.98, -0.92);
    group.add(tailCowl);

    // 7. Upswept Chrome Exhaust Canister with Carbon Heat Shield
    const exhaustPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.85, 12).rotateX(Math.PI / 2 - 0.28),
      chromeMat
    );
    exhaustPipe.position.set(0.22, 0.48, -0.48);
    group.add(exhaustPipe);

    const exhaustTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.04, 10).rotateX(Math.PI / 2 - 0.28),
      new THREE.MeshBasicMaterial({ color: '#09090b' })
    );
    exhaustTip.position.set(0.22, 0.58, -0.86);
    group.add(exhaustTip);

    // 8. Spoke Alloy Wheels with Disc Brakes and Red Calipers
    addWheel(0, 0.35, 0.82, 0.95);
    addWheel(0, 0.35, -0.82, 0.95);

    // Brake discs on wheels
    [0.82, -0.82].forEach((wz) => {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.012, 16).rotateZ(Math.PI / 2),
        chromeMat
      );
      disc.position.set(0.08, 0.35, wz);
      group.add(disc);

      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.09, 0.08),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3 })
      );
      caliper.position.set(0.08, 0.44, wz + 0.12);
      group.add(caliper);
    });

    // 9. Rear Digital Smart Number Plate & LED Taillight
    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.04),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    tailLight.position.set(0, 0.94, -1.14);
    group.add(tailLight);

    const bikePlateTex = createBanglaNumberPlateTexture(
      `ঢাকা মেট্রো-ল ২৬-${4100 + (seed % 9) * 59}`,
      false
    );
    const rearPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.16),
      new THREE.MeshBasicMaterial({ map: bikePlateTex, side: THREE.DoubleSide })
    );
    rearPlate.position.set(0, 0.62, -1.16);
    group.add(rearPlate);

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
    metalness: 0.55,
    roughness: 0.18,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
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

  // 4 Wheels with alloy rims for fallback sedan so vehicle never hovers from frame 0
  const fallbackWheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 16);
  fallbackWheelGeo.rotateZ(Math.PI / 2);
  const fallbackTireMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.9,
  });
  const fallbackHubMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.85,
    roughness: 0.2,
  });

  const addFallbackWheel = (wx: number, wy: number, wz: number) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(fallbackWheelGeo, fallbackTireMat);
    tire.castShadow = true;
    wg.add(tire);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.26, 12).rotateZ(Math.PI / 2),
      fallbackHubMat
    );
    wg.add(hub);
    wg.name = 'wheel';
    fallbackGroup.add(wg);
  };

  addFallbackWheel(-0.95, 0.35, 1.35);
  addFallbackWheel(0.95, 0.35, 1.35);
  addFallbackWheel(-0.95, 0.35, -1.35);
  addFallbackWheel(0.95, 0.35, -1.35);

  group.add(fallbackGroup);

  const carModelKey: ModelKey =
    !isPolice && Math.abs(seed) % 2 === 1 ? 'ferrari' : 'car_concept';

  ensureModelLoaded(carModelKey, (gltf) => {
    try {
      const cloned = gltf.scene.clone(true);

      if (carModelKey === 'car_concept') {
        // CarConcept.glb root node BodyUnderside is Z-up with -Y forward;
        // rotating X by -Math.PI/2 places wheels on y=0 and headlights facing +Z!
        cloned.rotation.x = -Math.PI / 2;
        cloned.scale.setScalar(1.02);
      } else {
        // ferrari.glb faces -Z in local space; rotating Y by Math.PI faces +Z!
        cloned.rotation.y = Math.PI;
        cloned.scale.setScalar(1.02);
      }

      const targetColor = new THREE.Color(bodyHex);

      cloned.traverse((node) => {
        if (
          node.name &&
          !node.name.toLowerCase().includes('steering') &&
          (node.name === 'WheelFrontL' ||
            node.name === 'WheelFrontR' ||
            node.name === 'WheelRearL' ||
            node.name === 'WheelRearR' ||
            node.name.startsWith('wheel_') ||
            (node.name.startsWith('Wheel') &&
              !node.name.includes('Rim') &&
              !node.name.includes('Brake')))
        ) {
          node.name = 'wheel';
        }
        if (
          node.name &&
          (node.name.toLowerCase().includes('steering_wheel') ||
            node.name === 'InteriorSteeringWheel01')
        ) {
          node.name = 'steering_wheel';
        }
        if ((node as THREE.Mesh).isMesh) {
          const m = node as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          const origMat = Array.isArray(m.material)
            ? m.material[0]
            : m.material;
          if (!origMat) return;
          const mName = origMat.name || '';

          if (
            mName === 'Body_Color' ||
            mName.startsWith('Paint 1') ||
            mName.startsWith('Paint 2')
          ) {
            const customPaint = (
              origMat as THREE.MeshPhysicalMaterial
            ).clone() as THREE.MeshPhysicalMaterial;
            if (isPolice && mName.startsWith('Paint 2')) {
              customPaint.color.set('#ffffff');
            } else {
              customPaint.color.copy(targetColor);
            }
            m.material = customPaint;
          }
        }
      });

      group.remove(fallbackGroup);
      group.add(cloned);
    } catch {}
  });

  // BRTA Bangla Vehicle Registration Plates (ঢাকা মেট্রো-গ ৩৪-৮৯১২)
  const carPlateTex = createBanglaNumberPlateTexture(
    isPolice
      ? `ঢাকা মেট্রো-প ১১-${1020 + (seed % 9) * 31}`
      : `ঢাকা মেট্রো-গ ৩৪-${5120 + (seed % 9) * 83}`,
    false
  );
  const frontPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.16),
    new THREE.MeshBasicMaterial({ map: carPlateTex, side: THREE.DoubleSide })
  );
  frontPlate.position.set(0, 0.42, 2.28);
  group.add(frontPlate);

  if (isPolice) {
    const barBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.06, 0.24),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85 })
    );
    barBase.position.set(0, 1.48, -0.1);
    group.add(barBase);

    const redLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.12, 0.2),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    redLight.position.set(-0.28, 1.54, -0.1);
    redLight.name = 'siren_red';
    group.add(redLight);

    const blueLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.12, 0.2),
      new THREE.MeshBasicMaterial({ color: '#3b82f6' })
    );
    blueLight.position.set(0.28, 1.54, -0.1);
    blueLight.name = 'siren_blue';
    group.add(blueLight);
  }

  return group;
}

export interface RpmBoneRig {
  leftUpLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightUpLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightLeg?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  leftArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
  rightArm?: { bone: THREE.Object3D; rest: THREE.Quaternion };
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

  // Instant sculpted humanoid fallback body so character is immediately visible from frame 0
  const fallbackMeshGroup = new THREE.Group();
  fallbackMeshGroup.name = 'fallback_avatar';

  const skinMat = new THREE.MeshStandardMaterial({
    color: SOUTH_ASIAN_SKIN_TONES[seed % SOUTH_ASIAN_SKIN_TONES.length],
    roughness: 0.65,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.75,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.8,
  });

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.68, 12),
    shirtMat
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  fallbackMeshGroup.add(torso);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    skinMat
  );
  headMesh.position.y = 1.62;
  headMesh.castShadow = true;
  head.add(headMesh);
  fallbackMeshGroup.add(head);

  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 10, 10),
    new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.9 })
  );
  hairMesh.position.set(0, 1.66, -0.02);
  fallbackMeshGroup.add(hairMesh);

  const limbGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.65, 8);

  const leftLegMesh = new THREE.Mesh(limbGeo, pantsMat);
  leftLegMesh.position.y = -0.325;
  leftLegMesh.castShadow = true;
  leftLeg.position.set(-0.13, 0.82, 0);
  leftLeg.add(leftLegMesh);
  fallbackMeshGroup.add(leftLeg);

  const rightLegMesh = new THREE.Mesh(limbGeo, pantsMat);
  rightLegMesh.position.y = -0.325;
  rightLegMesh.castShadow = true;
  rightLeg.position.set(0.13, 0.82, 0);
  rightLeg.add(rightLegMesh);
  fallbackMeshGroup.add(rightLeg);

  const leftArmMesh = new THREE.Mesh(limbGeo, shirtMat);
  leftArmMesh.position.y = -0.28;
  leftArmMesh.castShadow = true;
  leftArm.position.set(-0.31, 1.38, 0);
  leftArm.add(leftArmMesh);
  fallbackMeshGroup.add(leftArm);

  const rightArmMesh = new THREE.Mesh(limbGeo, shirtMat);
  rightArmMesh.position.y = -0.28;
  rightArmMesh.castShadow = true;
  rightArm.position.set(0.31, 1.38, 0);
  rightArm.add(rightArmMesh);
  fallbackMeshGroup.add(rightArm);

  weaponMesh.position.set(0.28, 0.95, 0.25);
  group.add(weaponMesh);
  group.add(fallbackMeshGroup);

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
  } else if (isNadia) {
    modelKey = 'hvgirl'; // Realistic 3D Human Woman with skeletal Idle/Walking clips
  } else if (isFemale) {
    modelKey = seed % 2 === 0 ? 'hvgirl' : 'michelle';
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

      // Normalize height so every 3D human stands ~1.72m - 1.84m with feet flush on y = 0
      clonedScene.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(clonedScene);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);

      const baseTargetHeight = isFemale
        ? 1.66 + (seed % 4) * 0.025
        : isPlayer
        ? 1.8
        : 1.72 + (seed % 5) * 0.03;

      if (modelKey === 'hvgirl' || modelKey === 'soldier') {
        clonedScene.scale.setScalar(1.0);
        if (modelKey === 'hvgirl') {
          clonedScene.scale.setScalar(0.11);
        }
      } else if (rawSize.y > 0.1) {
        const s = baseTargetHeight / rawSize.y;
        const widthFactor = isKamal
          ? 1.14
          : isSikder
          ? 1.16
          : isFemale
          ? 0.94
          : 0.95 + (seed % 4) * 0.04;
        clonedScene.scale.set(s * widthFactor, s, s * widthFactor);
      }

      // Face forward (+Z) in the game engine's coordinate system
      if (modelKey === 'soldier') {
        clonedScene.rotation.y = Math.PI;
      }

      const skinTint = new THREE.Color(
        SOUTH_ASIAN_SKIN_TONES[seed % SOUTH_ASIAN_SKIN_TONES.length]
      );
      const hairTint = new THREE.Color(
        isSikder || (isHajiElder && seed % 2 === 0)
          ? '#e2e8f0'
          : HAIR_COLORS[seed % HAIR_COLORS.length]
      );
      const lungiPal = LUNGI_PALETTES[seed % LUNGI_PALETTES.length];
      const lungiTex = wearsLungi
        ? createLungiPatternTexture(lungiPal.a, lungiPal.b)
        : null;

      // Customize sub-meshes & materials per person so EVERY human looks distinct
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

          // Toggle Beard & Headwear (Tupi / Cap) on ReadyPlayerMe Human
          if (m.name === 'Wolf3D_Beard') {
            m.visible =
              isKamal ||
              isSikder ||
              isHajiElder ||
              wearsLungi ||
              seed % 2 === 0;
          }
          if (m.name === 'Mesh') {
            // Headwear mesh in readyplayerme1.glb
            m.visible = isHajiElder || isKamal || (wearsLungi && seed % 2 === 0);
          }

          const mat = (
            Array.isArray(m.material)
              ? m.material[0].clone()
              : (m.material as THREE.MeshStandardMaterial).clone()
          ) as THREE.MeshStandardMaterial;
          const matName = mat.name || '';

          if (
            m.name === 'Wolf3D_Outfit_Top' ||
            matName === 'Wolf3D_Outfit_Top' ||
            matName === 'T-shirt'
          ) {
            mat.color.set(isSikder ? '#1e293b' : shirtColor);
          } else if (
            m.name === 'Wolf3D_Outfit_Bottom' ||
            matName === 'Wolf3D_Outfit_Bottom' ||
            matName === 'short'
          ) {
            if (wearsLungi && lungiTex) {
              mat.map = lungiTex;
              mat.color.set('#ffffff');
            } else {
              mat.color.set(isSikder ? '#f8fafc' : pantsColor);
            }
          } else if (
            m.name === 'Wolf3D_Skin' ||
            m.name === 'Wolf3D_Head' ||
            m.name === 'Wolf3D_Body' ||
            matName === 'Wolf3D_Skin' ||
            matName === 'skin'
          ) {
            mat.color.lerp(skinTint, 0.35);
          } else if (
            m.name === 'Wolf3D_Hair' ||
            m.name === 'Wolf3D_Beard' ||
            matName === 'Wolf3D_Hair' ||
            matName === 'Wolf3D_Beard' ||
            matName === 'hair'
          ) {
            mat.color.set(hairTint);
          } else if (m.name === 'Mesh' || matName === 'Wolf3D_Headwear') {
            // White Prayer Tupi for Old Dhaka Haji, Red Gamcha Cap for Puller, Navy for Kamal
            mat.color.set(
              isHajiElder ? '#f8fafc' : wearsLungi ? '#dc2626' : '#1d4ed8'
            );
          } else if (modelKey === 'michelle' || modelKey === 'soldier') {
            mat.color.lerp(new THREE.Color(shirtColor), 0.45);
          }

          m.material = mat;
        }
      });

      // Set up skeletal animation (either native AnimationMixer or ReadyPlayerMe bone rig)
      if (gltf.animations && gltf.animations.length > 0) {
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
        // ReadyPlayerMe 3D Human Skeleton Bone Rig (rpm_male.glb & readyplayerme1.glb)
        const rig: RpmBoneRig = { phase: seed * 1.3 };
        clonedScene.traverse((node) => {
          if (node.name === 'LeftUpLeg')
            rig.leftUpLeg = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'RightUpLeg')
            rig.rightUpLeg = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'LeftLeg')
            rig.leftLeg = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'RightLeg')
            rig.rightLeg = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'LeftArm')
            rig.leftArm = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'RightArm')
            rig.rightArm = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'Spine' || node.name === 'Spine1')
            rig.spine = { bone: node, rest: node.quaternion.clone() };
          else if (node.name === 'Spine')
            rig.spine = { bone: node, rest: node.quaternion.clone() };
        });
        limbs.rpmRig = rig;
      }

      fallbackMeshGroup.visible = false;
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

const _axisX = new THREE.Vector3(1, 0, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);
const _tmpQuat = new THREE.Quaternion();

export function setCharacterAnimationState(
  limbs: CharacterLimbs,
  targetState: 'idle' | 'walk' | 'run',
  dt: number,
  activeToolId?: ToolWeaponId,
  isAimingOrFiring = false
) {
  // 1. Drive ReadyPlayerMe 3D Human Skeleton Bones smoothly when walking, running, or idling
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

    if (rig.spine) {
      const spineFlex = Math.sin(rig.phase * 0.9) * (targetState === 'idle' ? 0.025 : 0.06);
      _tmpQuat.setFromAxisAngle(_axisX, spineFlex);
      rig.spine.bone.quaternion.copy(rig.spine.rest).multiply(_tmpQuat);
    }

    // Realistic weapon-specific arm poses for firearms and melee
    if (activeToolId === 'type56_ak' || activeToolId === 'katta') {
      // Two-handed rifle assault hold
      if (rig.rightArm) {
        _tmpQuat.setFromAxisAngle(_axisX, isAimingOrFiring ? -1.55 : -1.35);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
      }
      if (rig.leftArm) {
        _tmpQuat.setFromAxisAngle(_axisX, isAimingOrFiring ? -1.35 : -1.15);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
      }
    } else if (
      activeToolId === 'shutter_pistol' ||
      activeToolId === 'pipe_gun' ||
      activeToolId === 'tt_pistol'
    ) {
      // Tactical pistol aim
      if (rig.rightArm) {
        _tmpQuat.setFromAxisAngle(_axisX, isAimingOrFiring ? -1.6 : -1.45);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
      }
      if (rig.leftArm) {
        _tmpQuat.setFromAxisAngle(_axisX, isAimingOrFiring ? -1.35 : -0.2);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
      }
    } else if (activeToolId && activeToolId !== 'fists') {
      // Melee hold (Ramda, Chapati, Bat, Lathi)
      if (rig.rightArm) {
        _tmpQuat.setFromAxisAngle(_axisX, isAimingOrFiring ? -1.85 : -0.75);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
      }
      if (rig.leftArm) {
        _tmpQuat.setFromAxisAngle(_axisZ, -s * 0.7);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
      }
    } else {
      // Unarmed natural gait swing - arms swing in opposing natural synchrony
      if (rig.leftArm) {
        _tmpQuat.setFromAxisAngle(_axisZ, s * 0.7);
        rig.leftArm.bone.quaternion.copy(rig.leftArm.rest).multiply(_tmpQuat);
      }
      if (rig.rightArm) {
        _tmpQuat.setFromAxisAngle(_axisZ, -s * 0.7);
        rig.rightArm.bone.quaternion.copy(rig.rightArm.rest).multiply(_tmpQuat);
      }
    }
    return;
  }

  // 2. Drive native GLTF AnimationMixer for HVGirl, Michelle, Soldier, etc.
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
  limbs.mixer.update(dt);
}

export function tintCharacterOutfit(
  limbs: CharacterLimbs,
  shirtHex: string,
  pantsHex?: string,
  isLungi = false
) {
  if (!limbs.gltfRoot) return;
  const lungiTex = isLungi
    ? createLungiPatternTexture('#1e3a8a', '#facc15')
    : null;
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
        mat.color.set(shirtHex);
      } else if (
        m.name === 'Wolf3D_Outfit_Bottom' ||
        mat.name === 'Wolf3D_Outfit_Bottom'
      ) {
        if (isLungi && lungiTex) {
          mat.map = lungiTex;
          mat.color.set('#ffffff');
          mat.needsUpdate = true;
        } else if (pantsHex) {
          mat.map = null;
          mat.color.set(pantsHex);
          mat.needsUpdate = true;
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

  const metalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    metalness: 0.88,
    roughness: 0.25,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.92,
    roughness: 0.2,
  });
  const rustedPipeMat = new THREE.MeshStandardMaterial({
    color: '#57534e',
    metalness: 0.72,
    roughness: 0.62,
  });
  const woodStockMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.52,
  });
  const tapeMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.85,
  });
  const bladeSteelMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.12,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#d97706',
    metalness: 0.85,
    roughness: 0.28,
  });

  const addMuzzle = (x: number, y: number, z: number) => {
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(x, y, z);
    weaponGroup.add(muzzle);
  };

  if (toolId === 'cricket_bat') {
    // Kashmir Willow Cricket Bat with rubber grip
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.045, 0.76),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.42 })
    );
    blade.position.set(0, 0, 0.35);
    weaponGroup.add(blade);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.32, 10).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.8 })
    );
    handle.position.set(0, 0, -0.15);
    weaponGroup.add(handle);
  } else if (toolId === 'bamboo_lathi') {
    // Solid Oil-Cured Bamboo Lathi
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.024, 1.25, 12).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.55 })
    );
    stick.position.set(0, 0, 0.45);
    weaponGroup.add(stick);

    // Bamboo nodal rings
    [-0.1, 0.2, 0.5, 0.8].forEach((zPos) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.03, 0.006, 8, 16),
        brassMat
      );
      ring.position.set(0, 0, zPos);
      weaponGroup.add(ring);
    });
  } else if (toolId === 'ramda') {
    // Authentic Deshi Ramda (দেশি রামদা - Heavy Hooked Bengali Cleaver)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.028, 0.38, 10).rotateX(Math.PI / 2),
      woodStockMat
    );
    handle.position.set(0, 0, -0.12);
    weaponGroup.add(handle);

    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.04, 12).rotateX(Math.PI / 2),
      brassMat
    );
    guard.position.set(0, 0, 0.06);
    weaponGroup.add(guard);

    // Sculpted curved heavy hooked blade
    const ramdaShape = new THREE.Shape();
    ramdaShape.moveTo(0, 0.06);
    ramdaShape.lineTo(0.03, 0.15);
    ramdaShape.lineTo(0.08, 0.65);
    ramdaShape.quadraticCurveTo(0.18, 0.95, 0.28, 1.05); // Distinctive hook tip
    ramdaShape.lineTo(0.24, 1.08);
    ramdaShape.quadraticCurveTo(0.02, 0.95, -0.01, 0.68);
    ramdaShape.lineTo(-0.01, 0.06);

    const ramdaGeo = new THREE.ExtrudeGeometry(ramdaShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.005,
      bevelSegments: 3,
    });
    ramdaGeo.rotateY(Math.PI / 2);
    ramdaGeo.translate(-0.009, 0, 0);

    const ramdaMesh = new THREE.Mesh(ramdaGeo, bladeSteelMat);
    ramdaMesh.rotation.x = Math.PI / 2;
    ramdaMesh.position.set(0, 0, 0.06);
    weaponGroup.add(ramdaMesh);
  } else if (toolId === 'chapati') {
    // Authentic Street Chapati (ধারালো চাপাতি - Street Meat Cleaver)
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.042, 0.24),
      tapeMat
    );
    handle.position.set(0, 0, -0.08);
    weaponGroup.add(handle);

    // Heavy rectangular cleaver blade with hanging hole
    const chapatiGeo = new THREE.BoxGeometry(0.012, 0.16, 0.55);
    const blade = new THREE.Mesh(chapatiGeo, bladeSteelMat);
    blade.position.set(0, 0.05, 0.26);
    weaponGroup.add(blade);

    // Dark spine reinforcement
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.025, 0.55),
      darkSteelMat
    );
    spine.position.set(0, 0.13, 0.26);
    weaponGroup.add(spine);
  } else if (toolId === 'stun_baton') {
    const baton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.72, 12).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        emissive: '#0369a1',
        emissiveIntensity: 0.65,
        metalness: 0.8,
      })
    );
    baton.position.set(0, 0, 0.32);
    weaponGroup.add(baton);

    const tipGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    tipGlow.position.set(0, 0, 0.68);
    weaponGroup.add(tipGlow);
  } else if (toolId === 'pipe_gun') {
    // Authentic Deshi Pipe Gun (দেশি পাইপ গান - 1-Shot Handcrafted Smoothbore)
    // 1. Galvanized iron water pipe barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.58, 12).rotateX(Math.PI / 2),
      rustedPipeMat
    );
    barrel.position.set(0, 0.02, 0.28);
    weaponGroup.add(barrel);

    // Barrel bore opening
    const bore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#09090b' })
    );
    bore.position.set(0, 0.02, 0.57);
    weaponGroup.add(bore);

    // 2. Welded breech chamber & lock bolt
    const breech = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.14, 12).rotateX(Math.PI / 2),
      darkSteelMat
    );
    breech.position.set(0, 0.02, 0.03);
    weaponGroup.add(breech);

    // 3. Wooden pistol grip wrapped in black tape
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.16, 0.065),
      tapeMat
    );
    grip.rotation.x = -0.35;
    grip.position.set(0, -0.07, -0.02);
    weaponGroup.add(grip);

    // 4. Exposed spring hammer
    const hammer = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.04, 0.03),
      brassMat
    );
    hammer.position.set(0, 0.05, -0.04);
    weaponGroup.add(hammer);

    addMuzzle(0, 0.02, 0.59);
  } else if (toolId === 'shutter_pistol') {
    // Authentic Shutter Gun (শাটার রিভলভার - Local 6-Shooter Revolver)
    // 1. 6-chamber cylinder
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.08, 14).rotateX(Math.PI / 2),
      metalMat
    );
    cylinder.position.set(0, 0.02, 0.08);
    weaponGroup.add(cylinder);

    // Flutes on cylinder
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const flute = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.07, 8).rotateX(Math.PI / 2),
        darkSteelMat
      );
      flute.position.set(Math.cos(angle) * 0.034, 0.02 + Math.sin(angle) * 0.034, 0.08);
      weaponGroup.add(flute);
    }

    // 2. Heavy 4-inch blued barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, 0.42, 12).rotateX(Math.PI / 2),
      metalMat
    );
    barrel.position.set(0, 0.025, 0.32);
    weaponGroup.add(barrel);

    // Top ventilated rib
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.018, 0.38),
      darkSteelMat
    );
    rib.position.set(0, 0.052, 0.31);
    weaponGroup.add(rib);

    // Front blade sight
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.018, 0.02),
      brassMat
    );
    sight.position.set(0, 0.065, 0.5);
    weaponGroup.add(sight);

    // 3. Frame & Wooden Grip
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.075, 0.18),
      metalMat
    );
    frame.position.set(0, 0.01, 0.02);
    weaponGroup.add(frame);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.15, 0.065),
      woodStockMat
    );
    grip.rotation.x = -0.42;
    grip.position.set(0, -0.06, -0.04);
    weaponGroup.add(grip);

    // Trigger guard & cocked hammer
    const guard = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.005, 8, 12),
      metalMat
    );
    guard.rotation.y = Math.PI / 2;
    guard.position.set(0, -0.03, 0.05);
    weaponGroup.add(guard);

    const hammer = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.032, 0.025),
      darkSteelMat
    );
    hammer.position.set(0, 0.05, -0.06);
    weaponGroup.add(hammer);

    addMuzzle(0, 0.025, 0.54);
  } else if (toolId === 'tt_pistol') {
    // Authentic 7.62mm TT Tokarev Pistol (টিটি পিস্তল - Military Grade BD Handgun)
    // 1. Machined steel slide
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.046, 0.38),
      darkSteelMat
    );
    slide.position.set(0, 0.038, 0.16);
    weaponGroup.add(slide);

    // Rear slide cocking serrations
    for (let i = 0; i < 5; i++) {
      const serration = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, 0.032, 0.008),
        metalMat
      );
      serration.position.set(0, 0.038, 0.02 + i * 0.018);
      weaponGroup.add(serration);
    }

    // Front blade sight & rear notch sight
    const frontSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.016, 0.018),
      metalMat
    );
    frontSight.position.set(0, 0.065, 0.33);
    weaponGroup.add(frontSight);

    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.014, 0.014),
      metalMat
    );
    rearSight.position.set(0, 0.065, -0.01);
    weaponGroup.add(rearSight);

    // 2. Steel lower frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.05, 0.28),
      darkSteelMat
    );
    frame.position.set(0, 0.01, 0.12);
    weaponGroup.add(frame);

    // 3. Ergonomic checkered grip with five-pointed star emblem
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.033, 0.155, 0.068),
      tapeMat
    );
    grip.rotation.x = -0.32;
    grip.position.set(0, -0.065, 0.01);
    weaponGroup.add(grip);

    // Star medallion on grip
    [-0.018, 0.018].forEach((xOff) => {
      const star = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.004, 5).rotateZ(Math.PI / 2),
        brassMat
      );
      star.position.set(xOff, -0.065, 0.01);
      weaponGroup.add(star);
    });

    // 4. Trigger guard & trigger
    const triggerGuard = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.005, 8, 12),
      metalMat
    );
    triggerGuard.rotation.y = Math.PI / 2;
    triggerGuard.position.set(0, -0.025, 0.11);
    weaponGroup.add(triggerGuard);

    // 5. Exposed spurred hammer
    const hammer = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.028, 0.024),
      metalMat
    );
    hammer.position.set(0, 0.048, -0.04);
    weaponGroup.add(hammer);

    // Barrel bore & muzzle
    const barrelBore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#09090b' })
    );
    barrelBore.position.set(0, 0.038, 0.35);
    weaponGroup.add(barrelBore);

    addMuzzle(0, 0.038, 0.36);
  } else if (toolId === 'katta') {
    // Authentic Deshi Katta (দেশি কাটা রাইফেল - Sawed-Off Double Barrel Shotgun)
    // 1. Twin side-by-side sawed-off steel barrels
    const barrelL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.52, 12).rotateX(Math.PI / 2),
      darkSteelMat
    );
    barrelL.position.set(-0.022, 0.02, 0.32);
    weaponGroup.add(barrelL);

    const barrelR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.52, 12).rotateX(Math.PI / 2),
      darkSteelMat
    );
    barrelR.position.set(0.022, 0.02, 0.32);
    weaponGroup.add(barrelR);

    // Twin dark muzzle bores
    [-0.022, 0.022].forEach((xOffset) => {
      const bore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.03, 10).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#09090b' })
      );
      bore.position.set(xOffset, 0.02, 0.58);
      weaponGroup.add(bore);
    });

    // 2. Heavy steel break-action breech & twin exposed hammers
    const breech = new THREE.Mesh(
      new THREE.BoxGeometry(0.076, 0.065, 0.16),
      metalMat
    );
    breech.position.set(0, 0.02, 0.04);
    weaponGroup.add(breech);

    [-0.02, 0.02].forEach((xOffset) => {
      const ham = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.034, 0.028),
        brassMat
      );
      ham.position.set(xOffset, 0.06, -0.03);
      weaponGroup.add(ham);
    });

    // 3. Sawed short wooden stock wrapped tightly with black electrical tape
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.26),
      woodStockMat
    );
    stock.rotation.x = -0.28;
    stock.position.set(0, -0.05, -0.14);
    weaponGroup.add(stock);

    // Black tape wrap bands around stock
    [-0.08, -0.14, -0.2].forEach((zPos) => {
      const tape = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.115, 0.04),
        tapeMat
      );
      tape.rotation.x = -0.28;
      tape.position.set(0, -0.05 + (zPos + 0.14) * 0.28, zPos);
      weaponGroup.add(tape);
    });

    // Twin triggers
    const triggerGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.045, 0.08),
      darkSteelMat
    );
    triggerGuard.position.set(0, -0.03, 0.02);
    weaponGroup.add(triggerGuard);

    addMuzzle(0, 0.02, 0.59);
  } else if (toolId === 'type56_ak') {
    // Authentic Type-56 Kalashnikov (টাইপ-৫৬ কালাশনিকভ - BD Assault Rifle)
    // 1. Stamped steel receiver body
    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.088, 0.38),
      metalMat
    );
    receiver.position.set(0, 0.02, 0.08);
    weaponGroup.add(receiver);

    // Ribbed receiver dust cover
    const dustCover = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.34, 10).rotateX(Math.PI / 2),
      darkSteelMat
    );
    dustCover.position.set(0, 0.068, 0.08);
    weaponGroup.add(dustCover);

    // 2. Wooden ribbed handguard & gas tube
    const gasTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.28, 10).rotateX(Math.PI / 2),
      metalMat
    );
    gasTube.position.set(0, 0.058, 0.38);
    weaponGroup.add(gasTube);

    const handguard = new THREE.Mesh(
      new THREE.BoxGeometry(0.054, 0.075, 0.26),
      woodStockMat
    );
    handguard.position.set(0, 0.02, 0.38);
    weaponGroup.add(handguard);

    // 3. Barrel & slant muzzle brake
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.42, 10).rotateX(Math.PI / 2),
      darkSteelMat
    );
    barrel.position.set(0, 0.025, 0.62);
    weaponGroup.add(barrel);

    // Hooded front sight post
    const frontSight = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.005, 6, 12),
      metalMat
    );
    frontSight.position.set(0, 0.062, 0.78);
    weaponGroup.add(frontSight);

    // Slant muzzle brake
    const brake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.016, 0.06, 10).rotateX(Math.PI / 2),
      darkSteelMat
    );
    brake.position.set(0, 0.025, 0.84);
    weaponGroup.add(brake);

    // 4. Iconic curved 30-round steel banana magazine
    const magShape = new THREE.Shape();
    magShape.moveTo(-0.02, 0);
    magShape.quadraticCurveTo(-0.06, -0.16, -0.03, -0.26);
    magShape.lineTo(0.04, -0.26);
    magShape.quadraticCurveTo(0.01, -0.16, 0.05, 0);
    magShape.closePath();

    const magGeo = new THREE.ExtrudeGeometry(magShape, {
      depth: 0.036,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    magGeo.rotateY(Math.PI / 2);
    magGeo.translate(-0.018, 0, 0);

    const magMesh = new THREE.Mesh(magGeo, darkSteelMat);
    magMesh.position.set(0, -0.02, 0.18);
    weaponGroup.add(magMesh);

    // 5. Wooden pistol grip & wooden shoulder stock
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, 0.16, 0.058),
      woodStockMat
    );
    grip.rotation.x = -0.38;
    grip.position.set(0, -0.07, -0.04);
    weaponGroup.add(grip);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.12, 0.36),
      woodStockMat
    );
    stock.position.set(0, -0.01, -0.28);
    weaponGroup.add(stock);

    addMuzzle(0, 0.025, 0.88);
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

  if (spawnType === 'dhaka_landmark_building') {
    const buildingGroup = new THREE.Group();
    const bw = 24;
    const bh = 22;
    const bd = 18;

    // Side & rear walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.65,
      bumpMap: loadRealTexture('/textures/brick_bump.jpg', 2, 2, false),
      bumpScale: 0.05,
    });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
    mainBody.position.y = bh / 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    buildingGroup.add(mainBody);

    // Front high-resolution photographic facade skin
    const facadeGeo = new THREE.PlaneGeometry(bw * 0.96, bh * 0.92);
    const facadeMat = new THREE.MeshBasicMaterial({ map: tex });
    const frontFacade = new THREE.Mesh(facadeGeo, facadeMat);
    frontFacade.position.set(0, bh * 0.48, bd / 2 + 0.08);
    buildingGroup.add(frontFacade);

    // Parapet roof cornice & dome
    const roofCornice = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 1.2, 1.2, bd + 1.2),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 })
    );
    roofCornice.position.y = bh + 0.6;
    buildingGroup.add(roofCornice);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        metalness: 0.6,
        roughness: 0.3,
      })
    );
    dome.position.set(0, bh + 1.2, 0);
    buildingGroup.add(dome);

    return buildingGroup;
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
