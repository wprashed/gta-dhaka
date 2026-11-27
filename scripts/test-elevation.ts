import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRoadElevation } from '../src/engine/physics/roadElevation.ts';
import type { RoadElevationContext } from '../src/engine/physics/roadElevation.ts';

const baseCtx: RoadElevationContext = {
  jfpCenter: { x: 520, z: -385 },
  nsRoads: [
    { x: 0, width: 22, zMin: -1400, zMax: 800 },
    { x: 220, width: 18, zMin: -1400, zMax: 800 },
  ],
  metroStationInteriors: [
    {
      concourseMinX: -17.6,
      concourseMaxX: -3.4,
      concourseMinZ: -15 - 28.5,
      concourseMaxZ: -15 + 28.5,
      concourseY: 8.96,
      platMinX: -17.8,
      platMaxX: -3.3,
      platMinZ: -15 - 30.5,
      platMaxZ: -15 + 30.5,
      platY: 13.3,
      inX1: -15.75,
      inZ1: -15 - 8.5,
      inY1: 8.96,
      inX2: -15.75,
      inZ2: -15 + 1.5,
      inY2: 13.3,
      inHalfW: 1.0,
    },
  ],
  metroEscalators: [],
};

test('Jamuna Future Park multi-floor slabs, escalators, and atrium void', () => {
  // Ground floor outside atrium void
  assert.equal(evaluateRoadElevation(478, -413, 0.25, baseCtx), 0.25);
  // First floor outside void
  assert.equal(evaluateRoadElevation(478, -413, 5.4, baseCtx), 5.4);
  // Second floor outside void
  assert.equal(evaluateRoadElevation(478, -413, 10.55, baseCtx), 10.55);
  // Atrium void center always resolves down to ground fountain base
  assert.equal(evaluateRoadElevation(520, -385, 5.4, baseCtx), 0.25);
  // West escalator midpoint slopes midway between 0.25 and 5.40
  const midEscY = evaluateRoadElevation(520 - 22.5, -385, 2.825, baseCtx);
  assert.ok(Math.abs(midEscY - 2.825) < 0.05);
});

test('Metro station platform never snaps down onto interior staircase', () => {
  // Standing on Farmgate upper platform right alongside/over middle of stairwell
  const platY = evaluateRoadElevation(-15.75, -18.5, 13.3, baseCtx);
  assert.equal(platY, 13.3);
  // Climbing middle of interior staircase from concourse -> platform transitions smoothly
  const climbY = evaluateRoadElevation(-15.75, -18.5, 11.13, baseCtx);
  assert.ok(Math.abs(climbY - 11.13) < 0.05);
});

test('Bridges and flyovers keep ground streets separate from overhead decks', () => {
  // Mohakhali flyover top vs ground beneath
  assert.equal(evaluateRoadElevation(0, -175, 9.6, baseCtx), 9.6);
  assert.equal(evaluateRoadElevation(0, -175, 0, baseCtx), 0);
  // Mayor Hanif flyover top vs ramp & ground beneath
  assert.equal(evaluateRoadElevation(0, 240, 11.2, baseCtx), 11.2);
  assert.equal(evaluateRoadElevation(0, 240, 0, baseCtx), 0);
  // Balu Bridge under Kuril Interchange
  assert.equal(evaluateRoadElevation(590, -315, 0.8, baseCtx), 0.8);
  assert.equal(evaluateRoadElevation(590, -315, 11.2, baseCtx), 11.2);
  // First Buriganga Bridge center arch peak
  const buriPeak = evaluateRoadElevation(0, 372.5, 1.0, baseCtx);
  assert.ok(buriPeak > 2.8 && buriPeak < 2.85);
  // Hatirjheel Bridge center deck
  assert.equal(evaluateRoadElevation(220, 0, 0.5, baseCtx), 0.5);
});

function assertSmoothRampSweep(
  label: string,
  points: Array<{ x: number; z: number }>,
  expectedStartY: number,
  expectedEndY: number,
  seedY?: number,
  maxStepDelta = 0.42
) {
  let prevY = evaluateRoadElevation(points[0].x, points[0].z, seedY ?? expectedStartY, baseCtx);
  assert.ok(
    Math.abs(prevY - expectedStartY) <= 0.45,
    `${label} start elevation expected ~${expectedStartY}, got ${prevY}`
  );
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const y = evaluateRoadElevation(p.x, p.z, prevY, baseCtx);
    const delta = Math.abs(y - prevY);
    assert.ok(
      delta <= maxStepDelta,
      `${label} discontinuity at step ${i} (${p.x},${p.z}): ${prevY.toFixed(3)} -> ${y.toFixed(3)}`
    );
    prevY = y;
  }
  assert.ok(
    Math.abs(prevY - expectedEndY) <= 0.45,
    `${label} end elevation expected ~${expectedEndY}, got ${prevY}`
  );
}

