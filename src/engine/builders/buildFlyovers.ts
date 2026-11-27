import * as THREE from 'three';
import { createFlyoverGantryTexture } from '../dhakaModels';
import type { SceneBuilderContext } from './buildTypes';

/**
 * Builds Mohakhali Elevated Flyover, Dhaka Elevated Expressway (Farmgate),
 * Mayor Mohammad Hanif Flyover, and Kuril Interchange Flyover with piers, ramps,
 * crash barriers, overhead gantry signs, and streetlamps.
 */
export function buildMohakhaliFlyoverInScene(ctx: SceneBuilderContext) {
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    roughness: 0.65,
  });
  const barrierYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.6,
  });
  const gantryFrameMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.75,
    roughness: 0.35,
  });
  const stripeWhiteMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
  });

  const flyoverZ = -175;
  const flyoverW = 13.6;
  const deckElev = 9.6;

  const mainDeck = ctx.sharedBox(480, 1.2, flyoverW, deckMat, 0, deckElev - 0.6, flyoverZ);
  mainDeck.receiveShadow = true;
  ctx.scene.add(mainDeck);

  for (let x = -230; x <= 230; x += 12) {
    const stripe = ctx.sharedBox(6.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ);
    ctx.scene.add(stripe);
  }

  const rampLen = 100;
  const rampSlopeAngle = Math.atan2(deckElev, rampLen);
  const westRamp = new THREE.Mesh(ctx.boxCache(100.5, 1.2, flyoverW), deckMat);
  westRamp.position.set(-290, deckElev * 0.5 - 0.6, flyoverZ);
  westRamp.rotation.z = rampSlopeAngle;
  westRamp.receiveShadow = true;
  ctx.scene.add(westRamp);

  const eastRamp = new THREE.Mesh(ctx.boxCache(100.5, 1.2, flyoverW), deckMat);
  eastRamp.position.set(290, deckElev * 0.5 - 0.6, flyoverZ);
  eastRamp.rotation.z = -rampSlopeAngle;
  eastRamp.receiveShadow = true;
  ctx.scene.add(eastRamp);

  const mWestHead = ctx.sharedBox(1.6, 4.2, flyoverW, pierMat, -289, 2.1, flyoverZ);
  const mWestStep1 = ctx.sharedBox(16, 2.8, flyoverW - 0.2, pierMat, -298, 1.4, flyoverZ);
  const mWestStep2 = ctx.sharedBox(18, 1.4, flyoverW - 0.2, pierMat, -315, 0.7, flyoverZ);
  const mWestStep3 = ctx.sharedBox(14, 0.5, flyoverW - 0.2, pierMat, -331, 0.25, flyoverZ);
  ctx.scene.add(mWestHead, mWestStep1, mWestStep2, mWestStep3);
  ctx.buildingColliders.push({
    minX: -290.5,
    maxX: -288.5,
    minZ: flyoverZ - flyoverW / 2,
    maxZ: flyoverZ + flyoverW / 2,
    minY: 0,
    maxY: 4.5,
    tag: 'mohakhali_ramp_abutment_head',
  });

  const mEastHead = ctx.sharedBox(1.6, 4.2, flyoverW, pierMat, 289, 2.1, flyoverZ);
  const mEastStep1 = ctx.sharedBox(16, 2.8, flyoverW - 0.2, pierMat, 298, 1.4, flyoverZ);
  const mEastStep2 = ctx.sharedBox(18, 1.4, flyoverW - 0.2, pierMat, 315, 0.7, flyoverZ);
  const mEastStep3 = ctx.sharedBox(14, 0.5, flyoverW - 0.2, pierMat, 331, 0.25, flyoverZ);
  ctx.scene.add(mEastHead, mEastStep1, mEastStep2, mEastStep3);
  ctx.buildingColliders.push({
    minX: 288.5,
    maxX: 290.5,
    minZ: flyoverZ - flyoverW / 2,
    maxZ: flyoverZ + flyoverW / 2,
    minY: 0,
    maxY: 4.5,
    tag: 'mohakhali_ramp_abutment_head',
  });

  const northBarrier = ctx.sharedBox(480, 1.15, 0.45, barrierMat, 0, deckElev + 0.55, flyoverZ - flyoverW / 2 + 0.22);
  ctx.scene.add(northBarrier);
  ctx.buildingColliders.push({
    minX: -240,
    maxX: 240,
    minZ: flyoverZ - flyoverW / 2 - 0.65,
    maxZ: flyoverZ - flyoverW / 2 + 0.65,
    minY: 8.5,
    maxY: 12.0,
    tag: 'flyover_barrier',
  });

  const southBarrier = ctx.sharedBox(480, 1.15, 0.45, barrierMat, 0, deckElev + 0.55, flyoverZ + flyoverW / 2 - 0.22);
  ctx.scene.add(southBarrier);
  ctx.buildingColliders.push({
    minX: -240,
    maxX: 240,
    minZ: flyoverZ + flyoverW / 2 - 0.65,
    maxZ: flyoverZ + flyoverW / 2 + 0.65,
    minY: 8.5,
    maxY: 12.0,
    tag: 'flyover_barrier',
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(100.5, 1.15, 0.45), barrierMat);
    bMesh.position.set(-290, deckElev * 0.5 + 0.55, flyoverZ + oz);
    bMesh.rotation.z = rampSlopeAngle;
    ctx.scene.add(bMesh);

    const westRampSegs = [
      { minX: -340, maxX: -315, minY: 0.0, maxY: 3.2 },
      { minX: -315, maxX: -290, minY: 1.8, maxY: 5.6 },
      { minX: -290, maxX: -265, minY: 4.2, maxY: 8.0 },
      { minX: -265, maxX: -240, minY: 6.8, maxY: 10.8 },
    ];
    for (const seg of westRampSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.65,
        maxZ: flyoverZ + oz + 0.65,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(100.5, 1.15, 0.45), barrierMat);
    bMesh.position.set(290, deckElev * 0.5 + 0.55, flyoverZ + oz);
    bMesh.rotation.z = -rampSlopeAngle;
    ctx.scene.add(bMesh);

    const eastRampSegs = [
      { minX: 240, maxX: 265, minY: 6.8, maxY: 10.8 },
      { minX: 265, maxX: 290, minY: 4.2, maxY: 8.0 },
      { minX: 290, maxX: 315, minY: 1.8, maxY: 5.6 },
      { minX: 315, maxX: 340, minY: 0.0, maxY: 3.2 },
    ];
    for (const seg of eastRampSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.65,
        maxZ: flyoverZ + oz + 0.65,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  for (let x = -232; x <= 232; x += 18) {
    const curbTrimN = ctx.sharedBox(8, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
    const curbTrimS = ctx.sharedBox(8, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
    ctx.scene.add(curbTrimN);
    ctx.scene.add(curbTrimS);
  }

  for (let px = -228; px <= 228; px += 38) {
    if (Math.abs(px) < 18 || Math.abs(px - 220) < 18 || Math.abs(px + 170) < 18) continue;

    [-4.6, 4.6].forEach((pzOffset) => {
      const pier = new THREE.Mesh(ctx.cylCache(1.05, 1.25, deckElev - 0.6, 12), pierMat);
      pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ + pzOffset);
      pier.castShadow = true;
      ctx.scene.add(pier);

      ctx.circleColliders.push({
        x: px,
        z: flyoverZ + pzOffset,
        radius: 1.35,
        tag: 'flyover_pier',
      });
    });

    const pierCap = ctx.sharedBox(2.6, 1.1, flyoverW + 0.8, pierMat, px, deckElev - 1.1, flyoverZ);
    pierCap.castShadow = true;
    ctx.scene.add(pierCap);
  }

  const gantry1Group = new THREE.Group();
  gantry1Group.position.set(-110, deckElev, flyoverZ);
  [-flyoverW / 2 + 0.3, flyoverW / 2 - 0.3].forEach((gz) => {
    const leg = new THREE.Mesh(ctx.boxCache(0.35, 5.8, 0.35), gantryFrameMat);
    leg.position.set(0, 2.9, gz);
    gantry1Group.add(leg);
  });
  const gantry1Beam = new THREE.Mesh(ctx.boxCache(0.4, 0.5, flyoverW), gantryFrameMat);
  gantry1Beam.position.set(0, 5.8, 0);
  gantry1Group.add(gantry1Beam);

  const sign1Tex = createFlyoverGantryTexture(
    'বিমানবন্দর / উত্তরা / বনানী',
    'AIRPORT / UTTARA / BANANI',
    'মহাখালী বাস টার্মিনাল প্রস্থান',
    'MOHAKHALI BUS TERMINAL EXIT'
  );
  const sign1Board = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.4, 9.2),
    new THREE.MeshBasicMaterial({ map: sign1Tex })
  );
  sign1Board.position.set(-0.25, 4.2, 0);
  gantry1Group.add(sign1Board);
  ctx.scene.add(gantry1Group);

  const gantry2Group = new THREE.Group();
  gantry2Group.position.set(110, deckElev, flyoverZ);
  [-flyoverW / 2 + 0.3, flyoverW / 2 - 0.3].forEach((gz) => {
    const leg = new THREE.Mesh(ctx.boxCache(0.35, 5.8, 0.35), gantryFrameMat);
    leg.position.set(0, 2.9, gz);
    gantry2Group.add(leg);
  });
  const gantry2Beam = new THREE.Mesh(ctx.boxCache(0.4, 0.5, flyoverW), gantryFrameMat);
  gantry2Beam.position.set(0, 5.8, 0);
  gantry2Group.add(gantry2Beam);

  const sign2Tex = createFlyoverGantryTexture(
    'মিরপুর-১০ / ফার্মগেট',
    'MIRPUR-10 / FARMGATE',
    'গুলশান-২ বাণিজ্যিক এলাকা',
    'GULSHAN-2 COMMERCIAL EXIT'
  );
  const sign2Board = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.4, 9.2),
    new THREE.MeshBasicMaterial({ map: sign2Tex })
  );
  sign2Board.position.set(0.25, 4.2, 0);
  gantry2Group.add(sign2Board);
  ctx.scene.add(gantry2Group);
}

