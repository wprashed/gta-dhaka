import * as THREE from 'three';
import { METRO_STATIONS } from '../../data/dhakaWorldData';
import {
  createMetroRouteMapTexture,
  createMetroStationSignTexture,
} from '../dhakaModels';
import type {
  MetroEscalatorZone,
  MetroStationInteriorZone,
  SceneBuilderContext,
} from './buildTypes';

export interface MetroNetworkContext extends SceneBuilderContext {
  metroEscalators: MetroEscalatorZone[];
  metroStationInteriors: MetroStationInteriorZone[];
  metroPortalRings: THREE.Mesh[];
}

export interface MetroTrainGroups {
  metroTrainGroup: THREE.Group;
  metroTrainGroup2: THREE.Group;
  metroTrainLine5East: THREE.Group;
  metroTrainLine5West: THREE.Group;
  playerMetroTrainL6: THREE.Group;
  playerMetroTrainL5: THREE.Group;
}

/**
 * Builds the elevated MRT Line-6 and Line-5 viaduct pillars, box girders,
 * catenary masts, 2-tier walk-in stations, street entry pavilions/totems,
 * and 6-coach Kawasaki rolling stock trainsets.
 */
export function buildMetroNetworkInScene(ctx: MetroNetworkContext): MetroTrainGroups {
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.85,
  });
  const railSteelMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.92,
    roughness: 0.18,
  });
  const mastSteelMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.85,
    roughness: 0.35,
  });
  const wireMat = new THREE.MeshBasicMaterial({ color: '#334155' });
  const concourseMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.72,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    transmission: 0.82,
    roughness: 0.08,
    transparent: true,
    opacity: 0.85,
  });
  const psdGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    transmission: 0.75,
    roughness: 0.12,
    transparent: true,
    opacity: 0.75,
  });

  // =========================================================================
  // SECTION A: MRT LINE-6 (NORTH-SOUTH) VIADUCT (Uttara Depot Z=-1250 to Kamalapur Z=+470)
  // =========================================================================
  const line6CrossRoads = [-1100, -850, -620, -460, -315, -198, -175, -28, 0, 175, 240, 285, 440];
  for (let z = -1240; z <= 460; z += 42) {
    if (line6CrossRoads.some((cr) => Math.abs(z - cr) < (cr === -28 ? 26 : 18))) continue;

    const nearBurigangaBridge = z >= 278 && z <= 468;
    const pierX = nearBurigangaBridge ? -15.2 : -12.2;

    ctx.circleColliders.push({
      x: pierX,
      z,
      radius: 1.15,
      tag: 'metro_pillar',
    });
    const pier = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.25, 11.5, 14),
      concreteMat
    );
    pier.position.set(pierX, 5.75, z);
    pier.castShadow = true;
    ctx.scene.add(pier);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(nearBurigangaBridge ? 7.8 : 6.4, 1.4, 3.4),
      concreteMat
    );
    cap.position.set(nearBurigangaBridge ? -12.9 : -12.2, 11.5, z);
    ctx.scene.add(cap);

    if (z % 84 === 0) {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.24), mastSteelMat);
      mast.position.set(-15.3, 15.6, z);
      ctx.scene.add(mast);

      const cantilever = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 0.18), mastSteelMat);
      cantilever.position.set(-13.0, 18.2, z);
      ctx.scene.add(cantilever);

      const dropArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
      dropArm1.position.set(-13.3, 17.8, z);
      ctx.scene.add(dropArm1);

      const dropArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
      dropArm2.position.set(-11.1, 17.8, z);
      ctx.scene.add(dropArm2);
    }
  }

  const line6Girder = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 1.25, 1720),
    concreteMat
  );
  line6Girder.position.set(-12.2, 12.6, -390);
  line6Girder.castShadow = true;
  ctx.scene.add(line6Girder);

  [-13.3, -11.1].forEach((wireX) => {
    const contactWire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1720, 6), wireMat);
    contactWire.position.set(wireX, 17.4, -390);
    contactWire.rotation.x = Math.PI / 2;
    ctx.scene.add(contactWire);
  });

  [-13.3, -11.1].forEach((trackX) => {
    [-0.45, 0.45].forEach((railOffsetX) => {
      const rail = ctx.sharedBox(0.12, 0.14, 1720, railSteelMat, trackX + railOffsetX, 13.28, -390);
      ctx.scene.add(rail);
    });
  });

  // =========================================================================
  // SECTION B: MRT LINE-5 NORTHERN ROUTE (EAST-WEST) VIADUCT (X: -460 to +650 at Z = -198)
  // =========================================================================
  const line5Z = -198;
  const line5CrossAvenues = [-420, -280, -170, -12.2, 14, 120, 260, 420, 560];
  for (let x = -460; x <= 640; x += 42) {
    if (line5CrossAvenues.some((ca) => Math.abs(x - ca) < 18)) continue;

    ctx.circleColliders.push({
      x,
      z: line5Z,
      radius: 1.2,
      tag: 'metro_pillar',
    });
    const pier5 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 15.6, 14),
      concreteMat
    );
    pier5.position.set(x, 7.8, line5Z);
    pier5.castShadow = true;
    ctx.scene.add(pier5);

    const cap5 = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.4, 6.4),
      concreteMat
    );
    cap5.position.set(x, 15.6, line5Z);
    ctx.scene.add(cap5);

    if (x % 84 === 0) {
      const mast5 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.24), mastSteelMat);
      mast5.position.set(x, 19.8, line5Z - 3.2);
      ctx.scene.add(mast5);

      const cantilever5 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.8), mastSteelMat);
      cantilever5.position.set(x, 22.4, line5Z - 0.9);
      ctx.scene.add(cantilever5);

      const dropArm5A = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
      dropArm5A.position.set(x, 22.0, line5Z - 1.2);
      ctx.scene.add(dropArm5A);

      const dropArm5B = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastSteelMat);
      dropArm5B.position.set(x, 22.0, line5Z + 1.2);
      ctx.scene.add(dropArm5B);
    }
  }

  const line5Girder = new THREE.Mesh(
    new THREE.BoxGeometry(1110, 1.25, 5.4),
    concreteMat
  );
  line5Girder.position.set(95, 16.8, line5Z);
  line5Girder.castShadow = true;
  ctx.scene.add(line5Girder);

  [line5Z - 1.2, line5Z + 1.2].forEach((wireZ) => {
    const contactWire5 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1110, 6), wireMat);
    contactWire5.position.set(95, 21.6, wireZ);
    contactWire5.rotation.z = Math.PI / 2;
    ctx.scene.add(contactWire5);
  });

  [line5Z - 1.2, line5Z + 1.2].forEach((trackZ) => {
    [-0.45, 0.45].forEach((railOffsetZ) => {
      const rail5 = ctx.sharedBox(1110, 0.14, 0.12, railSteelMat, 95, 17.48, trackZ + railOffsetZ);
      ctx.scene.add(rail5);
    });
  });

  // =========================================================================
  // SECTION C: COMPLETE 2-TIER DHAKA MRT STATIONS, PORTAL PIERS & ESCALATORS
  // =========================================================================
  const concourseGlowMat = new THREE.MeshStandardMaterial({
    color: '#fef3c7',
    emissive: new THREE.Color('#fde68a'),
    emissiveIntensity: 0.55,
    roughness: 0.18,
  });
  const roofSilverMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.68,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });
  const graniteTileMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.42,
    metalness: 0.15,
  });
  const mrtGreenTrimMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.35, metalness: 0.25 });
  const mrtRedTrimMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.35, metalness: 0.25 });
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
  const trussSteelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.65, roughness: 0.28 });
  const afcGateMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.3 });
  const ledGreenMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  const ledCyanMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
  const pidsAmberMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
  const rubberHandrailMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45 });

  const line6Stations = [
    { nameBn: 'উত্তরা উত্তর ডিপো স্টেশন', nameEn: 'UTTARA NORTH DEPOT', sz: -1150, hasStairs: true },
    { nameBn: 'উত্তরা সেন্টার মেট্রো স্টেশন', nameEn: 'UTTARA CENTER METRO', sz: -850, hasStairs: true },
    { nameBn: 'উত্তরা উত্তর / পল্লবী স্টেশন', nameEn: 'UTTARA NORTH / PALLABI', sz: -530, hasStairs: true },
    { nameBn: 'মিরপুর-১০ ইন্টারচেঞ্জ স্টেশন', nameEn: 'MIRPUR-10 GRAND INTERCHANGE', sz: -175, hasStairs: true, isHub: true },
    { nameBn: 'ফার্মগেট মেট্রো স্টেশন', nameEn: 'FARMGATE CENTRAL STATION', sz: -15, hasStairs: true },
    { nameBn: 'শাহবাগ / টিএসসি স্টেশন', nameEn: 'SHAHBAGH / TSC STATION', sz: 160, hasStairs: true },
    { nameBn: 'মতিঝিল / কমলাপুর স্টেশন', nameEn: 'MOTIJHEEL BANK PLAZA', sz: 270, hasStairs: true },
    { nameBn: 'কমলাপুর রেল টার্মিনাল স্টেশন', nameEn: 'KAMALAPUR TERMINAL', sz: 450, hasStairs: true },
  ];

  line6Stations.forEach((st) => {
    const routeMapTexL6 = createMetroRouteMapTexture(st.nameEn, 'L6');
    const routeMapMatL6 = new THREE.MeshBasicMaterial({ map: routeMapTexL6, side: THREE.DoubleSide });

    [-22, -7, 7, 22].forEach((bz) => {
      [-17.8, -12.2].forEach((px) => {
        const col = new THREE.Mesh(ctx.cylCache(0.72, 0.88, 12.6, 12), concreteMat);
        col.position.set(px, 6.3, st.sz + bz);
        ctx.scene.add(col);
        const capital = new THREE.Mesh(ctx.cylCache(1.18, 0.74, 1.1, 12), concreteMat);
        capital.position.set(px, 7.65, st.sz + bz);
        ctx.scene.add(capital);
        ctx.circleColliders.push({ x: px, z: st.sz + bz, radius: 0.92, tag: 'metro_station_pier' });
      });
      ctx.scene.add(ctx.sharedBox(15.2, 0.9, 1.4, concreteMat, -10.5, 8.2, st.sz + bz));
      if (bz !== -7) {
        ctx.scene.add(ctx.sharedBox(15.8, 1.0, 1.6, concreteMat, -10.5, 12.3, st.sz + bz));
      } else {
        ctx.scene.add(ctx.sharedBox(11.6, 1.0, 1.6, concreteMat, -8.8, 12.3, st.sz + bz));
      }
    });

    for (let exZ = -24; exZ <= 24; exZ += 12) {
      [-18.0, -3.0].forEach((exX) => {
        ctx.scene.add(ctx.sharedBox(0.38, 11.4, 0.65, trussSteelMat, exX, 14.3, st.sz + exZ));
      });
    }

    for (let sfz = -24; sfz <= 24; sfz += 6) {
      ctx.scene.add(ctx.sharedBox(14.0, 0.16, 0.45, trussSteelMat, -10.5, 8.48, st.sz + sfz));
    }

    ctx.scene.add(ctx.sharedBox(14.2, 0.42, 58, concourseMat, -10.5, 8.75, st.sz));
    ctx.scene.add(ctx.sharedBox(2.8, 0.04, 54, graniteTileMat, -10.5, 8.97, st.sz));
    ctx.scene.add(ctx.sharedBox(1.8, 0.14, 54, concourseGlowMat, -10.5, 12.2, st.sz));
    for (let clz = -24; clz <= 24; clz += 8) {
      ctx.scene.add(ctx.sharedBox(10.5, 0.1, 0.35, concourseGlowMat, -10.5, 12.15, st.sz + clz));
    }
    ctx.scene.add(ctx.sharedBox(1.1, 1.35, 2.2, afcGateMat, -8.5, 9.64, st.sz - 12));
    ctx.scene.add(ctx.sharedBox(0.14, 0.45, 1.4, ledGreenMat, -9.08, 9.85, st.sz - 12));
    ctx.scene.add(ctx.sharedBox(4.2, 0.52, 0.18, mrtGreenTrimMat, -12.5, 11.65, st.sz + 3));
    ctx.scene.add(ctx.sharedBox(3.8, 0.32, 0.22, concourseGlowMat, -12.5, 11.65, st.sz + 3));
    const l6DirSign = st.sz === -175 ? 1 : -1;
    const l6LandCenterZ = (st.sz === -175 ? st.sz - 22 : st.sz + 22) + l6DirSign * 15.5;
    [-3.45, -17.45].forEach((wx) => {
      if (wx < -10) {
        const zNorthMin = st.sz - 28.5;
        const zNorthMax = l6LandCenterZ - 2.0;
        if (zNorthMax > zNorthMin + 1) {
          ctx.scene.add(ctx.sharedBox(0.18, 2.9, zNorthMax - zNorthMin, glassMat, wx, 10.4, (zNorthMin + zNorthMax) * 0.5));
        }
        const zSouthMin = l6LandCenterZ + 2.0;
        const zSouthMax = st.sz + 28.5;
        if (zSouthMax > zSouthMin + 1) {
          ctx.scene.add(ctx.sharedBox(0.18, 2.9, zSouthMax - zSouthMin, glassMat, wx, 10.4, (zSouthMin + zSouthMax) * 0.5));
        }
      } else {
        ctx.scene.add(ctx.sharedBox(0.18, 2.9, 57, glassMat, wx, 10.4, st.sz));
      }
      ctx.scene.add(ctx.sharedBox(0.26, 0.52, 58.2, mrtGreenTrimMat, wx, 8.95, st.sz));
      ctx.scene.add(ctx.sharedBox(0.28, 0.44, 58.2, mastSteelMat, wx, 12.05, st.sz));
      for (let mz = -27; mz <= 27; mz += 4.5) {
        if (wx < -10 && Math.abs(st.sz + mz - l6LandCenterZ) < 2.2) continue;
        ctx.scene.add(ctx.sharedBox(0.26, 3.1, 0.16, mastSteelMat, wx, 10.4, st.sz + mz));
      }
    });

    ctx.scene.add(ctx.sharedBox(2.2, 2.6, 5.4, mrtGreenTrimMat, -5.8, 10.26, st.sz));
    ctx.scene.add(ctx.sharedBox(2.3, 1.25, 4.4, glassMat, -5.8, 10.4, st.sz));
    ctx.scene.add(ctx.sharedBox(2.4, 0.35, 5.5, trussSteelMat, -5.8, 11.65, st.sz));
    ctx.scene.add(ctx.sharedBox(0.12, 0.55, 1.4, ledCyanMat, -6.92, 10.4, st.sz));

    [-9.5, -6.5, 6.5, 9.5].forEach((tz) => {
      ctx.scene.add(ctx.sharedBox(0.85, 1.95, 1.15, mrtGreenTrimMat, -5.6, 9.94, st.sz + tz));
      ctx.scene.add(ctx.sharedBox(0.08, 0.72, 0.65, ledCyanMat, -6.04, 10.18, st.sz + tz));
    });

    [-5.5, -3.5, 3.5, 5.5].forEach((dz) => {
      ctx.scene.add(ctx.sharedBox(0.22, 1.02, 1.45, afcGateMat, -11.4, 9.48, st.sz + dz));
      ctx.scene.add(ctx.sharedBox(0.06, 0.24, 0.24, ledGreenMat, -11.52, 9.85, st.sz + dz));
      ctx.scene.add(ctx.sharedBox(0.05, 0.65, 0.45, psdGlassMat, -11.4, 9.45, st.sz + dz + 0.85));
    });

    const intZ1 = st.sz - 8.5;
    const intZ2 = st.sz + 1.5;
    const intX = -15.75;
    for (let is = 0; is < 18; is++) {
      const ft = (is + 0.5) / 18;
      const stepY = THREE.MathUtils.lerp(8.92, 13.10, ft);
      const stepZ = THREE.MathUtils.lerp(intZ1, intZ2, ft);
      const step = new THREE.Mesh(ctx.boxCache(1.85, 0.38, 0.72), afcGateMat);
      step.position.set(intX, stepY, stepZ);
      ctx.scene.add(step);
      ctx.scene.add(ctx.sharedBox(1.82, 0.035, 0.08, yellowLineMat, intX, stepY + 0.195, stepZ - 0.30));
    }

    ctx.scene.add(ctx.sharedBox(0.12, 1.05, 10.5, trussSteelMat, -14.7, 13.85, (intZ1 + intZ2) * 0.5));
    ctx.scene.add(ctx.sharedBox(0.12, 1.05, 10.5, trussSteelMat, -16.8, 13.85, (intZ1 + intZ2) * 0.5));
    ctx.scene.add(ctx.sharedBox(2.2, 1.05, 0.12, trussSteelMat, intX, 13.85, st.sz - 8.8));
    ctx.buildingColliders.push(
      { minX: -14.8, maxX: -14.6, minZ: st.sz - 8.9, maxZ: st.sz + 1.7, minY: 12.8, maxY: 15.2, tag: 'metro_stair_rail' },
      { minX: -16.9, maxX: -16.7, minZ: st.sz - 8.9, maxZ: st.sz + 1.7, minY: 12.8, maxY: 15.2, tag: 'metro_stair_rail' },
      { minX: -16.9, maxX: -14.6, minZ: st.sz - 8.9, maxZ: st.sz - 8.7, minY: 12.8, maxY: 15.2, tag: 'metro_stair_rail' }
    );

    ctx.scene.add(ctx.sharedBox(11.8, 0.52, 64, concourseMat, -8.8, 12.6, st.sz));
    ctx.scene.add(ctx.sharedBox(1.3, 0.52, 64, concourseMat, -17.45, 12.6, st.sz));
    ctx.scene.add(ctx.sharedBox(2.1, 0.52, 23.2, concourseMat, intX, 12.6, st.sz - 20.4));
    ctx.scene.add(ctx.sharedBox(2.1, 0.52, 30.3, concourseMat, intX, 12.6, st.sz + 16.85));

    ctx.scene.add(ctx.sharedBox(0.8, 0.44, 62, concourseMat, -14.3, 13.08, st.sz));
    ctx.scene.add(ctx.sharedBox(1.1, 0.44, 62, concourseMat, -17.35, 13.08, st.sz));
    ctx.scene.add(ctx.sharedBox(2.1, 0.44, 22.2, concourseMat, intX, 13.08, st.sz - 19.9));
    ctx.scene.add(ctx.sharedBox(2.1, 0.44, 29.3, concourseMat, intX, 13.08, st.sz + 16.35));

    ctx.scene.add(ctx.sharedBox(5.6, 0.44, 62, concourseMat, -6.5, 13.08, st.sz));

    [-1, 1].forEach((wingSide) => {
      const wing = new THREE.Mesh(ctx.boxCache(7.6, 0.24, 65), roofSilverMat);
      wing.position.set(-10.5 + wingSide * 5.3, 19.65, st.sz);
      wing.rotation.z = wingSide * 0.18;
      ctx.scene.add(wing);
      const fasciaTrim = new THREE.Mesh(ctx.boxCache(0.32, 0.65, 65.2), mrtGreenTrimMat);
      fasciaTrim.position.set(-10.5 + wingSide * 9.0, 20.1, st.sz);
      ctx.scene.add(fasciaTrim);
    });
    ctx.scene.add(ctx.sharedBox(4.4, 0.18, 64.5, glassMat, -10.5, 19.1, st.sz));
    for (let rz = -26; rz <= 26; rz += 13) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(8.65, 0.18, 6, 18, Math.PI),
        trussSteelMat
      );
      rib.position.set(-10.5, 18.8, st.sz + rz);
      ctx.scene.add(rib);
    }
    ctx.scene.add(ctx.sharedBox(2.2, 0.14, 58, concourseGlowMat, -10.5, 18.85, st.sz));
    [-15.8, -6.4].forEach((lx) => {
      ctx.scene.add(ctx.sharedBox(0.35, 0.1, 56, concourseGlowMat, lx, 18.4, st.sz));
    });

    [-17.8, -3.2].forEach((wx) => {
      ctx.scene.add(ctx.sharedBox(0.2, 3.4, 62, glassMat, wx, 15.2, st.sz));
      ctx.scene.add(ctx.sharedBox(0.32, 0.35, 62.2, mrtGreenTrimMat, wx, 13.45, st.sz));
      ctx.scene.add(ctx.sharedBox(0.32, 0.35, 62.2, trussSteelMat, wx, 17.0, st.sz));
      for (let mz = -28; mz <= 28; mz += 7) {
        ctx.scene.add(ctx.sharedBox(0.28, 3.8, 0.28, mastSteelMat, wx, 15.2, st.sz + mz));
      }
      for (let lz = -26; lz <= 26; lz += 1.6) {
        ctx.scene.add(ctx.sharedBox(0.38, 2.9, 0.08, trussSteelMat, wx + (wx < -10 ? -0.22 : 0.22), 15.3, st.sz + lz));
      }
    });

    [-14.2, -10.2].forEach((psdX) => {
      ctx.scene.add(ctx.sharedBox(0.12, 1.75, 56, psdGlassMat, psdX, 14.18, st.sz));
      ctx.buildingColliders.push({
        minX: psdX - 0.14,
        maxX: psdX + 0.14,
        minZ: st.sz - 28.0,
        maxZ: st.sz + 28.0,
        minY: 12.8,
        maxY: 17.0,
        tag: 'metro_psd',
      });
      ctx.scene.add(ctx.sharedBox(0.28, 0.42, 56.2, trussSteelMat, psdX, 15.25, st.sz));
      ctx.scene.add(ctx.sharedBox(0.30, 0.14, 56.2, mrtGreenTrimMat, psdX, 15.5, st.sz));
      const routeStrip = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.38), routeMapMatL6);
      routeStrip.position.set(psdX + (psdX < -12 ? -0.16 : 0.16), 15.25, st.sz);
      routeStrip.rotation.y = psdX < -12 ? -Math.PI / 2 : Math.PI / 2;
      ctx.scene.add(routeStrip);
      for (let dz = -26; dz <= 26; dz += 4) {
        ctx.scene.add(ctx.sharedBox(0.22, 2.05, 0.24, mastSteelMat, psdX, 14.3, st.sz + dz));
        ctx.scene.add(ctx.sharedBox(0.26, 0.12, 0.18, ledGreenMat, psdX, 15.1, st.sz + dz + 2));
      }
      ctx.scene.add(ctx.sharedBox(0.26, 0.04, 56, yellowLineMat, psdX + (psdX < -12 ? -0.45 : 0.45), 13.32, st.sz));
    });

    [-18, 0, 18].forEach((bz) => {
      ctx.scene.add(ctx.sharedBox(0.75, 0.48, 3.6, trussSteelMat, -5.2, 13.54, st.sz + bz));
      ctx.scene.add(ctx.sharedBox(0.14, 0.55, 3.6, mrtGreenTrimMat, -4.85, 13.92, st.sz + bz));
    });

    [-14, 14].forEach((pz) => {
      ctx.scene.add(ctx.sharedBox(3.8, 0.85, 0.28, afcGateMat, -10.5, 16.5, st.sz + pz));
      ctx.scene.add(ctx.sharedBox(3.4, 0.55, 0.32, pidsAmberMat, -10.5, 16.5, st.sz + pz));
    });

    for (let tz = -28; tz <= 28; tz += 1.4) {
      [-13.3, -11.1].forEach((trackX) => {
        ctx.scene.add(ctx.sharedBox(1.5, 0.08, 0.24, afcGateMat, trackX, 13.2, st.sz + tz));
      });
    }
    [-29.5, 29.5].forEach((sigZ) => {
      ctx.scene.add(ctx.sharedBox(0.14, 2.6, 0.14, mastSteelMat, -10.1, 14.6, st.sz + sigZ));
      ctx.scene.add(ctx.sharedBox(0.28, 0.72, 0.22, afcGateMat, -10.1, 15.85, st.sz + sigZ));
      ctx.scene.add(ctx.sharedBox(0.16, 0.16, 0.26, ledGreenMat, -10.1, 16.0, st.sz + sigZ));
    });

    ctx.metroStationInteriors.push({
      concourseMinX: -17.6,
      concourseMaxX: -3.4,
      concourseMinZ: st.sz - 28.5,
      concourseMaxZ: st.sz + 28.5,
      concourseY: 8.96,
      platMinX: -17.8,
      platMaxX: -3.3,
      platMinZ: st.sz - 30.5,
      platMaxZ: st.sz + 30.5,
      platY: 13.30,
      inX1: intX,
      inZ1: intZ1,
      inY1: 8.96,
      inX2: intX,
      inZ2: intZ2,
      inY2: 13.30,
      inHalfW: 1.0,
    });

    if (st.hasStairs) {
      const dirSign = st.sz === -175 ? 1 : -1;
      const stairBaseZ = st.sz === -175 ? st.sz - 22 : st.sz + 22;
      const kioskZ = stairBaseZ - dirSign * 3.4;
      const stairX = -20.2;
      const topZ = stairBaseZ + dirSign * 14;
      const startPos = new THREE.Vector3(stairX, 0.04, stairBaseZ - dirSign * 0.9);
      const endPos = new THREE.Vector3(stairX, 8.95, topZ);
      const midPos = startPos.clone().add(endPos).multiplyScalar(0.5);
      const spanLen = startPos.distanceTo(endPos);

      const stairBridge = new THREE.Mesh(ctx.boxCache(2.6, 0.42, spanLen), concourseMat);
      stairBridge.position.copy(midPos).add(new THREE.Vector3(0, -0.32, 0));
      stairBridge.lookAt(endPos.clone().add(new THREE.Vector3(0, -0.32, 0)));
      ctx.scene.add(stairBridge);

      ctx.scene.add(ctx.sharedBox(2.95, 0.22, 1.9, concourseMat, stairX, 0.11, stairBaseZ - dirSign * 0.65));

      const escSteps = 26;
      for (let es = 0; es < escSteps; es++) {
        const ft = (es + 0.5) / escSteps;
        const sx = THREE.MathUtils.lerp(startPos.x, endPos.x, ft);
        const sy = THREE.MathUtils.lerp(0.10, endPos.y - 0.15, ft);
        const sz = THREE.MathUtils.lerp(startPos.z, endPos.z, ft);
        const tread = new THREE.Mesh(ctx.boxCache(2.14, 0.40, 0.78), afcGateMat);
        tread.position.set(sx, sy, sz);
        ctx.scene.add(tread);
        ctx.scene.add(ctx.sharedBox(2.10, 0.035, 0.09, yellowLineMat, sx, sy + 0.21, sz + dirSign * 0.30));
      }
      [-1.18, 1.18].forEach((bx) => {
        const railGlass = new THREE.Mesh(ctx.boxCache(0.1, 0.85, spanLen), glassMat);
        railGlass.position.copy(midPos).add(new THREE.Vector3(bx, 0.66, 0));
        railGlass.lookAt(endPos.clone().add(new THREE.Vector3(bx, 0.66, 0)));
        ctx.scene.add(railGlass);
        const handrail = new THREE.Mesh(ctx.boxCache(0.18, 0.12, spanLen), rubberHandrailMat);
        handrail.position.copy(midPos).add(new THREE.Vector3(bx, 1.12, 0));
        handrail.lookAt(endPos.clone().add(new THREE.Vector3(bx, 1.12, 0)));
        ctx.scene.add(handrail);
      });

      const landCenterZ = topZ + dirSign * 1.5;
      ctx.scene.add(ctx.sharedBox(5.2, 0.42, 3.8, concourseMat, -19.4, 8.75, landCenterZ));
      ctx.scene.add(ctx.sharedBox(0.12, 1.05, 3.8, trussSteelMat, -21.95, 9.48, landCenterZ));
      ctx.scene.add(ctx.sharedBox(5.2, 1.05, 0.12, trussSteelMat, -19.4, 9.48, landCenterZ + dirSign * 1.85));
      [-1.55, 1.55].forEach((dz) => {
        ctx.scene.add(ctx.sharedBox(0.28, 2.8, 0.24, afcGateMat, -17.35, 10.35, landCenterZ + dz));
      });
      ctx.scene.add(ctx.sharedBox(0.36, 0.45, 3.4, mrtGreenTrimMat, -17.32, 11.75, landCenterZ));

      const canopyStart = startPos.clone().lerp(endPos, 0.14);
      const canopyMid = canopyStart.clone().add(endPos).multiplyScalar(0.5);
      const canopyLen = canopyStart.distanceTo(endPos);
      const stairGlassTube = new THREE.Mesh(ctx.boxCache(3.0, 2.45, canopyLen), glassMat);
      stairGlassTube.position.copy(canopyMid).add(new THREE.Vector3(0, 1.5, 0));
      stairGlassTube.lookAt(endPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      ctx.scene.add(stairGlassTube);
      const stairRoofCap = new THREE.Mesh(ctx.boxCache(3.25, 0.18, canopyLen), mrtGreenTrimMat);
      stairRoofCap.position.copy(canopyMid).add(new THREE.Vector3(0, 2.75, 0));
      stairRoofCap.lookAt(endPos.clone().add(new THREE.Vector3(0, 2.75, 0)));
      ctx.scene.add(stairRoofCap);

      ctx.scene.add(ctx.sharedBox(4.5, 0.22, 5.6, concourseMat, stairX, 0.11, kioskZ));
      ctx.scene.add(ctx.sharedBox(2.4, 0.03, 5.2, graniteTileMat, stairX, 0.23, kioskZ));
      const entryApron = new THREE.Mesh(ctx.boxCache(4.5, 0.18, 1.5), graniteTileMat);
      entryApron.position.set(stairX, 0.06, kioskZ - dirSign * 3.4);
      entryApron.rotation.x = dirSign * 0.15;
      ctx.scene.add(entryApron);

      ctx.scene.add(ctx.sharedBox(4.8, 0.52, 5.8, mrtGreenTrimMat, stairX, 3.85, kioskZ));
      ctx.scene.add(ctx.sharedBox(5.1, 0.18, 6.1, trussSteelMat, stairX, 4.18, kioskZ));
      ctx.scene.add(ctx.sharedBox(3.4, 0.1, 4.0, concourseGlowMat, stairX, 3.55, kioskZ));

      [-2.05, 2.05].forEach((ox) => {
        ctx.scene.add(ctx.sharedBox(0.24, 0.95, 5.4, graniteTileMat, stairX + ox, 0.6, kioskZ));
        ctx.scene.add(ctx.sharedBox(0.14, 2.55, 5.0, glassMat, stairX + ox, 2.35, kioskZ));
        [-2.5, 0, 2.5].forEach((cz) => {
          ctx.scene.add(ctx.sharedBox(0.26, 3.65, 0.26, mastSteelMat, stairX + ox, 2.0, kioskZ + cz));
        });
        ctx.buildingColliders.push({
          minX: stairX + ox - 0.18,
          maxX: stairX + ox + 0.18,
          minZ: kioskZ - 2.8,
          maxZ: kioskZ + 2.8,
          minY: 0,
          maxY: 4.3,
          tag: 'metro_kiosk_wall',
        });
      });

      [-1.08, 1.08].forEach((tx) => {
        ctx.scene.add(ctx.sharedBox(0.28, 0.98, 1.48, trussSteelMat, stairX + tx, 0.71, kioskZ));
        ctx.scene.add(ctx.sharedBox(0.30, 0.16, 1.50, mrtGreenTrimMat, stairX + tx, 1.15, kioskZ));
        ctx.scene.add(ctx.sharedBox(0.24, 0.12, 0.24, ledGreenMat, stairX + tx, 1.25, kioskZ - dirSign * 0.55));
        ctx.scene.add(ctx.sharedBox(0.24, 0.12, 0.24, ledCyanMat, stairX + tx, 1.25, kioskZ + dirSign * 0.55));
        ctx.scene.add(ctx.sharedBox(0.32, 0.62, 0.06, psdGlassMat, stairX + tx - (tx > 0 ? 0.28 : -0.28), 0.78, kioskZ));
        ctx.buildingColliders.push({
          minX: stairX + tx - 0.16,
          maxX: stairX + tx + 0.16,
          minZ: kioskZ - 0.76,
          maxZ: kioskZ + 0.76,
          minY: 0,
          maxY: 1.5,
          tag: 'metro_turnstile',
        });
      });
      const landCol = new THREE.Mesh(ctx.cylCache(0.42, 0.52, 8.6, 10), concreteMat);
      landCol.position.set(-19.5, 4.3, landCenterZ);
      ctx.scene.add(landCol);

      ctx.metroEscalators.push({
        x1: startPos.x,
        z1: startPos.z,
        y1: 0.22,
        x2: endPos.x,
        z2: endPos.z,
        y2: endPos.y + 0.08,
        halfWidth: 1.45,
        kioskX: stairX,
        kioskZ,
        kioskHalfX: 2.25,
        kioskHalfZ: 2.75,
        landMinX: -22.0,
        landMaxX: -16.8,
        landMinZ: landCenterZ - 1.9,
        landMaxZ: landCenterZ + 1.9,
        landY: 8.96,
      });
    }

    const signTex = createMetroStationSignTexture(
      st.nameBn,
      st.nameEn,
      'MRT LINE-6 • ঢাকা মেট্রো',
      '#059669',
      'PLATFORM 1: UTTARA NORTH  |  PLATFORM 2: KAMALAPUR'
    );
    const signMatL6 = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
    [-32.2, 32.2].forEach((dz) => {
      const sb = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 3.0), signMatL6);
      sb.position.set(-10.5, 17.6, st.sz + dz);
      ctx.scene.add(sb);
    });
    [-18.15, -2.85].forEach((sx, sIdx) => {
      const sideSignL6 = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 2.9), signMatL6);
      sideSignL6.rotation.y = sIdx === 0 ? -Math.PI / 2 : Math.PI / 2;
      sideSignL6.position.set(sx, 14.2, st.sz);
      ctx.scene.add(sideSignL6);
    });
  });

  const line5Stations = [
    { nameBn: 'মিরপুর পশ্চিম মেট্রো স্টেশন', nameEn: 'MIRPUR WEST METRO (LINE-5)', sx: -380 },
    { nameBn: 'মহাখালী উত্তর / বনানী স্টেশন', nameEn: 'MOHAKHALI NORTH / BANANI', sx: 95 },
    { nameBn: 'গুলশান-২ ডিপ্লোম্যাটিক স্টেশন', nameEn: 'GULSHAN-2 DIPLOMATIC CIRCLE', sx: 260 },
    { nameBn: 'নতুন বাজার / গুলশান লিংক', nameEn: 'NATUN BAZAR / GULSHAN-2 LINK', sx: 430 },
  ];

  line5Stations.forEach((st) => {
    const routeMapTexL5 = createMetroRouteMapTexture(st.nameEn, 'L5');
    const routeMapMatL5 = new THREE.MeshBasicMaterial({ map: routeMapTexL5, side: THREE.DoubleSide });

    [-22, 0, 22].forEach((bx) => {
      [line5Z - 7.8, line5Z + 7.8].forEach((pz) => {
        const col5 = new THREE.Mesh(ctx.cylCache(0.75, 0.9, 16.5, 12), concreteMat);
        col5.position.set(st.sx + bx, 8.25, pz);
        ctx.scene.add(col5);
        const cap5Flared = new THREE.Mesh(ctx.cylCache(1.2, 0.78, 1.1, 12), concreteMat);
        cap5Flared.position.set(st.sx + bx, 11.65, pz);
        ctx.scene.add(cap5Flared);
        ctx.circleColliders.push({ x: st.sx + bx, z: pz, radius: 0.92, tag: 'metro_station_pier' });
      });
      ctx.scene.add(ctx.sharedBox(1.5, 1.0, 16.6, concreteMat, st.sx + bx, 12.2, line5Z));
      ctx.scene.add(ctx.sharedBox(1.6, 1.1, 17.2, concreteMat, st.sx + bx, 16.3, line5Z));
    });

    ctx.scene.add(ctx.sharedBox(58, 0.42, 14.0, concourseMat, st.sx, 12.65, line5Z));
    ctx.scene.add(ctx.sharedBox(54, 0.04, 2.8, graniteTileMat, st.sx, 12.88, line5Z));
    ctx.scene.add(ctx.sharedBox(54, 0.14, 1.8, concourseGlowMat, st.sx, 16.2, line5Z));
    [line5Z - 6.95, line5Z + 6.95].forEach((wz, wIdx) => {
      ctx.scene.add(ctx.sharedBox(58.2, 0.48, 0.24, mrtRedTrimMat, st.sx, 12.95, wz));
      if (wIdx === 1) {
        ctx.scene.add(ctx.sharedBox(57, 2.8, 0.18, glassMat, st.sx, 14.3, wz));
      } else {
        ctx.scene.add(ctx.sharedBox(21, 2.8, 0.18, glassMat, st.sx - 18, 14.3, wz));
        ctx.scene.add(ctx.sharedBox(30, 2.8, 0.18, glassMat, st.sx + 13, 14.3, wz));
      }
      for (let mx = -27; mx <= 27; mx += 5.4) {
        ctx.scene.add(ctx.sharedBox(0.16, 3.0, 0.26, mastSteelMat, st.sx + mx, 14.3, wz));
      }
    });
    ctx.scene.add(ctx.sharedBox(5.2, 2.5, 2.0, mrtRedTrimMat, st.sx - 15, 14.1, line5Z + 4.8));
    ctx.scene.add(ctx.sharedBox(4.2, 1.2, 2.1, glassMat, st.sx - 15, 14.25, line5Z + 4.8));
    [-10, -8].forEach((ax) => {
      ctx.scene.add(ctx.sharedBox(1.4, 1.0, 0.22, afcGateMat, st.sx + ax, 13.38, line5Z + 1.2));
      ctx.scene.add(ctx.sharedBox(0.24, 0.24, 0.08, ledGreenMat, st.sx + ax, 13.75, line5Z + 1.34));
    });

    const int5X1 = st.sx + 4;
    const int5X2 = st.sx + 14;
    const int5Z = line5Z - 4.9;
    for (let is = 0; is < 18; is++) {
      const ft = (is + 0.5) / 18;
      const sy5 = THREE.MathUtils.lerp(12.82, 17.36, ft);
      const sx5 = THREE.MathUtils.lerp(int5X1, int5X2, ft);
      const step = new THREE.Mesh(ctx.boxCache(0.76, 0.38, 1.85), afcGateMat);
      step.position.set(sx5, sy5, int5Z);
      ctx.scene.add(step);
      ctx.scene.add(ctx.sharedBox(0.08, 0.035, 1.82, yellowLineMat, sx5 - 0.30, sy5 + 0.195, int5Z));
    }
    ctx.scene.add(ctx.sharedBox(10.4, 1.05, 0.12, trussSteelMat, (int5X1 + int5X2) * 0.5, 18.08, int5Z + 1.02));
    ctx.scene.add(ctx.sharedBox(10.4, 1.05, 0.12, trussSteelMat, (int5X1 + int5X2) * 0.5, 18.08, int5Z - 1.02));
    ctx.scene.add(ctx.sharedBox(0.12, 1.05, 2.04, trussSteelMat, int5X1 - 0.2, 18.08, int5Z));
    ctx.buildingColliders.push(
      { minX: int5X1 - 0.25, maxX: int5X2 + 0.2, minZ: int5Z + 0.94, maxZ: int5Z + 1.12, minY: 17.0, maxY: 19.5, tag: 'metro_stair_rail' },
      { minX: int5X1 - 0.25, maxX: int5X2 + 0.2, minZ: int5Z - 1.12, maxZ: int5Z - 0.94, minY: 17.0, maxY: 19.5, tag: 'metro_stair_rail' },
      { minX: int5X1 - 0.3, maxX: int5X1 - 0.1, minZ: int5Z - 1.05, maxZ: int5Z + 1.05, minY: 17.0, maxY: 19.5, tag: 'metro_stair_rail' }
    );

    ctx.scene.add(ctx.sharedBox(64, 0.52, 11.4, concourseMat, st.sx, 16.85, line5Z + 1.9));
    ctx.scene.add(ctx.sharedBox(35.8, 0.52, 3.8, concourseMat, st.sx - 14.1, 16.85, line5Z - 5.7));
    ctx.scene.add(ctx.sharedBox(17.5, 0.52, 3.8, concourseMat, st.sx + 23.25, 16.85, line5Z - 5.7));
    ctx.scene.add(ctx.sharedBox(62, 0.44, 1.4, concourseMat, st.sx, 17.33, line5Z - 3.2));
    ctx.scene.add(ctx.sharedBox(62, 0.44, 1.35, concourseMat, st.sx, 17.33, line5Z - 6.62));
    ctx.scene.add(ctx.sharedBox(34.8, 0.44, 2.1, concourseMat, st.sx - 13.6, 17.33, int5Z));
    ctx.scene.add(ctx.sharedBox(16.7, 0.44, 2.1, concourseMat, st.sx + 22.65, 17.33, int5Z));
    ctx.scene.add(ctx.sharedBox(62, 0.44, 4.8, concourseMat, st.sx, 17.33, line5Z + 4.9));

    ctx.metroStationInteriors.push({
      concourseMinX: st.sx - 28.5,
      concourseMaxX: st.sx + 28.5,
      concourseMinZ: line5Z - 7.0,
      concourseMaxZ: line5Z + 7.0,
      concourseY: 12.86,
      platMinX: st.sx - 30.5,
      platMaxX: st.sx + 30.5,
      platMinZ: line5Z - 7.4,
      platMaxZ: line5Z + 7.4,
      platY: 17.55,
      inX1: int5X1,
      inZ1: int5Z,
      inY1: 12.86,
      inX2: int5X2,
      inZ2: int5Z,
      inY2: 17.55,
      inHalfW: 1.0,
    });

    [-1, 1].forEach((wingSide) => {
      const wing5 = new THREE.Mesh(ctx.boxCache(65, 0.24, 7.6), roofSilverMat);
      wing5.position.set(st.sx, 23.8, line5Z + wingSide * 5.3);
      wing5.rotation.x = -wingSide * 0.18;
      ctx.scene.add(wing5);
      const fascia5 = new THREE.Mesh(ctx.boxCache(65.2, 0.65, 0.32), mrtRedTrimMat);
      fascia5.position.set(st.sx, 24.25, line5Z + wingSide * 9.0);
      ctx.scene.add(fascia5);
    });
    ctx.scene.add(ctx.sharedBox(64.5, 0.18, 4.4, glassMat, st.sx, 23.25, line5Z));
    for (let rx = -26; rx <= 26; rx += 13) {
      const rib5 = new THREE.Mesh(
        new THREE.TorusGeometry(8.65, 0.18, 6, 18, Math.PI).rotateY(Math.PI / 2),
        trussSteelMat
      );
      rib5.position.set(st.sx + rx, 22.9, line5Z);
      ctx.scene.add(rib5);
    }

    [line5Z - 7.4, line5Z + 7.4].forEach((wz, wIdx) => {
      ctx.scene.add(ctx.sharedBox(62, 3.4, 0.2, glassMat, st.sx, 19.4, wz));
      ctx.scene.add(ctx.sharedBox(62.2, 0.35, 0.3, mrtRedTrimMat, st.sx, 17.7, wz));
      for (let lx = -26; lx <= 26; lx += 1.6) {
        ctx.scene.add(ctx.sharedBox(0.08, 2.9, 0.38, trussSteelMat, st.sx + lx, 19.4, wz + (wIdx === 0 ? -0.22 : 0.22)));
      }
    });
    [line5Z - 2.2, line5Z + 2.2].forEach((psdZ) => {
      ctx.scene.add(ctx.sharedBox(56, 1.75, 0.12, psdGlassMat, st.sx, 18.42, psdZ));
      ctx.buildingColliders.push({
        minX: st.sx - 28.0,
        maxX: st.sx + 28.0,
        minZ: psdZ - 0.14,
        maxZ: psdZ + 0.14,
        minY: 17.0,
        maxY: 21.5,
        tag: 'metro_psd',
      });
      ctx.scene.add(ctx.sharedBox(56.2, 0.42, 0.28, trussSteelMat, st.sx, 19.48, psdZ));
      ctx.scene.add(ctx.sharedBox(56.2, 0.14, 0.30, mrtRedTrimMat, st.sx, 19.72, psdZ));
      const routeStrip5 = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.38), routeMapMatL5);
      routeStrip5.position.set(st.sx, 19.48, psdZ + (psdZ < line5Z ? -0.16 : 0.16));
      if (psdZ < line5Z) routeStrip5.rotation.y = Math.PI;
      ctx.scene.add(routeStrip5);
      for (let dx = -26; dx <= 26; dx += 4) {
        ctx.scene.add(ctx.sharedBox(0.24, 2.05, 0.22, mastSteelMat, st.sx + dx, 18.55, psdZ));
        ctx.scene.add(ctx.sharedBox(0.18, 0.12, 0.26, ledGreenMat, st.sx + dx + 2, 19.34, psdZ));
      }
      ctx.scene.add(ctx.sharedBox(56, 0.04, 0.26, yellowLineMat, st.sx, 17.56, psdZ + (psdZ < line5Z ? -0.45 : 0.45)));
    });
    [-18, 0, 18].forEach((bx) => {
      ctx.scene.add(ctx.sharedBox(3.6, 0.48, 0.75, trussSteelMat, st.sx + bx, 17.78, line5Z + 5.4));
      ctx.scene.add(ctx.sharedBox(3.6, 0.55, 0.14, mrtRedTrimMat, st.sx + bx, 18.16, line5Z + 5.75));
    });

    const entryZ = line5Z - 10.5;
    const startP = new THREE.Vector3(st.sx - 17.4, 0.04, entryZ);
    const endP = new THREE.Vector3(st.sx - 6, 12.85, entryZ);
    const midP = startP.clone().add(endP).multiplyScalar(0.5);
    const span5 = startP.distanceTo(endP);
    const esc5 = new THREE.Mesh(ctx.boxCache(2.6, 0.42, span5), concourseMat);
    esc5.position.copy(midP).add(new THREE.Vector3(0, -0.32, 0));
    esc5.lookAt(endP.clone().add(new THREE.Vector3(0, -0.32, 0)));
    ctx.scene.add(esc5);

    ctx.scene.add(ctx.sharedBox(1.9, 0.22, 2.95, concourseMat, st.sx - 17.1, 0.11, entryZ));
    for (let es = 0; es < 28; es++) {
      const ft = (es + 0.5) / 28;
      const sx = THREE.MathUtils.lerp(startP.x, endP.x, ft);
      const sy = THREE.MathUtils.lerp(0.10, endP.y - 0.15, ft);
      const sz = THREE.MathUtils.lerp(startP.z, endP.z, ft);
      const tread = new THREE.Mesh(ctx.boxCache(0.76, 0.44, 2.14), afcGateMat);
      tread.position.set(sx, sy, sz);
      ctx.scene.add(tread);
      ctx.scene.add(ctx.sharedBox(0.09, 0.035, 2.10, yellowLineMat, sx - 0.30, sy + 0.23, sz));
    }

    const land5Z = (entryZ + (line5Z - 6.8)) * 0.5;
    ctx.scene.add(ctx.sharedBox(3.8, 0.42, 4.4, concourseMat, st.sx - 5.2, 12.65, land5Z));
    [-1.55, 1.55].forEach((dx) => {
      ctx.scene.add(ctx.sharedBox(0.24, 2.8, 0.28, afcGateMat, st.sx - 5.2 + dx, 14.25, line5Z - 6.85));
    });
    ctx.scene.add(ctx.sharedBox(3.4, 0.45, 0.36, mrtRedTrimMat, st.sx - 5.2, 15.65, line5Z - 6.82));

    const canopy5Start = startP.clone().lerp(endP, 0.14);
    const canopy5Mid = canopy5Start.clone().add(endP).multiplyScalar(0.5);
    const escGlass5 = new THREE.Mesh(ctx.boxCache(3.0, 2.45, canopy5Start.distanceTo(endP)), glassMat);
    escGlass5.position.copy(canopy5Mid).add(new THREE.Vector3(0, 1.5, 0));
    escGlass5.lookAt(endP.clone().add(new THREE.Vector3(0, 1.5, 0)));
    ctx.scene.add(escGlass5);
    const escRoof5 = new THREE.Mesh(ctx.boxCache(3.25, 0.18, canopy5Start.distanceTo(endP)), mrtRedTrimMat);
    escRoof5.position.copy(canopy5Mid).add(new THREE.Vector3(0, 2.75, 0));
    escRoof5.lookAt(endP.clone().add(new THREE.Vector3(0, 2.75, 0)));
    ctx.scene.add(escRoof5);

    ctx.scene.add(ctx.sharedBox(5.2, 0.22, 4.5, concourseMat, st.sx - 19.6, 0.11, entryZ));
    ctx.scene.add(ctx.sharedBox(4.8, 0.03, 2.4, graniteTileMat, st.sx - 19.6, 0.23, entryZ));
    ctx.scene.add(ctx.sharedBox(5.2, 0.55, 4.6, mrtRedTrimMat, st.sx - 19.6, 3.85, entryZ));
    ctx.scene.add(ctx.sharedBox(5.4, 0.18, 4.8, trussSteelMat, st.sx - 19.6, 4.18, entryZ));
    ctx.scene.add(ctx.sharedBox(3.6, 0.1, 3.0, concourseGlowMat, st.sx - 19.6, 3.55, entryZ));
    [-2.05, 2.05].forEach((oz) => {
      ctx.scene.add(ctx.sharedBox(4.8, 0.95, 0.24, graniteTileMat, st.sx - 19.6, 0.6, entryZ + oz));
      ctx.scene.add(ctx.sharedBox(4.4, 2.55, 0.14, glassMat, st.sx - 19.6, 2.35, entryZ + oz));
      [-2.2, 0, 2.2].forEach((cx) => {
        ctx.scene.add(ctx.sharedBox(0.26, 3.65, 0.26, mastSteelMat, st.sx - 19.6 + cx, 2.0, entryZ + oz));
      });
      ctx.buildingColliders.push({
        minX: st.sx - 22.1,
        maxX: st.sx - 17.1,
        minZ: entryZ + oz - 0.18,
        maxZ: entryZ + oz + 0.18,
        minY: 0,
        maxY: 4.3,
        tag: 'metro_kiosk_wall',
      });
    });
    [-1.08, 1.08].forEach((tz) => {
      ctx.scene.add(ctx.sharedBox(1.48, 0.98, 0.28, trussSteelMat, st.sx - 19.6, 0.71, entryZ + tz));
      ctx.scene.add(ctx.sharedBox(1.50, 0.16, 0.30, mrtRedTrimMat, st.sx - 19.6, 1.15, entryZ + tz));
      ctx.scene.add(ctx.sharedBox(0.24, 0.12, 0.24, ledGreenMat, st.sx - 20.15, 1.25, entryZ + tz));
      ctx.buildingColliders.push({
        minX: st.sx - 20.36,
        maxX: st.sx - 18.84,
        minZ: entryZ + tz - 0.16,
        maxZ: entryZ + tz + 0.16,
        minY: 0,
        maxY: 1.5,
        tag: 'metro_turnstile',
      });
    });

    ctx.metroEscalators.push({
      x1: startP.x,
      z1: startP.z,
      y1: 0.22,
      x2: endP.x,
      z2: endP.z,
      y2: endP.y + 0.08,
      halfWidth: 1.45,
      kioskX: st.sx - 19.6,
      kioskZ: entryZ,
      kioskHalfX: 2.55,
      kioskHalfZ: 2.15,
      landMinX: st.sx - 7.1,
      landMaxX: st.sx - 3.3,
      landMinZ: entryZ - 1.2,
      landMaxZ: line5Z - 6.6,
      landY: 12.86,
    });

    const signTex5 = createMetroStationSignTexture(
      st.nameBn,
      st.nameEn,
      'MRT LINE-5 • ঢাকা মেট্রো',
      '#be123c',
      'NORTHERN ROUTE  •  PLATFORM 1 & 2'
    );
    const signMat5 = new THREE.MeshBasicMaterial({ map: signTex5, side: THREE.DoubleSide });
    [-32.2, 32.2].forEach((dx) => {
      const sb5 = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 3.0), signMat5);
      sb5.rotation.y = Math.PI / 2;
      sb5.position.set(st.sx + dx, 21.8, line5Z);
      ctx.scene.add(sb5);
    });
    [line5Z - 8.1, line5Z + 8.1].forEach((sz5, sIdx) => {
      const sideSignL5 = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 2.9), signMat5);
      sideSignL5.rotation.y = sIdx === 0 ? Math.PI : 0;
      sideSignL5.position.set(st.sx, 18.6, sz5);
      ctx.scene.add(sideSignL5);
    });
  });

  const metroPortalRingGeo = new THREE.RingGeometry(1.7, 2.3, 28);
  METRO_STATIONS.forEach((st) => {
    const accentHex = st.line === 'L5' ? '#e11d48' : '#059669';
    const ringMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });

    const kx = st.kioskX ?? st.x;
    const kz = st.kioskZ ?? st.z;

    const kioskRing = new THREE.Mesh(metroPortalRingGeo, ringMat);
    kioskRing.rotation.x = -Math.PI / 2;
    kioskRing.position.set(kx, 0.098, kz);
    ctx.scene.add(kioskRing);
    ctx.metroPortalRings.push(kioskRing);

    if (Math.hypot(kx - st.x, kz - st.z) > 6 && st.id !== 'mrt_mirpur10') {
      const ring = new THREE.Mesh(metroPortalRingGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(st.x, 0.098, st.z);
      ctx.scene.add(ring);
      ctx.metroPortalRings.push(ring);
    }

    const boothX = st.line === 'L6' ? kx - 2.9 : kx + 3.2;
    const boothZ = st.line === 'L6' ? kz : kz - 2.6;

    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 4.6, 0.92),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.55, roughness: 0.28 })
    );
    pylon.position.set(boothX, 2.3, boothZ);
    ctx.scene.add(pylon);

    const canopyCap = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.42, 2.7),
      new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: new THREE.Color(accentHex),
        emissiveIntensity: 0.5,
        roughness: 0.25,
      })
    );
    canopyCap.position.set(boothX, 4.75, boothZ);
    ctx.scene.add(canopyCap);

    const mDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.22, 18).rotateZ(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#dc2626' })
    );
    mDisc.position.set(boothX, 5.45, boothZ);
    if (st.line === 'L5') mDisc.rotation.y = Math.PI / 2;
    ctx.scene.add(mDisc);

    const signTex = createMetroStationSignTexture(
      st.nameBn,
      st.nameEn,
      st.line === 'L5' ? 'MRT LINE-5' : 'MRT LINE-6',
      accentHex,
      `PRESS [E] OR [F] TO BOARD • FARE ৳${st.fare}`
    );
    const portalSign = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.15, 0.22),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    portalSign.position.set(boothX, 3.55, boothZ + (st.line === 'L5' ? 0.6 : 0));
    if (st.line === 'L6') portalSign.rotation.y = Math.PI / 2;
    ctx.scene.add(portalSign);

    ctx.circleColliders.push({ x: boothX, z: boothZ, radius: 0.72, tag: 'metro_ticket_pylon' });
  });

  // =========================================================================
  // SECTION D: REALISTIC JAPANESE KAWASAKI 6-COACH METRO ROLLING STOCK
  // =========================================================================
  const createRealistic6CoachTrain = (lineType: 'line6' | 'line5') => {
    const trainGroup = new THREE.Group();

    const stainlessMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.82,
      roughness: 0.24,
    });
    const primaryStripeMat = new THREE.MeshBasicMaterial({
      color: lineType === 'line6' ? '#10b981' : '#e11d48',
    });
    const speedRibbonMat = new THREE.MeshBasicMaterial({
      color: lineType === 'line6' ? '#dc2626' : '#f59e0b',
    });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fef08a',
      emissiveIntensity: 0.45,
      roughness: 0.1,
    });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      metalness: 0.9,
      roughness: 0.1,
    });
    const bogieMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.8,
      roughness: 0.4,
    });
    const pantographMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      metalness: 0.9,
      roughness: 0.2,
    });

    for (let c = 0; c < 6; c++) {
      const cz = (c - 2.5) * 12.0;
      const isLeadCar = c === 0;
      const isTailCar = c === 5;
      const hasPantograph = c === 1 || c === 4;

      const coachGroup = new THREE.Group();
      coachGroup.position.set(0, 0, cz);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.9, 11.2), stainlessMat);
      body.position.set(0, 1.62, 0);
      body.castShadow = true;
      coachGroup.add(body);

      if (isLeadCar || isTailCar) {
        const noseZ = isLeadCar ? -6.0 : 6.0;
        const nose = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.6, 1.4), stainlessMat);
        nose.position.set(0, 1.5, noseZ);
        coachGroup.add(nose);

        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), darkGlassMat);
        windshield.position.set(0, 1.85, isLeadCar ? -6.72 : 6.72);
        if (isLeadCar) windshield.rotation.x = -0.32;
        else {
          windshield.rotation.y = Math.PI;
          windshield.rotation.x = -0.32;
        }
        coachGroup.add(windshield);

        const destSign = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 0.32),
          new THREE.MeshBasicMaterial({ color: '#f59e0b' })
        );
        destSign.position.set(0, 2.65, isLeadCar ? -6.72 : 6.72);
        if (isTailCar) destSign.rotation.y = Math.PI;
        coachGroup.add(destSign);

        [-0.85, 0.85].forEach((hx) => {
          const lightMesh = new THREE.Mesh(
            new THREE.CircleGeometry(0.14, 12),
            new THREE.MeshBasicMaterial({ color: isLeadCar ? '#fef08a' : '#ef4444' })
          );
          lightMesh.position.set(hx, 1.05, isLeadCar ? -6.72 : 6.72);
          if (isTailCar) lightMesh.rotation.y = Math.PI;
          coachGroup.add(lightMesh);
        });
      }

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.42, 11.24), primaryStripeMat);
      stripe.position.set(0, 1.48, 0);
      coachGroup.add(stripe);

      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(2.98, 0.12, 11.26), speedRibbonMat);
      ribbon.position.set(0, 1.22, 0);
      coachGroup.add(ribbon);

      const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.94, 0.85, 9.8), windowGlassMat);
      winBand.position.set(0, 2.12, 0);
      coachGroup.add(winBand);

      [-3.6, -1.2, 1.2, 3.6].forEach((dz) => {
        [-1.48, 1.48].forEach((dx) => {
          const doorInd = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: '#facc15' }));
          doorInd.position.set(dx, 2.68, dz);
          doorInd.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
          coachGroup.add(doorInd);
        });
      });

      [-2.8, 2.8].forEach((hz) => {
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 2.6), stainlessMat);
        hvac.position.set(0, 3.25, hz);
        coachGroup.add(hvac);
      });

      if (hasPantograph) {
        const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.8), pantographMat);
        pantoBase.position.set(0, 3.16, 0);
        coachGroup.add(pantoBase);

        const armLower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), pantographMat);
        armLower.position.set(0, 3.72, -0.32);
        armLower.rotation.x = 0.55;
        coachGroup.add(armLower);

        const armUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), pantographMat);
        armUpper.position.set(0, 4.35, 0.32);
        armUpper.rotation.x = -0.55;
        coachGroup.add(armUpper);

        const collectorShoe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.35), stainlessMat);
        collectorShoe.position.set(0, 4.88, 0);
        coachGroup.add(collectorShoe);
      }

      [-3.6, 3.6].forEach((bz) => {
        const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.6), bogieMat);
        bogieFrame.position.set(0, 0.32, bz);
        coachGroup.add(bogieFrame);

        [-0.8, 0.8].forEach((wz) => {
          [-1.15, 1.15].forEach((wx) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.16, 14), bogieMat);
            wheel.position.set(wx, 0.32, bz + wz);
            wheel.rotation.z = Math.PI / 2;
            coachGroup.add(wheel);
          });
        });
      });

      if (c < 5) {
        const gangway = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.3, 0.82), new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 }));
        gangway.position.set(0, 1.48, 6.0);
        coachGroup.add(gangway);
      }

      trainGroup.add(coachGroup);
    }

    return trainGroup;
  };

  const metroTrainGroup = createRealistic6CoachTrain('line6');
  metroTrainGroup.position.set(-13.3, 13.2, -25);
  ctx.scene.add(metroTrainGroup);

  const metroTrainGroup2 = createRealistic6CoachTrain('line6');
  metroTrainGroup2.position.set(-11.1, 13.2, -550);
  metroTrainGroup2.rotation.y = Math.PI;
  ctx.scene.add(metroTrainGroup2);

  const metroTrainLine5East = createRealistic6CoachTrain('line5');
  metroTrainLine5East.position.set(40, 17.48, -199.2);
  metroTrainLine5East.rotation.y = -Math.PI / 2;
  ctx.scene.add(metroTrainLine5East);

  const metroTrainLine5West = createRealistic6CoachTrain('line5');
  metroTrainLine5West.position.set(280, 17.48, -196.8);
  metroTrainLine5West.rotation.y = Math.PI / 2;
  ctx.scene.add(metroTrainLine5West);

  const playerMetroTrainL6 = createRealistic6CoachTrain('line6');
  playerMetroTrainL6.visible = false;
  ctx.scene.add(playerMetroTrainL6);

  const playerMetroTrainL5 = createRealistic6CoachTrain('line5');
  playerMetroTrainL5.visible = false;
  ctx.scene.add(playerMetroTrainL5);

  return {
    metroTrainGroup,
    metroTrainGroup2,
    metroTrainLine5East,
    metroTrainLine5West,
    playerMetroTrainL6,
    playerMetroTrainL5,
  };
}
