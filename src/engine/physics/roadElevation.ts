export interface MetroStationInteriorZone {
  concourseMinX: number;
  concourseMaxX: number;
  concourseMinZ: number;
  concourseMaxZ: number;
  concourseY: number;
  platMinX: number;
  platMaxX: number;
  platMinZ: number;
  platMaxZ: number;
  platY: number;
  inX1: number;
  inZ1: number;
  inY1: number;
  inX2: number;
  inZ2: number;
  inY2: number;
  inHalfW: number;
}

export interface MetroEscalatorZone {
  x1: number;
  z1: number;
  y1: number;
  x2: number;
  z2: number;
  y2: number;
  halfWidth: number;
  kioskX: number;
  kioskZ: number;
  kioskHalfX: number;
  kioskHalfZ: number;
  landMinX: number;
  landMaxX: number;
  landMinZ: number;
  landMaxZ: number;
  landY: number;
}

export interface RoadSpan {
  x: number;
  width: number;
  zMin: number;
  zMax: number;
}

export interface RoadElevationContext {
  jfpCenter: { x: number; z: number };
  metroStationInteriors: MetroStationInteriorZone[];
  metroEscalators: MetroEscalatorZone[];
  nsRoads: ReadonlyArray<RoadSpan>;
}

const FOOT_OVER_BRIDGES: ReadonlyArray<{ bx: number; bz: number; halfSpan: number }> = [
  { bx: 0, bz: -55, halfSpan: 13.5 },
  { bx: 0, bz: 48, halfSpan: 13.0 },
  { bx: 0, bz: 166, halfSpan: 12.5 },
  { bx: -380, bz: -115, halfSpan: 12.5 },
];

/**
 * Pure elevation solver for Jamuna Future Park floors/escalators, Foot Over Bridges,
 * Metro station interiors/escalators, Dhaka Elevated Expressway, flyovers, and bridges.
 */