/**
 * Builds the Dhaka Elevated Expressway at Farmgate and central north-south spine.
 */
export function buildFarmgateElevatedExpresswayInScene(ctx: SceneBuilderContext) {
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.65,
  });
  const barrierYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.6,
  });
  const gantryFrameMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.75,
    roughness: 0.35,
  });
  const stripeWhiteMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
  });
  const lampLightMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
  });
  ctx.streetLampBasicMats.push(lampLightMat);

  const flyoverX = 14;
  const flyoverW = 14.2;
  const deckLen = 580;
  const deckElev = 16.2;

  const mainDeck = ctx.sharedBox(flyoverW, 1.2, deckLen, deckMat, flyoverX, deckElev - 0.6, -50);
  mainDeck.receiveShadow = true;
  ctx.scene.add(mainDeck);

  for (let z = -330; z <= 230; z += 14) {
    [-3.2, 0, 3.2].forEach((ox) => {
      const stripe = ctx.sharedBox(0.28, 0.04, 7.5, stripeWhiteMat, flyoverX + ox, deckElev + 0.03, z);
      ctx.scene.add(stripe);
    });
  }

  const rampLen = 120;
  const onRampSlopeAngle = Math.atan2(deckElev, rampLen);
  const onRampMesh = new THREE.Mesh(ctx.boxCache(8.4, 1.2, 120.5), deckMat);
  onRampMesh.position.set(18, deckElev * 0.5 - 0.6, -100);
  onRampMesh.rotation.x = -onRampSlopeAngle;
  onRampMesh.receiveShadow = true;
  ctx.scene.add(onRampMesh);

  const offRampMesh = new THREE.Mesh(ctx.boxCache(8.4, 1.2, 120.5), deckMat);
  offRampMesh.position.set(18, deckElev * 0.5 - 0.6, 100);
  offRampMesh.rotation.x = onRampSlopeAngle;
  offRampMesh.receiveShadow = true;
  ctx.scene.add(offRampMesh);

  const offAbutHead = ctx.sharedBox(8.4, 4.8, 1.6, pierMat, 18, 2.4, 119);
  const offAbutStep1 = ctx.sharedBox(8.2, 3.2, 13, pierMat, 18, 1.6, 126);
  const offAbutStep2 = ctx.sharedBox(8.2, 1.8, 14, pierMat, 18, 0.9, 139);
  const offAbutStep3 = ctx.sharedBox(8.2, 0.6, 12, pierMat, 18, 0.3, 152);
  ctx.scene.add(offAbutHead, offAbutStep1, offAbutStep2, offAbutStep3);
  ctx.buildingColliders.push({
    minX: 13.8,
    maxX: 22.2,
    minZ: 118.0,
    maxZ: 120.0,
    minY: 0,
    maxY: 5.2,
    tag: 'farmgate_offramp_abutment_head',
  });
  ctx.buildingColliders.push({
    minX: 13.5,
    maxX: 14.3,
    minZ: 120.0,
    maxZ: 158.0,
    minY: 0,
    maxY: 2.2,
    tag: 'farmgate_offramp_abutment_side',
  });
  ctx.buildingColliders.push({
    minX: 21.7,
    maxX: 22.5,
    minZ: 120.0,
    maxZ: 158.0,
    minY: 0,
    maxY: 2.2,
    tag: 'farmgate_offramp_abutment_side',
  });

  const onAbutHead = ctx.sharedBox(8.4, 4.8, 1.6, pierMat, 18, 2.4, -119);
  const onAbutStep1 = ctx.sharedBox(8.2, 3.2, 13, pierMat, 18, 1.6, -126);
  const onAbutStep2 = ctx.sharedBox(8.2, 1.8, 14, pierMat, 18, 0.9, -139);
  const onAbutStep3 = ctx.sharedBox(8.2, 0.6, 12, pierMat, 18, 0.3, -152);
  ctx.scene.add(onAbutHead, onAbutStep1, onAbutStep2, onAbutStep3);
  ctx.buildingColliders.push({
    minX: 13.8,
    maxX: 22.2,
    minZ: -120.0,
    maxZ: -118.0,
    minY: 0,
    maxY: 5.2,
    tag: 'farmgate_onramp_abutment_head',
  });
  ctx.buildingColliders.push({
    minX: 13.5,
    maxX: 14.3,
    minZ: -158.0,
    maxZ: -120.0,
    minY: 0,
    maxY: 2.2,
    tag: 'farmgate_onramp_abutment_side',
  });
  ctx.buildingColliders.push({
    minX: 21.7,
    maxX: 22.5,
    minZ: -158.0,
    maxZ: -120.0,
    minY: 0,
    maxY: 2.2,
    tag: 'farmgate_onramp_abutment_side',
  });

  const westBarrier = ctx.sharedBox(0.45, 1.25, deckLen, barrierMat, flyoverX - flyoverW / 2 + 0.22, deckElev + 0.62, -50);
  ctx.scene.add(westBarrier);
  ctx.buildingColliders.push({
    minX: 6.75,
    maxX: 7.55,
    minZ: -340,
    maxZ: 240,
    minY: 14.5,
    maxY: 19.5,
    tag: 'flyover_barrier',
  });

  const eastBarrierN = ctx.sharedBox(0.45, 1.25, 180, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, -250);
  ctx.scene.add(eastBarrierN);
  ctx.buildingColliders.push({
    minX: 20.55,
    maxX: 21.35,
    minZ: -340,
    maxZ: -160,
    minY: 14.5,
    maxY: 19.5,
    tag: 'flyover_barrier',
  });

  const eastBarrierM = ctx.sharedBox(0.45, 1.25, 80, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, 0);
  ctx.scene.add(eastBarrierM);
  ctx.buildingColliders.push({
    minX: 20.55,
    maxX: 21.35,
    minZ: -40,
    maxZ: 40,
    minY: 14.5,
    maxY: 19.5,
    tag: 'flyover_barrier',
  });

  const eastBarrierS = ctx.sharedBox(0.45, 1.25, 80, barrierMat, flyoverX + flyoverW / 2 - 0.22, deckElev + 0.62, 200);
  ctx.scene.add(eastBarrierS);
  ctx.buildingColliders.push({
    minX: 20.55,
    maxX: 21.35,
    minZ: 160,
    maxZ: 240,
    minY: 14.5,
    maxY: 19.5,
    tag: 'flyover_barrier',
  });

  const onRampOuterGuard = new THREE.Mesh(ctx.boxCache(0.45, 1.25, 120.5), barrierMat);
  onRampOuterGuard.position.set(22.0, deckElev * 0.5 + 0.62, -100);
  onRampOuterGuard.rotation.x = -onRampSlopeAngle;
  ctx.scene.add(onRampOuterGuard);

  const onRampSegs = [
    { minZ: -160, maxZ: -130, minY: 0.0, maxY: 5.0 },
    { minZ: -130, maxZ: -100, minY: 3.5, maxY: 9.0 },
    { minZ: -100, maxZ: -70, minY: 7.5, maxY: 13.0 },
    { minZ: -70, maxZ: -40, minY: 11.5, maxY: 17.5 },
  ];
  for (const seg of onRampSegs) {
    ctx.buildingColliders.push({
      minX: 21.6,
      maxX: 22.45,
      minZ: seg.minZ,
      maxZ: seg.maxZ,
      minY: seg.minY,
      maxY: seg.maxY,
      tag: 'flyover_barrier',
    });
  }

  const offRampOuterGuard = new THREE.Mesh(ctx.boxCache(0.45, 1.25, 120.5), barrierMat);
  offRampOuterGuard.position.set(22.0, deckElev * 0.5 + 0.62, 100);
  offRampOuterGuard.rotation.x = onRampSlopeAngle;
  ctx.scene.add(offRampOuterGuard);

  const offRampSegs = [
    { minZ: 40, maxZ: 70, minY: 11.5, maxY: 17.5 },
    { minZ: 70, maxZ: 100, minY: 7.5, maxY: 13.0 },
    { minZ: 100, maxZ: 130, minY: 3.5, maxY: 9.0 },
    { minZ: 130, maxZ: 160, minY: 0.0, maxY: 5.0 },
  ];
  for (const seg of offRampSegs) {
    ctx.buildingColliders.push({
      minX: 21.6,
      maxX: 22.45,
      minZ: seg.minZ,
      maxZ: seg.maxZ,
      minY: seg.minY,
      maxY: seg.maxY,
      tag: 'flyover_barrier',
    });
  }

  const termNorth = ctx.sharedBox(flyoverW, 1.25, 0.45, barrierMat, flyoverX, deckElev + 0.62, -340);
  ctx.scene.add(termNorth);
  ctx.buildingColliders.push({
    minX: flyoverX - flyoverW / 2,
    maxX: flyoverX + flyoverW / 2,
    minZ: -341.0,
    maxZ: -339.0,
    minY: 14.5,
    maxY: 18.5,
    tag: 'flyover_barrier',
  });

  const termSouth = ctx.sharedBox(flyoverW, 1.25, 0.45, barrierMat, flyoverX, deckElev + 0.62, 240);
  ctx.scene.add(termSouth);
  ctx.buildingColliders.push({
    minX: flyoverX - flyoverW / 2,
    maxX: flyoverX + flyoverW / 2,
    minZ: 239.0,
    maxZ: 241.0,
    minY: 14.5,
    maxY: 18.5,
    tag: 'flyover_barrier',
  });

  for (let z = -330; z <= 230; z += 20) {
    const curbTrimW = ctx.sharedBox(0.25, 0.25, 9.5, barrierYellowMat, flyoverX - flyoverW / 2 + 0.45, deckElev + 0.15, z);
    const curbTrimE = ctx.sharedBox(0.25, 0.25, 9.5, barrierYellowMat, flyoverX + flyoverW / 2 - 0.45, deckElev + 0.15, z);
    ctx.scene.add(curbTrimW);
    ctx.scene.add(curbTrimE);
  }

  for (let pz = -324; pz <= 228; pz += 36) {
    if (Math.abs(pz - (-175)) < 24) continue;
    if (Math.abs(pz - 0) < 22) continue;
    if (Math.abs(pz - 240) < 24) continue;

    const pier = new THREE.Mesh(ctx.cylCache(1.35, 1.55, deckElev - 0.6, 14), pierMat);
    pier.position.set(flyoverX, (deckElev - 0.6) / 2, pz);
    pier.castShadow = true;
    ctx.scene.add(pier);

    ctx.circleColliders.push({
      x: flyoverX,
      z: pz,
      radius: 1.6,
      tag: 'flyover_pier',
    });

    const pierCap = ctx.sharedBox(flyoverW + 0.8, 1.3, 3.2, pierMat, flyoverX, deckElev - 1.2, pz);
    pierCap.castShadow = true;
    ctx.scene.add(pierCap);
  }

  const signLocations = [
    { z: -160, b1: 'উত্তরা / বিমানবন্দর / ৩০০ ফিট', e1: 'UTTARA / AIRPORT / 300FT', b2: 'বনানী প্রস্থান', e2: 'BANANI EXIT' },
    { z: -10, b1: 'ঢাকা এলিভেটেড এক্সপ্রেসওয়ে', e1: 'DHAKA ELEVATED EXPRESSWAY', b2: 'ফার্মগেট / তেজগাঁও প্রস্থান', e2: 'FARMGATE / TEJGAON EXIT' },
    { z: 140, b1: 'মহাখালী / বিমানবন্দর লিঙ্ক', e1: 'MOHAKHALI / AIRPORT LINK', b2: 'মতিঝিল / সদরঘাট এক্সপ্রেসওয়ে', e2: 'MOTIJHEEL / SADARGHAT EXPRESS' },
  ];

  signLocations.forEach((loc) => {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(flyoverX, deckElev, loc.z);

    [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gx) => {
      const leg = new THREE.Mesh(ctx.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
      leg.position.set(gx, 3.1, 0);
      gantryGroup.add(leg);
    });

    const gantryBeam = new THREE.Mesh(ctx.boxCache(flyoverW, 0.55, 0.4), gantryFrameMat);
    gantryBeam.position.set(0, 6.2, 0);
    gantryGroup.add(gantryBeam);

    const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 2.5, 0.12),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
    );
    signBoard.position.set(0, 4.8, 0);
    gantryGroup.add(signBoard);

    ctx.scene.add(gantryGroup);
  });

  for (let lz = -310; lz <= 210; lz += 42) {
    const pole = new THREE.Mesh(ctx.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
    pole.position.set(flyoverX - flyoverW / 2 + 0.35, deckElev + 3.75, lz);
    ctx.scene.add(pole);

    const luminaire = new THREE.Mesh(ctx.boxCache(0.35, 0.15, 0.8), lampLightMat);
    luminaire.position.set(flyoverX - flyoverW / 2 + 1.2, deckElev + 7.5, lz);
    ctx.scene.add(luminaire);
  }
}

