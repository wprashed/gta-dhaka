import * as THREE from 'three';
import {
  createFlyoverGantryTexture,
  createFobBillboardTexture,
} from '../dhakaModels';
import { loadRealTexture } from '../dhakaTextures';
import type { SceneBuilderContext } from './buildTypes';

export interface BurigangaBridgeContext extends SceneBuilderContext {
  nsRoads: ReadonlyArray<{ x: number; width: number; zMin: number; zMax: number }>;
}

export interface HatirjheelBridgeContext extends SceneBuilderContext {
  hatirjheelLights: THREE.PointLight[];
}

/**
 * Builds the 1st Buriganga Bridge (Babubazar) arch crossing, 11 arterial bridges,
 * piers, approach ramps, portals, and streetlamps.
 */
export function buildBurigangaRiverBridgesInScene(ctx: BurigangaBridgeContext) {
  const bridgeConcreteMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.72,
  });
  const bridgeAsphaltMat = new THREE.MeshStandardMaterial({
    map: loadRealTexture('/textures/dhaka_asphalt.jpg', 3, 18, true),
    color: '#334155',
    roughness: 0.88,
  });
  const whiteLaneMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const pierMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const yellowStripeMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    emissive: new THREE.Color('#facc15'),
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });
  const portalFrameMat = new THREE.MeshStandardMaterial({
    color: '#047857',
    metalness: 0.55,
    roughness: 0.35,
  });
  const lampLightMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: new THREE.Color('#fef08a'),
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  ctx.streetLampStdMats.push(lampLightMat);

  const bridgeX = 0;
  const bridgeW = 22;
  const zStart = 285;
  const zEnd = 460;
  const bridgeLen = zEnd - zStart;
  const stainlessMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.85,
    roughness: 0.2,
  });
  const bridgeDeckElev = (z: number) => {
    const t = Math.max(0, Math.min(1, (z - zStart) / bridgeLen));
    return 0.08 + 2.75 * Math.sin(t * Math.PI);
  };

  const numBridgeSegs = 20;
  const segLen = bridgeLen / numBridgeSegs;
  for (let i = 0; i < numBridgeSegs; i++) {
    const segZ1 = zStart + i * segLen;
    const segZ2 = zStart + (i + 1) * segLen;
    const midZ = (segZ1 + segZ2) / 2;
    const e1 = bridgeDeckElev(segZ1);
    const e2 = bridgeDeckElev(segZ2);
    const segElev = (e1 + e2) * 0.5;
    const chordLen = Math.hypot(segLen, e2 - e1) + 0.14;
    const pitch = -Math.atan2(e2 - e1, segLen);

    const segGroup = new THREE.Group();
    segGroup.position.set(bridgeX, segElev, midZ);
    segGroup.rotation.x = pitch;

    const slab = ctx.sharedBox(bridgeW, 0.72, chordLen, bridgeConcreteMat, 0, -0.44, 0);
    const boxBelly = ctx.sharedBox(bridgeW - 4.4, 0.65, chordLen, pierMat, 0, -1.05, 0);
    slab.receiveShadow = true;
    const roadTop = ctx.sharedBox(bridgeW - 2.6, 0.14, chordLen, bridgeAsphaltMat, 0, -0.05, 0);
    roadTop.receiveShadow = true;
    const centerLineW = ctx.sharedBox(0.16, 0.02, chordLen, yellowStripeMat, -0.16, 0.03, 0);
    const centerLineE = ctx.sharedBox(0.16, 0.02, chordLen, yellowStripeMat, 0.16, 0.03, 0);
    const laneDashL = ctx.sharedBox(0.14, 0.02, segLen * 0.55, whiteLaneMat, -4.6, 0.03, 0);
    const laneDashR = ctx.sharedBox(0.14, 0.02, segLen * 0.55, whiteLaneMat, 4.6, 0.03, 0);
    const walkL = ctx.sharedBox(1.2, 0.24, chordLen, bridgeConcreteMat, -bridgeW / 2 + 0.95, 0.05, 0);
    const walkR = ctx.sharedBox(1.2, 0.24, chordLen, bridgeConcreteMat, bridgeW / 2 - 0.95, 0.05, 0);
    segGroup.add(slab, boxBelly, roadTop, centerLineW, centerLineE, laneDashL, laneDashR, walkL, walkR);

    [-bridgeW / 2 + 0.3, bridgeW / 2 - 0.3].forEach((bx) => {
      const jerseyBase = ctx.sharedBox(0.46, 0.68, chordLen, bridgeConcreteMat, bx, 0.34, 0);
      const hazardStripe = ctx.sharedBox(0.48, 0.16, chordLen, yellowStripeMat, bx, 0.18, 0);
      const topRail = ctx.sharedBox(0.1, 0.08, chordLen, stainlessMat, bx, 1.12, 0);
      const midRail = ctx.sharedBox(0.08, 0.06, chordLen, stainlessMat, bx, 0.88, 0);
      segGroup.add(jerseyBase, hazardStripe, topRail, midRail);
    });

    ctx.scene.add(segGroup);
  }

  [zStart, zEnd].forEach((az) => {
    const abut = ctx.sharedBox(bridgeW + 2.4, 2.2, 4.5, pierMat, bridgeX, 0.2, az);
    ctx.scene.add(abut);
  });

  ctx.buildingColliders.push({
    minX: bridgeX - bridgeW / 2 - 0.2,
    maxX: bridgeX - bridgeW / 2 + 0.55,
    minZ: zStart - 5,
    maxZ: zEnd + 5,
    minY: 0.1,
    maxY: 4.5,
    tag: 'buriganga_bridge_guardrail',
  });
  ctx.buildingColliders.push({
    minX: bridgeX + bridgeW / 2 - 0.55,
    maxX: bridgeX + bridgeW / 2 + 0.2,
    minZ: zStart - 5,
    maxZ: zEnd + 5,
    minY: 0.1,
    maxY: 4.5,
    tag: 'buriganga_bridge_guardrail',
  });

  for (let pz = 315; pz <= 435; pz += 38) {
    const pierElev = bridgeDeckElev(pz);
    const pierH = pierElev + 2.4;

    [-bridgeW / 3, bridgeW / 3].forEach((px) => {
      const pier = new THREE.Mesh(ctx.cylCache(1.35, 1.65, pierH, 14), pierMat);
      pier.position.set(bridgeX + px, pierElev - 1.15 - pierH / 2, pz);
      pier.castShadow = true;
      const cutwater = new THREE.Mesh(ctx.cylCache(2.05, 2.35, 1.4, 8), bridgeConcreteMat);
      cutwater.position.set(bridgeX + px, 0.25, pz);
      ctx.scene.add(pier, cutwater);

      ctx.circleColliders.push({
        x: bridgeX + px,
        z: pz,
        radius: 2.25,
        tag: 'bridge_pier',
      });
    });

    const crossBeam = ctx.sharedBox(bridgeW + 1.4, 1.35, 3.4, bridgeConcreteMat, bridgeX, pierElev - 1.35, pz);
    ctx.scene.add(crossBeam);

    [-bridgeW / 2 + 0.3, bridgeW / 2 - 0.3].forEach((lx) => {
      const pole = new THREE.Mesh(ctx.cylCache(0.11, 0.16, 6.4, 10), stainlessMat);
      pole.position.set(bridgeX + lx, pierElev + 3.2, pz);
      const armDir = lx > 0 ? -1 : 1;
      const arm = new THREE.Mesh(ctx.boxCache(1.6, 0.1, 0.12), stainlessMat);
      arm.position.set(bridgeX + lx + armDir * 0.75, pierElev + 6.35, pz);
      arm.rotation.z = armDir * 0.16;
      const lum = new THREE.Mesh(ctx.boxCache(0.75, 0.14, 0.36), lampLightMat);
      lum.position.set(bridgeX + lx + armDir * 1.4, pierElev + 6.42, pz);
      ctx.scene.add(pole, arm, lum);
    });
  }

  [zStart + 2, zEnd - 2].forEach((az, aIdx) => {
    const archGroup = new THREE.Group();
    archGroup.position.set(bridgeX, 0, az);

    [-bridgeW / 2 - 0.75, bridgeW / 2 + 0.75].forEach((px) => {
      const pylonBase = new THREE.Mesh(ctx.boxCache(1.6, 2.2, 1.8), pierMat);
      pylonBase.position.set(px, 1.1, 0);
      const pylonShaft = new THREE.Mesh(ctx.boxCache(1.15, 8.6, 1.25), portalFrameMat);
      pylonShaft.position.set(px, 6.4, 0);
      const pylonCrown = new THREE.Mesh(ctx.cylCache(0.25, 0.85, 1.4, 8), yellowStripeMat);
      pylonCrown.position.set(px, 11.4, 0);
      archGroup.add(pylonBase, pylonShaft, pylonCrown);
    });

    const lintel = new THREE.Mesh(ctx.boxCache(bridgeW + 2.8, 1.35, 1.05), portalFrameMat);
    lintel.position.set(0, 9.4, 0);
    const lintelTrim = new THREE.Mesh(ctx.boxCache(bridgeW + 3.0, 0.22, 1.15), yellowStripeMat);
    lintelTrim.position.set(0, 10.1, 0);
    archGroup.add(lintel, lintelTrim);

    const signTex = createFlyoverGantryTexture(
      '১ম বুড়িগঙ্গা সেতু (চীন-বাংলাদেশ মৈত্রী সেতু)',
      '1ST BURIGANGA BRIDGE (CHINA-BANGLADESH FRIENDSHIP BRIDGE)',
      aIdx === 0 ? 'কেরানীগঞ্জ ও মাওয়া এক্সপ্রেসওয়ে সংযোগ' : 'সদরঘাট, চকবাজার ও গুলিস্তান সংযোগ',
      aIdx === 0 ? 'KERANIGANJ & MAWA EXPRESSWAY LINK' : 'SADARGHAT, CHAWKBAZAR & GULISTAN LINK'
    );
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(bridgeW * 0.88, 2.4, 0.16),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 })
    );
    signBoard.position.set(0, 7.6, 0);
    archGroup.add(signBoard);

    ctx.scene.add(archGroup);
  });

  const otherBridgeXs = [-950, -780, -580, -480, -380, -170, 220, 440, 640, 840, 950];
  const rampLen2 = 20;
  const rampAngle = Math.atan2(0.92, rampLen2);

  otherBridgeXs.forEach((ox) => {
    const oRoad = ctx.nsRoads.find((r) => r.x === ox);
    const oW = oRoad ? oRoad.width : 18;

    const northRamp = new THREE.Mesh(ctx.boxCache(oW - 1.8, 0.8, rampLen2 + 0.2), bridgeAsphaltMat);
    northRamp.position.set(ox, 0.54, 275);
    northRamp.rotation.x = -rampAngle;
    northRamp.receiveShadow = true;
    ctx.scene.add(northRamp);

    [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
      const rail = new THREE.Mesh(ctx.boxCache(0.42, 0.72, rampLen2 + 0.2), bridgeConcreteMat);
      rail.position.set(ox + gx, 1.15, 275);
      rail.rotation.x = -rampAngle;
      const topTube = new THREE.Mesh(ctx.boxCache(0.1, 0.08, rampLen2 + 0.2), stainlessMat);
      topTube.position.set(ox + gx, 1.65, 275);
      topTube.rotation.x = -rampAngle;
      ctx.scene.add(rail, topTube);
    });

    const oDeck = ctx.sharedBox(oW, 0.74, bridgeLen, bridgeConcreteMat, ox, 0.51, (zStart + zEnd) / 2);
    oDeck.receiveShadow = true;
    const oAsphalt = ctx.sharedBox(oW - 2.4, 0.14, bridgeLen, bridgeAsphaltMat, ox, 0.94, (zStart + zEnd) / 2);
    oAsphalt.receiveShadow = true;
    const oWalkL = ctx.sharedBox(1.0, 0.2, bridgeLen, bridgeConcreteMat, ox - oW / 2 + 0.85, 1.01, (zStart + zEnd) / 2);
    const oWalkR = ctx.sharedBox(1.0, 0.2, bridgeLen, bridgeConcreteMat, ox + oW / 2 - 0.85, 1.01, (zStart + zEnd) / 2);
    const oCenterN = ctx.sharedBox(0.16, 0.02, bridgeLen, yellowStripeMat, ox - 0.15, 1.02, (zStart + zEnd) / 2);
    const oCenterS = ctx.sharedBox(0.16, 0.02, bridgeLen, yellowStripeMat, ox + 0.15, 1.02, (zStart + zEnd) / 2);
    ctx.scene.add(oDeck, oAsphalt, oWalkL, oWalkR, oCenterN, oCenterS);

    [zStart, zEnd].forEach((az) => {
      ctx.scene.add(ctx.sharedBox(oW + 1.8, 1.8, 3.6, pierMat, ox, 0.1, az));
    });

    [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
      const parapet = ctx.sharedBox(0.42, 0.72, bridgeLen, bridgeConcreteMat, ox + gx, 1.24, (zStart + zEnd) / 2);
      const topTube = ctx.sharedBox(0.1, 0.08, bridgeLen, stainlessMat, ox + gx, 1.72, (zStart + zEnd) / 2);
      ctx.scene.add(parapet, topTube);

      for (let rz = zStart + 10; rz <= zEnd - 10; rz += 20) {
        const stud = new THREE.Mesh(ctx.boxCache(0.44, 0.18, 0.85), yellowStripeMat);
        stud.position.set(ox + gx, 1.15, rz);
        ctx.scene.add(stud);
      }
    });

    const southRamp = new THREE.Mesh(ctx.boxCache(oW - 1.8, 0.8, rampLen2 + 0.2), bridgeAsphaltMat);
    southRamp.position.set(ox, 0.54, 470);
    southRamp.rotation.x = rampAngle;
    southRamp.receiveShadow = true;
    ctx.scene.add(southRamp);

    [-oW / 2 + 0.25, oW / 2 - 0.25].forEach((gx) => {
      const rail = new THREE.Mesh(ctx.boxCache(0.42, 0.72, rampLen2 + 0.2), bridgeConcreteMat);
      rail.position.set(ox + gx, 1.15, 470);
      rail.rotation.x = rampAngle;
      const topTube = new THREE.Mesh(ctx.boxCache(0.1, 0.08, rampLen2 + 0.2), stainlessMat);
      topTube.position.set(ox + gx, 1.65, 470);
      topTube.rotation.x = rampAngle;
      ctx.scene.add(rail, topTube);
    });

    ctx.buildingColliders.push({
      minX: ox - oW / 2 - 0.2,
      maxX: ox - oW / 2 + 0.55,
      minZ: 265,
      maxZ: 480,
      minY: 0.1,
      maxY: 3.5,
      tag: 'buriganga_bridge_guardrail',
    });
    ctx.buildingColliders.push({
      minX: ox + oW / 2 - 0.55,
      maxX: ox + oW / 2 + 0.2,
      minZ: 265,
      maxZ: 480,
      minY: 0.1,
      maxY: 3.5,
      tag: 'buriganga_bridge_guardrail',
    });

    for (let pz = 320; pz <= 430; pz += 36) {
      [-oW * 0.3, oW * 0.3].forEach((px) => {
        const pier = new THREE.Mesh(ctx.cylCache(0.95, 1.15, 2.8, 12), pierMat);
        pier.position.set(ox + px, -0.85, pz);
        pier.castShadow = true;
        const cutwater = new THREE.Mesh(ctx.cylCache(1.45, 1.65, 1.0, 8), bridgeConcreteMat);
        cutwater.position.set(ox + px, 0.05, pz);
        ctx.scene.add(pier, cutwater);
        ctx.circleColliders.push({ x: ox + px, z: pz, radius: 1.55, tag: 'bridge_pier' });
      });
      ctx.scene.add(ctx.sharedBox(oW + 0.8, 0.65, 2.2, bridgeConcreteMat, ox, -0.05, pz));

      [-oW / 2 + 0.3, oW / 2 - 0.3].forEach((lx) => {
        const armDir = lx > 0 ? -1 : 1;
        const pole = new THREE.Mesh(ctx.cylCache(0.1, 0.13, 5.4, 8), stainlessMat);
        pole.position.set(ox + lx, 3.7, pz);
        const lum = new THREE.Mesh(ctx.boxCache(0.65, 0.12, 0.28), lampLightMat);
        lum.position.set(ox + lx + armDir * 0.45, 6.4, pz);
        ctx.scene.add(pole, lum);
      });
    }
  });
}

