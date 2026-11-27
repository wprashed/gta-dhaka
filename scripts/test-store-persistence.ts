import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

// Minimal browser storage & window shims for Zustand store persistence testing in Node
const memoryStorage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, val: string) => {
    memoryStorage.set(key, String(val));
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
  clear: () => {
    memoryStorage.clear();
  },
};
(globalThis as Record<string, unknown>).window = globalThis;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/store/useGameStore.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const encoded = Buffer.from(built.outputFiles[0].text, 'utf8').toString('base64');
const { useGameStore } = await import(`data:text/javascript;base64,${encoded}`);

test('Initial radioStation is off and synced with engine default', () => {
  const s = useGameStore.getState();
  assert.equal(s.radioStation, 'off');
});

test('spendTaka deducts funds when affordable and fails cleanly when insufficient', () => {
  useGameStore.getState().startNewGame();
  const initialTaka = useGameStore.getState().taka;
  assert.equal(useGameStore.getState().spendTaka(200, 'Test Meal', 'টেস্ট খাবার'), true);
  assert.equal(useGameStore.getState().taka, initialTaka - 200);

  // Attempting to spend more than remaining balance returns false without mutation
  assert.equal(useGameStore.getState().spendTaka(999999, 'Luxury Car', 'বিলাসবহুল গাড়ি'), false);
  assert.equal(useGameStore.getState().taka, initialTaka - 200);
});

test('saveGameToStorage and continueGame preserve playerY, weather, timeOfDay, and completed missions', () => {
  memoryStorage.clear();
  const s = useGameStore.getState();
  s.startNewGame();
  s.setWeather('monsoon_rain');
  s.setTimeOfDay(22.25);
  useGameStore.setState({
    playerX: 520,
    playerY: 10.55,
    playerZ: -385,
    taka: 4250,
    completedMissionIds: ['m1_back_to_dhaka', 'm2_cng_chase'],
    radioStation: 'gully_beat',
  });

  useGameStore.getState().saveGameToStorage();
  assert.equal(useGameStore.getState().hasSavedGame(), true);

  // Reset store state cleanly before restoring saved game
  useGameStore.getState().startNewGame();
  assert.equal(useGameStore.getState().taka, 1850);

  useGameStore.getState().continueGame();
  const restored = useGameStore.getState();
  assert.equal(restored.playerY, 10.55);
  assert.equal(restored.teleportRequest?.x, 520);
  assert.equal(restored.teleportRequest?.y, 10.55);
  assert.equal(restored.teleportRequest?.z, -385);
  assert.equal(restored.weather, 'monsoon_rain');
  assert.equal(restored.timeOfDay, 22.25);
  assert.equal(restored.taka, 4250);
  assert.deepEqual(restored.completedMissionIds, ['m1_back_to_dhaka', 'm2_cng_chase']);
  // Loaded on foot -> radio HUD stays 'off' until entering a vehicle
  assert.equal(restored.radioStation, 'off');
});

test('triggerWasted and triggerBusted timers cancel on startNewGame and block repeated damage', async () => {
  const s = useGameStore.getState();
  s.startNewGame();
  s.triggerWasted();
  assert.equal(useGameStore.getState().isWasted, true);

  // Calling damagePlayer while wasted should not corrupt state or lower taka prematurely
  useGameStore.getState().damagePlayer(50);
  assert.equal(useGameStore.getState().isWasted, true);

  // Starting a New Game cancels pending DMCH discharge timer cleanly
  useGameStore.getState().startNewGame();
  assert.equal(useGameStore.getState().isWasted, false);
  assert.equal(useGameStore.getState().taka, 1850);

  // Same guarantee for triggerBusted
  useGameStore.getState().triggerBusted();
  assert.equal(useGameStore.getState().isBusted, true);
  useGameStore.getState().startNewGame();
  assert.equal(useGameStore.getState().isBusted, false);
  assert.equal(useGameStore.getState().taka, 1850);
});
