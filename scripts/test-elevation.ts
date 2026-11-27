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