/**
 * Builds the Hatirjheel tied-arch bridge deck, hangers, arches, lighting, and guardrails.
 */
export function buildHatirjheelBridgeInScene(ctx: HatirjheelBridgeContext) {
  const archGroup = new THREE.Group();
  archGroup.position.set(220, 0, -5);

  const asphaltTex = loadRealTexture('/textures/dhaka_asphalt.jpg', 2, 12, true);
  const steelArchMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    metalness: 0.72,
    roughness: 0.22,
  });
  const concreteDeckMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.68,
  });
  const darkPierMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.78,
  });
  const chromeRailMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.9,
    roughness: 0.16,
  });
  const hangerCableMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.92,
    roughness: 0.14,
  });
  const glassRailMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.42,
    roughness: 0.1,
  });

  const boxGirder = ctx.sharedBox(20.6, 0.75, 95, concreteDeckMat, 0, 0.12, 0);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(17.4, 0.16, 95),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.75 })
  );
  deck.position.set(0, 0.48, 0);
  deck.receiveShadow = true;
  const walkW = ctx.sharedBox(1.4, 0.24, 95, concreteDeckMat, -9.4, 0.56, 0);
  const walkE = ctx.sharedBox(1.4, 0.24, 95, concreteDeckMat, 9.4, 0.56, 0);
  const centerLineL = ctx.sharedBox(0.14, 0.02, 94, new THREE.MeshBasicMaterial({ color: '#facc15' }), -0.14, 0.57, 0);
  const centerLineR = ctx.sharedBox(0.14, 0.02, 94, new THREE.MeshBasicMaterial({ color: '#facc15' }), 0.14, 0.57, 0);
  archGroup.add(boxGirder, deck, walkW, walkE, centerLineL, centerLineR);

  for (let dz = -42; dz <= 42; dz += 7) {
    archGroup.add(ctx.sharedBox(0.12, 0.02, 3.2, new THREE.MeshBasicMaterial({ color: '#f8fafc' }), -4.3, 0.57, dz));
    archGroup.add(ctx.sharedBox(0.12, 0.02, 3.2, new THREE.MeshBasicMaterial({ color: '#f8fafc' }), 4.3, 0.57, dz));
  }

  [-46, 46].forEach((az) => {
    archGroup.add(ctx.sharedBox(22.8, 2.0, 4.2, darkPierMat, 0, 0.1, az));
  });
  [-10.0, 10.0].forEach((rx) => {
    archGroup.add(ctx.sharedBox(0.14, 0.82, 95, glassRailMat, rx, 1.05, 0));
    archGroup.add(ctx.sharedBox(0.18, 0.09, 95, chromeRailMat, rx, 1.48, 0));
    archGroup.add(ctx.sharedBox(0.28, 0.35, 95, concreteDeckMat, rx, 0.72, 0));
  });

  const archHeightAtZ = (lz: number) => 0.55 + 16.8 * Math.max(0, 1 - (lz / 44) * (lz / 44));
  const archSteps = 22;
  const neonColors = ['#ec4899', '#06b6d4', '#a855f7', '#38bdf8'];
  [-9.8, 9.8].forEach((sideX, sIdx) => {
    const tiltDir = sideX > 0 ? -1 : 1;
    for (let i = 0; i < archSteps; i++) {
      const z1 = -44 + (i / archSteps) * 88;
      const z2 = -44 + ((i + 1) / archSteps) * 88;
      const y1 = archHeightAtZ(z1);
      const y2 = archHeightAtZ(z2);
      const x1 = sideX + tiltDir * ((y1 - 0.55) * 0.09);
      const x2 = sideX + tiltDir * ((y2 - 0.55) * 0.09);

      const p1 = new THREE.Vector3(x1, y1, z1);
      const p2 = new THREE.Vector3(x2, y2, z2);
      const chordVec = p2.clone().sub(p1);
      const segL = chordVec.length() + 0.12;
      const ribSeg = new THREE.Mesh(ctx.boxCache(0.75, segL, 0.85), steelArchMat);
      ribSeg.position.copy(p1).add(p2).multiplyScalar(0.5);
      ribSeg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), chordVec.normalize());
      ribSeg.castShadow = true;
      archGroup.add(ribSeg);

      if (i > 0 && i % 2 === 0) {
        const col = neonColors[(i / 2 + sIdx) % neonColors.length];
        const collar = new THREE.Mesh(
          ctx.boxCache(0.92, 0.24, 0.92),
          new THREE.MeshBasicMaterial({ color: col })
        );
        collar.position.copy(p1);
        archGroup.add(collar);

        const deckAnchor = new THREE.Vector3(sideX, 0.65, z1);
        const hangerVec = p1.clone().sub(deckAnchor);
        const hLen = hangerVec.length();
        if (hLen > 0.8) {
          const cable = new THREE.Mesh(ctx.cylCache(0.055, 0.055, hLen, 8), hangerCableMat);
          cable.position.copy(deckAnchor).add(p1).multiplyScalar(0.5);
          cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hangerVec.normalize());
          archGroup.add(cable);

          const socket = new THREE.Mesh(ctx.cylCache(0.14, 0.18, 0.38, 8), darkPierMat);
          socket.position.set(sideX, 0.8, z1);
          archGroup.add(socket);
        }
      }
    }
  });

  [-20, -10, 0, 10, 20].forEach((cz) => {
    const yCross = archHeightAtZ(cz);
    const xSpan = (9.8 - (yCross - 0.55) * 0.09) * 2;
    const strut = new THREE.Mesh(ctx.cylCache(0.24, 0.24, xSpan, 10).rotateZ(Math.PI / 2), steelArchMat);
    strut.position.set(0, yCross, cz);
    archGroup.add(strut);
    const glowBand = new THREE.Mesh(
      ctx.boxCache(xSpan * 0.55, 0.14, 0.34),
      new THREE.MeshBasicMaterial({ color: cz === 0 ? '#ec4899' : '#06b6d4' })
    );
    glowBand.position.set(0, yCross - 0.18, cz);
    archGroup.add(glowBand);
  });

  const bridgeLight = new THREE.PointLight('#ec4899', 2.4, 75);
  bridgeLight.position.set(0, 14, 0);
  archGroup.add(bridgeLight);
  ctx.hatirjheelLights.push(bridgeLight);

  ctx.scene.add(archGroup);

  ctx.buildingColliders.push({
    minX: 209.2,
    maxX: 210.4,
    minZ: -52.5,
    maxZ: 42.5,
    minY: 0.0,
    maxY: 3.5,
    tag: 'bridge_rail_west',
  });
  ctx.buildingColliders.push({
    minX: 229.6,
    maxX: 230.8,
    minZ: -52.5,
    maxZ: 42.5,
    minY: 0.0,
    maxY: 3.5,
    tag: 'bridge_rail_east',
  });
}