/**
 * Builds the Mayor Mohammad Hanif Flyover spanning 1120m across South Dhaka.
 */
export function buildMayorHanifFlyoverInScene(ctx: SceneBuilderContext) {
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.65,
  });
  const barrierYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.6,
  });
  const gantryFrameMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.75,
    roughness: 0.35,
  });
  const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const lampLightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
  ctx.streetLampBasicMats.push(lampLightMat);

  const flyoverZ = 240;
  const flyoverW = 14.2;
  const deckLen = 880;
  const deckElev = 11.2;

  const mainDeck = ctx.sharedBox(deckLen, 1.2, flyoverW, deckMat, 0, deckElev - 0.6, flyoverZ);
  mainDeck.receiveShadow = true;
  ctx.scene.add(mainDeck);

  for (let x = -430; x <= 430; x += 14) {
    [-3.2, 0, 3.2].forEach((oz) => {
      const stripe = ctx.sharedBox(7.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ + oz);
      ctx.scene.add(stripe);
    });
  }

  const rampLen = 120;
  const westSlopeAngle = Math.atan2(deckElev, rampLen);
  const westRamp = new THREE.Mesh(ctx.boxCache(120.5, 1.2, flyoverW), deckMat);
  westRamp.position.set(-500, deckElev * 0.5 - 0.6, flyoverZ);
  westRamp.rotation.z = westSlopeAngle;
  westRamp.receiveShadow = true;
  ctx.scene.add(westRamp);

  const eastRamp = new THREE.Mesh(ctx.boxCache(120.5, 1.2, flyoverW), deckMat);
  eastRamp.position.set(500, deckElev * 0.5 - 0.6, flyoverZ);
  eastRamp.rotation.z = -westSlopeAngle;
  eastRamp.receiveShadow = true;
  ctx.scene.add(eastRamp);

  const northBarrier = ctx.sharedBox(deckLen, 1.25, 0.45, barrierMat, 0, deckElev + 0.62, flyoverZ - flyoverW / 2 + 0.22);
  ctx.scene.add(northBarrier);
  ctx.buildingColliders.push({
    minX: -440,
    maxX: 440,
    minZ: flyoverZ - flyoverW / 2 - 0.65,
    maxZ: flyoverZ - flyoverW / 2 + 0.65,
    minY: 10.0,
    maxY: 13.5,
    tag: 'flyover_barrier',
  });

  const southBarrier = ctx.sharedBox(deckLen, 1.25, 0.45, barrierMat, 0, deckElev + 0.62, flyoverZ + flyoverW / 2 - 0.22);
  ctx.scene.add(southBarrier);
  ctx.buildingColliders.push({
    minX: -440,
    maxX: 440,
    minZ: flyoverZ + flyoverW / 2 - 0.65,
    maxZ: flyoverZ + flyoverW / 2 + 0.65,
    minY: 10.0,
    maxY: 13.5,
    tag: 'flyover_barrier',
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(120.5, 1.25, 0.45), barrierMat);
    bMesh.position.set(-500, deckElev * 0.5 + 0.62, flyoverZ + oz);
    bMesh.rotation.z = westSlopeAngle;
    ctx.scene.add(bMesh);

    const hanifWestSegs = [
      { minX: -560, maxX: -530, minY: 0.0, maxY: 3.8 },
      { minX: -530, maxX: -500, minY: 2.5, maxY: 6.8 },
      { minX: -500, maxX: -470, minY: 5.5, maxY: 9.8 },
      { minX: -470, maxX: -440, minY: 8.5, maxY: 13.0 },
    ];
    for (const seg of hanifWestSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.42,
        maxZ: flyoverZ + oz + 0.42,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(120.5, 1.25, 0.45), barrierMat);
    bMesh.position.set(500, deckElev * 0.5 + 0.62, flyoverZ + oz);
    bMesh.rotation.z = -westSlopeAngle;
    ctx.scene.add(bMesh);

    const hanifEastSegs = [
      { minX: 440, maxX: 470, minY: 8.5, maxY: 13.0 },
      { minX: 470, maxX: 500, minY: 5.5, maxY: 9.8 },
      { minX: 500, maxX: 530, minY: 2.5, maxY: 6.8 },
      { minX: 530, maxX: 560, minY: 0.0, maxY: 3.8 },
    ];
    for (const seg of hanifEastSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.42,
        maxZ: flyoverZ + oz + 0.42,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  for (let x = -430; x <= 430; x += 22) {
    const curbN = ctx.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
    const curbS = ctx.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
    ctx.scene.add(curbN);
    ctx.scene.add(curbS);
  }

  for (let px = -418; px <= 418; px += 38) {
    if (
      Math.abs(px) < 18 ||
      Math.abs(px - 220) < 18 ||
      Math.abs(px - (-170)) < 18 ||
      Math.abs(px - (-380)) < 18
    ) {
      continue;
    }
    const pier = new THREE.Mesh(ctx.cylCache(1.35, 1.55, deckElev - 0.6, 14), pierMat);
    pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ);
    pier.castShadow = true;
    ctx.scene.add(pier);

    ctx.circleColliders.push({
      x: px,
      z: flyoverZ,
      radius: 1.6,
      tag: 'flyover_pier',
    });

    const pierCap = ctx.sharedBox(3.2, 1.3, flyoverW + 0.8, pierMat, px, deckElev - 1.2, flyoverZ);
    pierCap.castShadow = true;
    ctx.scene.add(pierCap);
  }

  const signLocations = [
    { x: -180, b1: 'মেয়র মোহাম্মদ হানিফ ফ্লাইওভার', e1: 'MAYOR MOHAMMAD HANIF FLYOVER', b2: 'যাত্রাবাড়ী / সায়েদাবাদ প্রস্থান', e2: 'JATRABARI / SAYEDABAD EXIT' },
    { x: 0, b1: 'পোস্তগোলা / বুড়িগঙ্গা ২য় সেতু লিঙ্ক', e1: 'POSTOGOLA / BURIGANGA 2ND BRIDGE', b2: 'চট্টগ্রাম মহাসড়ক সংযোগ', e2: 'CHITTAGONG HIGHWAY LINK' },
    { x: 180, b1: 'গুলিস্তান / মতিঝিল প্রস্থান', e1: 'GULISTAN / MOTIJHEEL EXIT', b2: 'যাত্রাবাড়ী ইন্টারচেঞ্জ', e2: 'JATRABARI INTERCHANGE' },
  ];

  signLocations.forEach((loc) => {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(loc.x, deckElev, flyoverZ);

    [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gz) => {
      const leg = new THREE.Mesh(ctx.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
      leg.position.set(0, 3.1, gz);
      gantryGroup.add(leg);
    });

    const gantryBeam = new THREE.Mesh(ctx.boxCache(0.4, 0.55, flyoverW), gantryFrameMat);
    gantryBeam.position.set(0, 6.2, 0);
    gantryGroup.add(gantryBeam);

    const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.5, 10.2),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
    );
    signBoard.position.set(0, 4.8, 0);
    gantryGroup.add(signBoard);

    ctx.scene.add(gantryGroup);
  });

  for (let lx = -330; lx <= 330; lx += 44) {
    const pole = new THREE.Mesh(ctx.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
    pole.position.set(lx, deckElev + 3.75, flyoverZ - flyoverW / 2 + 0.35);
    ctx.scene.add(pole);

    const luminaire = new THREE.Mesh(ctx.boxCache(0.8, 0.15, 0.35), lampLightMat);
    luminaire.position.set(lx, deckElev + 7.5, flyoverZ - flyoverW / 2 + 1.2);
    ctx.scene.add(luminaire);
  }
}