export function evaluateRoadElevation(
  x: number,
  z: number,
  currentY: number | undefined,
  ctx: RoadElevationContext
): number {
  const expDeckElev = 16.2;

  // -1. Jamuna Future Park 3-Floor Shopping Mall & Escalators (X: 464..576, Z: -421..-349)
  const jx = x - ctx.jfpCenter.x;
  const jz = z - ctx.jfpCenter.z;
  if (Math.abs(jx) <= 56 && Math.abs(jz) <= 36) {
    const Y0 = 0.25;
    const FLOOR_H = 5.15;
    const Y1 = Y0 + FLOOR_H;     // 5.40m
    const Y2 = Y0 + FLOOR_H * 2; // 10.55m

    // West Escalator (GF Y0 <-> 1F Y1): localX in [-25.0, -20.0], localZ in [-9, +9]
    if (jx >= -25.0 && jx <= -20.0 && jz >= -9.0 && jz <= 9.0) {
      const t = (9.0 - jz) / 18.0;
      const rampY = Y0 + FLOOR_H * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY >= 8.2) {
        return Y2; // 2F gallery walks over West escalator well
      }
      if (currentY === undefined || Math.abs(currentY - rampY) <= 2.35) {
        return rampY;
      }
      return Y0;
    }

    // East Escalator (1F Y1 <-> 2F Y2): localX in [+20.0, +25.0], localZ in [-9, +9]
    if (jx >= 20.0 && jx <= 25.0 && jz >= -9.0 && jz <= 9.0) {
      const t = (9.0 - jz) / 18.0;
      const rampY = Y1 + FLOOR_H * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY >= 3.0 && Math.abs(currentY - rampY) <= 2.35) {
        return rampY;
      }
      return Y0;
    }

    // Open Central Atrium Void (|jx| < 13.8 && |jz| < 10.8): no 1F/2F floor slab!
    const inAtriumVoid = Math.abs(jx) < 13.8 && Math.abs(jz) < 10.8;
    if (!inAtriumVoid && currentY !== undefined) {
      if (currentY >= 8.2) return Y2;
      if (currentY >= 3.2) return Y1;
    }
    return Y0;
  }
  // Jamuna Future Park South Drop-off Marble Plaza Apron
  if (Math.abs(jx) <= 59 && jz > 36 && jz <= 57) {
    return 0.16;
  }

  // 0. High Elevated Structures (Y >= 12.0m) - Priority for top-level Expressway
  //    Wait: yield cleanly when the vehicle/player is actively tracking the parallel East-side on/off ramp slope!
  if (currentY !== undefined && currentY >= 12.0) {
    if (Math.abs(x - 14) <= 7.1 && z >= -340 && z <= 240) {
      let onActiveRampSlope = false;
      if (x >= 13.8 && x <= 22.8) {
        if (z >= -160 && z <= -40) {
          const rY = expDeckElev * ((z + 160) / 120);
          if (Math.abs(currentY - rY) <= 2.2 && rY < 16.15) {
            onActiveRampSlope = true;
          }
        } else if (z >= 40 && z <= 160) {
          const rY = expDeckElev * (1 - (z - 40) / 120);
          if (Math.abs(currentY - rY) <= 2.2) {
            onActiveRampSlope = true;
          }
        }
      }
      if (!onActiveRampSlope) {
        return expDeckElev;
      }
    }
  }

  // 0.5 Walkable Pedestrian Covered Foot Over Bridges
  for (const f of FOOT_OVER_BRIDGES) {
    const lx = x - f.bx;
    const lz = z - f.bz;
    if (Math.abs(lx) <= f.halfSpan + 3.0 && lz >= -2.2 && lz <= 12.4 && (currentY === undefined || currentY < 9.5)) {
      if (Math.abs(lz) <= 1.75 && Math.abs(lx) <= f.halfSpan + 1.65) {
        if (currentY === undefined || (currentY >= 3.8 && currentY <= 9.2)) {
          return 6.40;
        }
      }
      const onSideStair =
        Math.abs(lx - -(f.halfSpan + 1.15)) <= 1.35 ||
        Math.abs(lx - (f.halfSpan + 1.15)) <= 1.35;
      if (onSideStair && lz >= 1.65 && lz <= 12.3) {
        if (lz > 10.05) {
          if (currentY === undefined || currentY <= 2.2) return 0.18;
        } else {
          const t = Math.max(0, Math.min(1, (10.05 - lz) / 8.4));
          const stairElev = 0.42 + t * (6.38 - 0.42);
          if (currentY === undefined || (Math.abs(currentY - stairElev) <= 2.8 && currentY <= 9.2) || stairElev <= 1.5) {
            return stairElev;
          }
        }
      }
    }
  }

  // 0.6 Walkable Metro Rail Entry Kiosks, Escalators, Upper Concourse Halls & Train Platforms (L6 & L5)
  for (const stInt of ctx.metroStationInteriors) {
    const idx = stInt.inX2 - stInt.inX1;
    const idz = stInt.inZ2 - stInt.inZ1;
    const iLenSq = idx * idx + idz * idz;
    if (iLenSq > 0.1) {
      const rawT = ((x - stInt.inX1) * idx + (z - stInt.inZ1) * idz) / iLenSq;
      if (rawT >= -0.04 && rawT <= 1.03) {
        const t = Math.max(0, Math.min(1, rawT));
        const ipx = stInt.inX1 + idx * t;
        const ipz = stInt.inZ1 + idz * t;
        if (Math.hypot(x - ipx, z - ipz) <= stInt.inHalfW) {
          const stairY = stInt.inY1 + (stInt.inY2 - stInt.inY1) * t;
          const walkingHighOnPlatform =
            currentY !== undefined &&
            currentY >= stInt.platY - 0.55 &&
            Math.abs(stairY - stInt.platY) > 1.05;
          if (
            !walkingHighOnPlatform &&
            currentY !== undefined &&
            Math.abs(currentY - stairY) <= 1.85 &&
            currentY >= stInt.inY1 - 1.5
          ) {
            return stairY;
          }
        }
      }
    }
    if (
      x >= stInt.platMinX &&
      x <= stInt.platMaxX &&
      z >= stInt.platMinZ &&
      z <= stInt.platMaxZ &&
      currentY !== undefined &&
      currentY >= stInt.platY - 1.4 &&
      currentY <= stInt.platY + 3.0
    ) {
      return stInt.platY;
    }
    if (
      x >= stInt.concourseMinX &&
      x <= stInt.concourseMaxX &&
      z >= stInt.concourseMinZ &&
      z <= stInt.concourseMaxZ &&
      currentY !== undefined &&
      currentY >= stInt.concourseY - 2.0 &&
      currentY <= stInt.concourseY + 2.5
    ) {
      return stInt.concourseY;
    }
  }
  for (const esc of ctx.metroEscalators) {
    if (
      x >= esc.landMinX &&
      x <= esc.landMaxX &&
      z >= esc.landMinZ &&
      z <= esc.landMaxZ &&
      (currentY === undefined || (currentY >= esc.landY - 3.2 && currentY <= esc.landY + 2.5))
    ) {
      return esc.landY;
    }
    if (Math.abs(x - esc.kioskX) <= esc.kioskHalfX && Math.abs(z - esc.kioskZ) <= esc.kioskHalfZ) {
      if (currentY === undefined || currentY <= 2.2) {
        return 0.22;
      }
    }
    const dx = esc.x2 - esc.x1;
    const dz = esc.z2 - esc.z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq > 0.1) {
      const rawT = ((x - esc.x1) * dx + (z - esc.z1) * dz) / lenSq;
      if (rawT >= -0.03 && rawT <= 1.03) {
        const t = Math.max(0, Math.min(1, rawT));
        const px = esc.x1 + dx * t;
        const pz = esc.z1 + dz * t;
        if (Math.hypot(x - px, z - pz) <= esc.halfWidth) {
          const rampElev = esc.y1 + (esc.y2 - esc.y1) * t;
          if (currentY === undefined || (Math.abs(currentY - rampElev) <= 2.6 && currentY <= esc.y2 + 1.5) || rampElev <= 1.2) {
            return rampElev;
          }
        }
      }
    }
  }

  // 1. Dhaka Elevated Expressway On/Off Ramps (Farmgate)
  if (z >= -160 && z <= -40 && x >= 13.2 && x <= 22.8) {
    const t = (z - (-160)) / 120;
    const rampElev = expDeckElev * Math.max(0, Math.min(1, t));
    if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
      return 0;
    }
    if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
      return rampElev;
    }
  }
  if (z >= 40 && z <= 160 && x >= 13.2 && x <= 22.8) {
    const t = 1 - (z - 40) / 120;
    const rampElev = expDeckElev * Math.max(0, Math.min(1, t));
    if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
      return 0;
    }
    if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
      return rampElev;
    }
  }

  // 2. Mohakhali Elevated Flyover (Z = -175, road width = 13.6m, Y = 9.6m)
  if (Math.abs(z - (-175)) <= 6.8) {
    if (x >= -340 && x < -240) {
      const t = (x - (-340)) / 100;
      const rampElev = 9.6 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x > 240 && x <= 340) {
      const t = 1 - (x - 240) / 100;
      const rampElev = 9.6 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x >= -240 && x <= 240) {
      if (currentY !== undefined && (currentY < 4.5 || currentY > 13.0)) {
        return 0;
      }
      return 9.6;
    }
  }

  // 3. Dhaka Elevated Expressway Main Deck
  if (Math.abs(x - 14) <= 7.1 && z >= -340 && z <= 240) {
    if (currentY !== undefined && currentY < 11.5) {
      if (Math.abs(z - (-175)) <= 6.8) return 9.6;
      if (Math.abs(z - 240) <= 7.1) return 11.2;
      return 0;
    }
    return expDeckElev;
  }

  // 4. Mayor Mohammad Hanif Flyover (Z = 240, width 14.2m, Y = 11.2m)
  if (Math.abs(z - 240) <= 7.1) {
    if (x >= -560 && x < -440) {
      const t = (x - (-560)) / 120;
      const rampElev = 11.2 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x > 440 && x <= 560) {
      const t = 1 - (x - 440) / 120;
      const rampElev = 11.2 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x >= -440 && x <= 440) {
      if (currentY !== undefined && (currentY < 5.5 || currentY > 13.5)) {
        return 0;
      }
      return 11.2;
    }
  }

  // 5. Kuril Interchange Flyover (Z = -315, width 14.2m, Y = 11.2m)
  if (Math.abs(z - (-315)) <= 7.1) {
    if (x >= 280 && x < 360) {
      const t = (x - 280) / 80;
      const rampElev = 11.2 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x > 720 && x <= 800) {
      const t = 1 - (x - 720) / 80;
      const rampElev = 11.2 * Math.max(0, Math.min(1, t));
      if (currentY !== undefined && currentY < 2.0 && rampElev > 2.5) {
        return 0;
      }
      if (currentY === undefined || Math.abs(currentY - rampElev) <= 2.8 || rampElev <= 0.6) {
        return rampElev;
      }
    }
    if (x >= 360 && x <= 720) {
      if (currentY !== undefined && currentY < 5.5) {
        if (x < 525 || x > 655) {
          return 0;
        }
      } else {
        return 11.2;
      }
    }
  }

  // 6. Buriganga River Bridges with Continuous Smooth Approach Ramps (Z: 265 to 480)
  if (z >= 265 && z <= 480) {
    if (Math.abs(x - 0) <= 12.5) {
      if (z < 285 || z > 460) return 0.08;
      const t = (z - 285) / 175;
      return 0.08 + 2.75 * Math.sin(t * Math.PI);
    }

    const bRoad = ctx.nsRoads.find(
      (r) => r.zMax >= 450 && r.zMin <= 300 && Math.abs(x - r.x) <= r.width / 2 + 2.0
    );
    if (bRoad) {
      if (z >= 265 && z < 285) {
        const t = (z - 265) / 20;
        return 0.08 + t * 0.92;
      }
      if (z >= 285 && z <= 460) {
        return 1.0;
      }
      if (z > 460 && z <= 480) {
        const t = (480 - z) / 20;
        return 0.08 + t * 0.92;
      }
    }
  }

  // 7. Buriganga River Promenade & Sadarghat Embankment
  if (z >= 288 && z <= 303.5 && Math.abs(x) <= 950) {
    const onBridgeRoad = ctx.nsRoads.some(
      (r) => r.zMax >= 310 && r.zMin <= 290 && Math.abs(x - r.x) <= r.width / 2 + 2.5
    );
    if (onBridgeRoad) {
      if (Math.abs(x) <= 12.5) {
        const t = (z - 285) / 175;
        return 0.08 + 2.75 * Math.sin(t * Math.PI);
      }
      return 1.0;
    }
    return 0.16;
  }

  // 8. Hatirjheel Tied-Arch Bridge Deck (X: 210..230, Z: -52.5..42.5 at Y = 0.50m)
  if (x >= 210 && x <= 230 && z >= -57.5 && z <= 47.5) {
    if (z < -52.5) {
      const t = (z - (-57.5)) / 5;
      return 0.08 + t * 0.42;
    }
    if (z > 42.5) {
      const t = (47.5 - z) / 5;
      return 0.08 + t * 0.42;
    }
    return 0.50;
  }

  // 9. Balu River 8-Lane Suspension Bridge Deck at Purbachal (X: 535..645, Z: -326..-304 at Y = 0.80m)
  if (Math.abs(z - (-315)) <= 11.0 && x >= 525 && x <= 655 && (currentY === undefined || currentY < 5.5)) {
    if (x < 535) {
      const t = (x - 525) / 10;
      return 0.08 + t * 0.72;
    }
    if (x > 645) {
      const t = (655 - x) / 10;
      return 0.08 + t * 0.72;
    }
    return 0.80;
  }

  // 10. Elevated Monument & Exhibition Plazas
  if (x >= -45.5 && x <= -30.5 && z >= 53 && z <= 63) {
    return 0.80;
  }
  if (x >= 770 && x <= 830 && z >= -243 && z <= -213) {
    return 0.16;
  }

  return 0;
}