/**
 * Builds the covered pedestrian foot over bridges with staircases and commercial billboards.
 */
export function buildDhakaFootOverBridgesInScene(ctx: SceneBuilderContext) {
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.68,
    roughness: 0.32,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.72,
    roughness: 0.36,
  });
  const chromeRailMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.88,
    roughness: 0.16,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#0369a1',
    roughness: 0.42,
    metalness: 0.25,
  });
  const stairConcreteMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.88,
  });
  const tactileYellowMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    roughness: 0.45,
  });
  const ceilingGlowMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });

  const createFob = (
    bridgeX: number,
    bridgeZ: number,
    spanWidth: number,
    northAdBrand: string,
    northAdBn: string,
    northAdEn: string,
    northAdColor: string,
    southAdBrand: string,
    southAdBn: string,
    southAdEn: string,
    southAdColor: string
  ) => {
    const fobGroup = new THREE.Group();
    fobGroup.position.set(bridgeX, 0, bridgeZ);

    const deckY = 6.2;
    const walkwayW = 3.4;

    const floor = ctx.sharedBox(spanWidth + 3.2, 0.4, walkwayW, stairConcreteMat, 0, deckY, 0);
    floor.receiveShadow = true;
    const tactileLine = ctx.sharedBox(spanWidth + 2.4, 0.04, 0.24, tactileYellowMat, 0, deckY + 0.21, 0);
    fobGroup.add(floor, tactileLine);

    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(walkwayW / 1.65, walkwayW / 1.65, spanWidth + 3.4, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2),
      roofMat
    );
    roof.position.set(0, deckY + 2.75, 0);
    roof.castShadow = true;
    fobGroup.add(roof);

    const ledStrip = ctx.sharedBox(spanWidth - 1.0, 0.08, 0.35, ceilingGlowMat, 0, deckY + 2.65, 0);
    fobGroup.add(ledStrip);

    for (let rx = -spanWidth / 2; rx <= spanWidth / 2 + 0.1; rx += 2.6) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(walkwayW / 1.62, 0.065, 6, 14, Math.PI),
        chromeRailMat
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.set(rx, deckY + 2.75, 0);
      fobGroup.add(rib);
    }

    [-walkwayW / 2, walkwayW / 2].forEach((trussZ) => {
      const bottomChord = ctx.sharedBox(spanWidth + 3.2, 0.16, 0.16, steelMat, 0, deckY + 0.22, trussZ);
      const midRail = ctx.sharedBox(spanWidth + 3.2, 0.07, 0.07, chromeRailMat, 0, deckY + 1.08, trussZ);
      const topChord = ctx.sharedBox(spanWidth + 3.2, 0.16, 0.16, steelMat, 0, deckY + 2.72, trussZ);
      fobGroup.add(bottomChord, midRail, topChord);

      const stepX = 2.6;
      for (let x = -spanWidth / 2; x <= spanWidth / 2; x += stepX) {
        const post = new THREE.Mesh(ctx.boxCache(0.14, 2.65, 0.14), steelMat);
        post.position.set(x, deckY + 1.46, trussZ);
        fobGroup.add(post);

        if (x + stepX <= spanWidth / 2 + 0.05) {
          const diagLen = Math.hypot(stepX, 2.5);
          const diag1 = new THREE.Mesh(ctx.boxCache(0.08, diagLen, 0.08), steelMat);
          diag1.position.set(x + stepX * 0.5, deckY + 1.46, trussZ);
          diag1.rotation.z = Math.atan2(stepX, 2.5);
          const diag2 = new THREE.Mesh(ctx.boxCache(0.08, diagLen, 0.08), steelMat);
          diag2.position.set(x + stepX * 0.5, deckY + 1.46, trussZ);
          diag2.rotation.z = -Math.atan2(stepX, 2.5);
          fobGroup.add(diag1, diag2);
        }
      }
    });

    const stairSteps = 18;
    const stairRun = 8.4;
    const stepRun = stairRun / stairSteps;
    const stepRise = (deckY - 0.15) / stairSteps;
    const stairAngle = Math.atan2(deckY, stairRun);
    const stringerLen = Math.hypot(stairRun, deckY);

    [-spanWidth / 2 - 1.15, spanWidth / 2 + 1.15].forEach((sx) => {
      const pierFooting = new THREE.Mesh(ctx.boxCache(2.4, 0.75, 2.4), plinthMat);
      pierFooting.position.set(sx, 0.375, 0);
      const pierCol = new THREE.Mesh(ctx.cylCache(0.36, 0.42, deckY, 10), steelMat);
      pierCol.position.set(sx, deckY / 2, 0);
      pierCol.castShadow = true;
      const midStrut = new THREE.Mesh(ctx.cylCache(0.22, 0.28, deckY * 0.5, 8), plinthMat);
      midStrut.position.set(sx, deckY * 0.25, 1.65 + stairRun * 0.5);
      fobGroup.add(pierFooting, pierCol, midStrut);

      for (let s = 0; s < stairSteps; s++) {
        const sy = deckY - (s + 0.5) * stepRise;
        const sz = 1.65 + (s + 0.5) * stepRun;
        const tread = new THREE.Mesh(ctx.boxCache(2.05, stepRise + 0.14, stepRun + 0.06), stairConcreteMat);
        tread.position.set(sx, sy, sz);
        tread.castShadow = true;
        tread.receiveShadow = true;
        const noseStrip = new THREE.Mesh(ctx.boxCache(2.02, 0.035, 0.08), tactileYellowMat);
        noseStrip.position.set(sx, sy + (stepRise + 0.14) * 0.5 + 0.01, sz + stepRun * 0.38);
        fobGroup.add(tread, noseStrip);
      }

      [-1.08, 1.08].forEach((hx) => {
        const stringer = new THREE.Mesh(ctx.boxCache(0.14, 0.32, stringerLen), steelMat);
        stringer.position.set(sx + hx, deckY * 0.5 - 0.12, 1.65 + stairRun * 0.5);
        stringer.rotation.x = stairAngle;

        const handrail = new THREE.Mesh(ctx.boxCache(0.08, 0.08, stringerLen + 0.4), chromeRailMat);
        handrail.position.set(sx + hx, deckY * 0.5 + 0.92, 1.65 + stairRun * 0.5);
        handrail.rotation.x = stairAngle;
        fobGroup.add(stringer, handrail);

        for (let p = 0; p <= 4; p++) {
          const frac = p / 4;
          const bal = new THREE.Mesh(ctx.cylCache(0.035, 0.035, 1.0, 6), chromeRailMat);
          bal.position.set(sx + hx, deckY * (1 - frac) + 0.46, 1.65 + stairRun * frac);
          fobGroup.add(bal);
        }
      });

      const entryPad = ctx.sharedBox(2.8, 0.18, 2.2, plinthMat, sx, 0.09, 1.65 + stairRun + 0.95);
      fobGroup.add(entryPad);
      [-1.0, 1.0].forEach((bx) => {
        const bollard = new THREE.Mesh(ctx.cylCache(0.08, 0.09, 0.9, 8), tactileYellowMat);
        bollard.position.set(sx + bx, 0.45, 1.65 + stairRun + 1.85);
        fobGroup.add(bollard);
      });
    });

    const adW = spanWidth * 0.86;
    const adH = 2.2;
    const northTex = createFobBillboardTexture(northAdBrand, northAdBn, northAdEn, northAdColor);
    const southTex = createFobBillboardTexture(southAdBrand, southAdBn, southAdEn, southAdColor);

    [
      { z: -walkwayW / 2 - 0.18, rotY: Math.PI, dir: -1, tex: northTex },
      { z: walkwayW / 2 + 0.18, rotY: 0, dir: 1, tex: southTex },
    ].forEach((side) => {
      const frame = new THREE.Mesh(ctx.boxCache(adW + 0.38, adH + 0.34, 0.18), darkSteelMat);
      frame.position.set(0, deckY + 1.5, side.z);
      frame.castShadow = true;
      const adFace = new THREE.Mesh(
        new THREE.PlaneGeometry(adW, adH),
        new THREE.MeshBasicMaterial({ map: side.tex })
      );
      adFace.position.set(0, deckY + 1.5, side.z + side.dir * 0.10);
      if (side.dir < 0) adFace.rotation.y = Math.PI;
      fobGroup.add(frame, adFace);

      for (let lx = -adW * 0.36; lx <= adW * 0.36 + 0.1; lx += adW * 0.24) {
        const arm = new THREE.Mesh(ctx.boxCache(0.06, 0.06, 0.72), darkSteelMat);
        arm.position.set(lx, deckY + 2.82, side.z + side.dir * 0.38);
        const lamp = new THREE.Mesh(ctx.boxCache(0.28, 0.08, 0.18), ceilingGlowMat);
        lamp.position.set(lx, deckY + 2.74, side.z + side.dir * 0.72);
        fobGroup.add(arm, lamp);
      }
    });

    ctx.scene.add(fobGroup);
  };

  createFob(
    0,
    -55,
    27,
    'bKash',
    'বিকাশ - অ্যাপ দিয়ে ক্যাশ আউট মাত্র ১৪.৯০ টাকা!',
    'Safe, Fast & Trusted Digital Mobile Money in Bangladesh',
    '#be185d',
    'Grameenphone',
    'গ্রামীণফোন - চলো বহুদূর | শক্তিশালী দেশজুড়ে 4G',
    'Unstoppable Mobile Internet Coverage Anywhere in Bangladesh',
    '#0284c7'
  );

  createFob(
    0,
    48,
    26,
    'Nagad',
    'নগদ - সবচেয়ে কম খরচে মুহূর্তেই সেন্ড মানি ও পেমেন্ট!',
    'Fastest Digital Financial Service Across Every District',
    '#c2410c',
    'BRAC Bank',
    'ব্র্যাক ব্যাংক - আস্থা ও সমৃদ্ধির ২৪ ঘণ্টা ব্যাংকিং সেবা',
    'Trusted Banking & SME Loans Built for Modern Dhaka',
    '#0369a1'
  );

  createFob(
    0,
    166,
    25,
    'Daraz',
    'দারাজ ১১.১১ - সবচেয়ে বড় আন্তর্জাতিক অনলাইন মেগা সেল!',
    'Huge Discounts, Free Delivery & Official Brand Guarantees',
    '#ea580c',
    'PRAN Frooto',
    'প্রাণ ফ্রুটো - খাঁটি আমের রিফ্রেশিং পুষ্টি ও স্বাদ!',
    'Pure Mango Pulp Refreshment for Everyone Everyday',
    '#15803d'
  );

  createFob(
    -380,
    -115,
    25,
    'Aarong',
    'আড়ং - ঐতিহ্যে অনন্য বাঙালিয়ানা ও উৎসবের পোশাক!',
    'Authentic Bangladeshi Crafts, Silks, Sarees & Home Decor',
    '#991b1b',
    'Walton',
    'ওয়ালটন - আমাদের পণ্য, দেশের গর্ব | ফ্রিজ, টিভি ও এসি',
    'Innovative Electronics Built Proudly in Bangladesh',
    '#1e40af'
  );
}