/**
 * Builds the Kuril Interchange Flyover connecting Airport Road into Purbachal 300ft Expressway.
 */
export function buildKurilFlyoverInterchangeInScene(ctx: SceneBuilderContext) {
  const deckMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
  });
  const pierMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.82,
  });
  const barrierMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.65,
  });
  const barrierYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.6,
  });
  const gantryFrameMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    metalness: 0.75,
    roughness: 0.35,
  });
  const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const lampLightMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
  ctx.streetLampBasicMats.push(lampLightMat);

  const flyoverZ = -315;
  const flyoverW = 14.2;
  const deckLen = 360;
  const deckElev = 11.2;

  const mainDeck = ctx.sharedBox(deckLen, 1.2, flyoverW, deckMat, 540, deckElev - 0.6, flyoverZ);
  mainDeck.receiveShadow = true;
  ctx.scene.add(mainDeck);

  for (let x = 370; x <= 710; x += 14) {
    [-3.2, 0, 3.2].forEach((oz) => {
      const stripe = ctx.sharedBox(7.5, 0.04, 0.28, stripeWhiteMat, x, deckElev + 0.03, flyoverZ + oz);
      ctx.scene.add(stripe);
    });
  }

  const rampLen = 80;
  const slopeAngle = Math.atan2(deckElev, rampLen);
  const westRamp = new THREE.Mesh(ctx.boxCache(80.5, 1.2, flyoverW), deckMat);
  westRamp.position.set(320, deckElev * 0.5 - 0.6, flyoverZ);
  westRamp.rotation.z = slopeAngle;
  westRamp.receiveShadow = true;
  ctx.scene.add(westRamp);

  const eastRamp = new THREE.Mesh(ctx.boxCache(80.5, 1.2, flyoverW), deckMat);
  eastRamp.position.set(760, deckElev * 0.5 - 0.6, flyoverZ);
  eastRamp.rotation.z = -slopeAngle;
  eastRamp.receiveShadow = true;
  ctx.scene.add(eastRamp);

  const northBarrier = ctx.sharedBox(deckLen, 1.25, 0.45, barrierMat, 540, deckElev + 0.62, flyoverZ - flyoverW / 2 + 0.22);
  ctx.scene.add(northBarrier);
  ctx.buildingColliders.push({
    minX: 360,
    maxX: 720,
    minZ: flyoverZ - flyoverW / 2 - 0.65,
    maxZ: flyoverZ - flyoverW / 2 + 0.65,
    minY: 9.5,
    maxY: 13.5,
    tag: 'flyover_barrier',
  });

  const southBarrier = ctx.sharedBox(deckLen, 1.25, 0.45, barrierMat, 540, deckElev + 0.62, flyoverZ + flyoverW / 2 - 0.22);
  ctx.scene.add(southBarrier);
  ctx.buildingColliders.push({
    minX: 360,
    maxX: 720,
    minZ: flyoverZ + flyoverW / 2 - 0.65,
    maxZ: flyoverZ + flyoverW / 2 + 0.65,
    minY: 9.5,
    maxY: 13.5,
    tag: 'flyover_barrier',
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(80.5, 1.25, 0.45), barrierMat);
    bMesh.position.set(320, deckElev * 0.5 + 0.62, flyoverZ + oz);
    bMesh.rotation.z = slopeAngle;
    ctx.scene.add(bMesh);

    const kurilWestSegs = [
      { minX: 280, maxX: 300, minY: 0.0, maxY: 3.5 },
      { minX: 300, maxX: 320, minY: 2.0, maxY: 6.5 },
      { minX: 320, maxX: 340, minY: 5.0, maxY: 9.5 },
      { minX: 340, maxX: 360, minY: 8.0, maxY: 12.8 },
    ];
    for (const seg of kurilWestSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.42,
        maxZ: flyoverZ + oz + 0.42,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  [-flyoverW / 2 + 0.22, flyoverW / 2 - 0.22].forEach((oz) => {
    const bMesh = new THREE.Mesh(ctx.boxCache(80.5, 1.25, 0.45), barrierMat);
    bMesh.position.set(760, deckElev * 0.5 + 0.62, flyoverZ + oz);
    bMesh.rotation.z = -slopeAngle;
    ctx.scene.add(bMesh);

    const kurilEastSegs = [
      { minX: 720, maxX: 740, minY: 8.0, maxY: 12.8 },
      { minX: 740, maxX: 760, minY: 5.0, maxY: 9.5 },
      { minX: 760, maxX: 780, minY: 2.0, maxY: 6.5 },
      { minX: 780, maxX: 800, minY: 0.0, maxY: 3.5 },
    ];
    for (const seg of kurilEastSegs) {
      ctx.buildingColliders.push({
        minX: seg.minX,
        maxX: seg.maxX,
        minZ: flyoverZ + oz - 0.65,
        maxZ: flyoverZ + oz + 0.65,
        minY: seg.minY,
        maxY: seg.maxY,
        tag: 'flyover_barrier',
      });
    }
  });

  for (let x = 370; x <= 710; x += 22) {
    const curbN = ctx.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ - flyoverW / 2 + 0.45);
    const curbS = ctx.sharedBox(9.5, 0.25, 0.25, barrierYellowMat, x, deckElev + 0.15, flyoverZ + flyoverW / 2 - 0.45);
    ctx.scene.add(curbN);
    ctx.scene.add(curbS);
  }

  for (let px = 380; px <= 700; px += 38) {
    if (Math.abs(px - 440) < 18 || Math.abs(px - 640) < 22) continue;
    if (px >= 530 && px <= 650) {
      [-13.0, 13.0].forEach((offsetZ) => {
        const portalCol = new THREE.Mesh(ctx.cylCache(0.95, 1.15, deckElev - 0.6, 12), pierMat);
        portalCol.position.set(px, (deckElev - 0.6) / 2, flyoverZ + offsetZ);
        portalCol.castShadow = true;
        ctx.scene.add(portalCol);
      });
      const straddleBeam = ctx.sharedBox(2.8, 1.5, 28.0, pierMat, px, deckElev - 1.25, flyoverZ);
      straddleBeam.castShadow = true;
      ctx.scene.add(straddleBeam);
      continue;
    }
    const pier = new THREE.Mesh(ctx.cylCache(1.4, 1.65, deckElev - 0.6, 14), pierMat);
    pier.position.set(px, (deckElev - 0.6) / 2, flyoverZ);
    pier.castShadow = true;
    ctx.scene.add(pier);

    ctx.circleColliders.push({
      x: px,
      z: flyoverZ,
      radius: 1.7,
      tag: 'flyover_pier',
    });

    const pierCap = ctx.sharedBox(3.4, 1.4, flyoverW + 0.8, pierMat, px, deckElev - 1.2, flyoverZ);
    pierCap.castShadow = true;
    ctx.scene.add(pierCap);
  }

  const signLocations = [
    { x: 440, b1: 'কুড়িল ইন্টারচেঞ্জ ফ্লাইওভার', e1: 'KURIL INTERCHANGE FLYOVER', b2: 'পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ে', e2: 'PURBACHAL 300FT EXPRESSWAY' },
    { x: 620, b1: 'বিমানবন্দর ও উত্তরা লিঙ্ক', e1: 'AIRPORT & UTTARA LINK', b2: 'নিকুঞ্জ ও বারিধারা প্রস্থান', e2: 'NIKUNJA & BARIDHARA EXIT' },
  ];

  signLocations.forEach((loc) => {
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(loc.x, deckElev, flyoverZ);

    [-flyoverW / 2 + 0.4, flyoverW / 2 - 0.4].forEach((gz) => {
      const leg = new THREE.Mesh(ctx.boxCache(0.38, 6.2, 0.38), gantryFrameMat);
      leg.position.set(0, 3.1, gz);
      gantryGroup.add(leg);
    });

    const gantryBeam = new THREE.Mesh(ctx.boxCache(0.4, 0.55, flyoverW), gantryFrameMat);
    gantryBeam.position.set(0, 6.2, 0);
    gantryGroup.add(gantryBeam);

    const signTex = createFlyoverGantryTexture(loc.b1, loc.e1, loc.b2, loc.e2);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.5, 10.2),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
    );
    signBoard.position.set(0, 4.8, 0);
    gantryGroup.add(signBoard);

    ctx.scene.add(gantryGroup);
  });

  for (let lx = 370; lx <= 710; lx += 42) {
    const pole = new THREE.Mesh(ctx.cylCache(0.12, 0.16, 7.5, 8), gantryFrameMat);
    pole.position.set(lx, deckElev + 3.75, flyoverZ - flyoverW / 2 + 0.35);
    ctx.scene.add(pole);

    const luminaire = new THREE.Mesh(ctx.boxCache(0.8, 0.15, 0.35), lampLightMat);
    luminaire.position.set(lx, deckElev + 7.5, flyoverZ - flyoverW / 2 + 1.2);
    ctx.scene.add(luminaire);
  }
}