test('All elevated flyover & bridge ramps are continuous with zero cliff ledges', () => {
  // Farmgate Elevated Expressway north & south ramps (Z: -160..-40 & 40..160 at X = 18)
  const expNorth: Array<{ x: number; z: number }> = [];
  for (let z = -160; z <= -40; z += 2) expNorth.push({ x: 18, z });
  assertSmoothRampSweep('Expressway North Ramp', expNorth, 0, 16.2, 0.2);

  const expSouth: Array<{ x: number; z: number }> = [];
  for (let z = 40; z <= 160; z += 2) expSouth.push({ x: 18, z });
  assertSmoothRampSweep('Expressway South Ramp', expSouth, 16.2, 0, 16.2);

  // Mohakhali Flyover west & east ramps (X: -340..-240 & 240..340 at Z = -175)
  const mohaW: Array<{ x: number; z: number }> = [];
  for (let x = -340; x <= -240; x += 2) mohaW.push({ x, z: -175 });
  assertSmoothRampSweep('Mohakhali West Ramp', mohaW, 0, 9.6, 0.2);

  const mohaE: Array<{ x: number; z: number }> = [];
  for (let x = 240; x <= 340; x += 2) mohaE.push({ x, z: -175 });
  assertSmoothRampSweep('Mohakhali East Ramp', mohaE, 9.6, 0, 9.6);

  // Mayor Hanif Flyover west & east ramps (X: -560..-440 & 440..560 at Z = 240)
  const hanifW: Array<{ x: number; z: number }> = [];
  for (let x = -560; x <= -440; x += 2) hanifW.push({ x, z: 240 });
  assertSmoothRampSweep('Mayor Hanif West Ramp', hanifW, 0, 11.2, 0.2);

  const hanifE: Array<{ x: number; z: number }> = [];
  for (let x = 440; x <= 560; x += 2) hanifE.push({ x, z: 240 });
  assertSmoothRampSweep('Mayor Hanif East Ramp', hanifE, 11.2, 0, 11.2);

  // Kuril Flyover west & east ramps (X: 280..360 & 720..800 at Z = -315)
  const kurilW: Array<{ x: number; z: number }> = [];
  for (let x = 280; x <= 360; x += 2) kurilW.push({ x, z: -315 });
  assertSmoothRampSweep('Kuril West Ramp', kurilW, 0, 11.2, 0.2);

  const kurilE: Array<{ x: number; z: number }> = [];
  for (let x = 720; x <= 800; x += 2) kurilE.push({ x, z: -315 });
  assertSmoothRampSweep('Kuril East Ramp', kurilE, 11.2, 0, 11.2);

  // Buriganga 1st Bridge arch deck & arterial bridge ramps
  const buriArch: Array<{ x: number; z: number }> = [];
  for (let z = 285; z <= 460; z += 2.5) buriArch.push({ x: 0, z });
  assertSmoothRampSweep('Buriganga 1st Bridge Arch', buriArch, 0.08, 0.08, 0.08);

  const buriGulshan: Array<{ x: number; z: number }> = [];
  for (let z = 265; z <= 480; z += 2) buriGulshan.push({ x: 220, z });
  assertSmoothRampSweep('Buriganga Arterial Bridge (X=220)', buriGulshan, 0.08, 0.08, 0.08);

  // Hatirjheel Bridge & Balu Bridge continuous ramps
  const hatir: Array<{ x: number; z: number }> = [];
  for (let z = -57.5; z <= 47.5; z += 1.5) hatir.push({ x: 220, z });
  assertSmoothRampSweep('Hatirjheel Bridge', hatir, 0.08, 0.08, 0.08);

  const balu: Array<{ x: number; z: number }> = [];
  for (let x = 525; x <= 655; x += 2) balu.push({ x, z: -315 });
  assertSmoothRampSweep('Balu River Bridge', balu, 0.08, 0.08, 0.08);

  // Staying on the elevated Expressway main deck above the ramp stays flat at 16.2m
  assert.equal(evaluateRoadElevation(18, -100, 16.2, baseCtx), 16.2);
});

test('Foot Over Bridge stairs ascend smoothly without snapping down and stay separate from overhead ground/decks', () => {
  // Farmgate FOB side staircase (halfSpan=13.5, x=14.65, z: -44.95 -> -53.35, ~0.71m rise per 1m run)
  const fobStair: Array<{ x: number; z: number }> = [];
  for (let z = -45.0; z >= -53.3; z -= 0.7) {
    fobStair.push({ x: 14.65, z });
  }
  fobStair.push({ x: 14.65, z: -53.35 });
  assertSmoothRampSweep('Farmgate FOB West Stair', fobStair, 0.42, 6.38, 0.4, 0.55);
  // Crossing deck stays at 6.40m while driving underneath on ground stays at 0m
  assert.equal(evaluateRoadElevation(0, -55, 6.4, baseCtx), 6.4);
  assert.equal(evaluateRoadElevation(0, -55, 0, baseCtx), 0);
});

test('MRT concourse, street floor, and Expressway deck remain isolated vertically', () => {
  // Standing on street beneath Farmgate concourse resolves to 0m, not 8.96m concourse
  assert.equal(evaluateRoadElevation(-10.5, -15, 0, baseCtx), 0);
  // Standing inside Farmgate concourse resolves cleanly to 8.96m
  assert.equal(evaluateRoadElevation(-10.5, -15, 8.96, baseCtx), 8.96);
});
