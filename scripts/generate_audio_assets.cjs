const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeWav(filename, sampleRate, samples) {
  const channels = 1;
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), offset);
    offset += 2;
  }

  const fullPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(fullPath, buffer);
  console.log(`Generated: ${filename} (${samples.length} samples, ${(samples.length / sampleRate).toFixed(2)}s)`);
}

const SR = 44100;

// Bandpass/comb noise generator for realistic shoe impact & mechanical friction
function whiteNoise() {
  return Math.random() * 2 - 1;
}

// --------------------------------------------------------------------------
// 1. FOOTSTEPS: Authentic shoe impact on asphalt/concrete
// --------------------------------------------------------------------------
function generateFootstep(isRun = false, isRight = false, isLand = false) {
  const duration = isLand ? 0.30 : isRun ? 0.15 : 0.18;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  const freqMult = isRight ? 1.05 : 0.95;
  const thudFreq = (isLand ? 60 : isRun ? 95 : 82) * freqMult;
  const crunchFreq = (isLand ? 1200 : isRun ? 2200 : 1800) * freqMult;
  const impactDecay = isLand ? 0.045 : isRun ? 0.022 : 0.028;
  const scuffDecay = isLand ? 0.12 : isRun ? 0.055 : 0.07;

  let lastNoise = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;

    // 1. Heel-strike shockwave (low frequency body weight thud)
    const thud = Math.sin(2 * Math.PI * thudFreq * (1 + 0.8 * Math.exp(-t / 0.012)) * t) * Math.exp(-t / impactDecay);

    // 2. Sole-asphalt rubber friction & sand grit crunch
    const rawN = whiteNoise();
    // One-pole lowpass/bandpass smoothing
    lastNoise = lastNoise * 0.4 + rawN * 0.6;
    const gritTone = Math.sin(2 * Math.PI * crunchFreq * t);
    const crunch = lastNoise * (0.6 + 0.4 * gritTone) * Math.exp(-t / scuffDecay);

    // 3. Subtle shoe body slap (mid snap ~450 Hz)
    const snap = Math.sin(2 * Math.PI * 450 * freqMult * t) * Math.exp(-t / 0.016);

    let val = 0;
    if (isLand) {
      val = thud * 0.75 + crunch * 0.45 + snap * 0.35;
    } else if (isRun) {
      val = thud * 0.60 + crunch * 0.50 + snap * 0.40;
    } else {
      val = thud * 0.50 + crunch * 0.35 + snap * 0.25;
    }

    samples[i] = val;
  }
  return samples;
}

writeWav('footstep_walk_1.wav', SR, generateFootstep(false, false));
writeWav('footstep_walk_2.wav', SR, generateFootstep(false, true));
writeWav('footstep_run_1.wav', SR, generateFootstep(true, false));
writeWav('footstep_run_2.wav', SR, generateFootstep(true, true));
writeWav('footstep_land.wav', SR, generateFootstep(false, false, true));

// --------------------------------------------------------------------------
// 2. MOTORCYCLE (150cc 4-stroke Bajaj Pulsar / Yamaha FZ)
// --------------------------------------------------------------------------
function generateMotorcycle(rpm) {
  const duration = 1.0;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  // 4-stroke fires once every 2 revolutions:
  const fireRate = (rpm / 60) / 2; // Hz (e.g. 10 Hz at 1200 RPM, 35 Hz at 4200 RPM)
  const periodSamples = SR / fireRate;
  const numPulses = Math.round(duration * fireRate);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const phaseInPulse = (i % periodSamples) / periodSamples;
    const timeInPulse = phaseInPulse * (1 / fireRate);

    // Exhaust pulse: Sharp pressure compression followed by exhaust pipe chamber ring
    const pipeRes = 175; // Hz pipe resonance
    const exhaustWave = Math.sin(2 * Math.PI * pipeRes * timeInPulse) * Math.exp(-timeInPulse / 0.025);
    const harmonic2 = 0.55 * Math.sin(2 * Math.PI * pipeRes * 2 * timeInPulse) * Math.exp(-timeInPulse / 0.018);
    const harmonic3 = 0.35 * Math.sin(2 * Math.PI * pipeRes * 3 * timeInPulse) * Math.exp(-timeInPulse / 0.012);
    const exhaustChamber = (exhaustWave + harmonic2 + harmonic3) * (timeInPulse < 0.05 ? 1 : Math.exp(-(timeInPulse - 0.05) / 0.02));

    // Crankcase sub-rumble
    const crankFreq = rpm / 60; // 20 Hz or 70 Hz
    const sub = 0.4 * Math.sin(2 * Math.PI * crankFreq * t);

    // Valve train mechanical sizzle
    const sizzle = 0.12 * whiteNoise() * Math.exp(-timeInPulse / 0.008);

    samples[i] = (exhaustChamber * 0.7 + sub * 0.35 + sizzle) * 0.85;
  }
  return samples;
}

writeWav('engine_motorcycle_idle.wav', SR, generateMotorcycle(1200));
writeWav('engine_motorcycle_rev.wav', SR, generateMotorcycle(4200));

// --------------------------------------------------------------------------
// 3. CNG AUTO-RICKSHAW (2-stroke 175cc Bajaj / Piaggio with expansion chamber)
// --------------------------------------------------------------------------
function generateCng(rpm) {
  const duration = 1.0;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  // 2-stroke fires EVERY revolution:
  const fireRate = rpm / 60; // 15 Hz at 900 RPM idle, 55 Hz at 3300 RPM
  const periodSamples = SR / fireRate;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const phaseInPulse = (i % periodSamples) / periodSamples;
    const timeInPulse = phaseInPulse * (1 / fireRate);

    // 2-stroke metallic "putt-putt" pop with iconic expansion chamber ring (~980 Hz)
    const pop = (timeInPulse < 0.003 ? (timeInPulse / 0.003) : Math.exp(-(timeInPulse - 0.003) / 0.012)) * 2 - 1;
    const chamberRing = Math.sin(2 * Math.PI * 980 * timeInPulse) * Math.exp(-timeInPulse / 0.022);
    const chamberRing2 = 0.4 * Math.sin(2 * Math.PI * 1840 * timeInPulse) * Math.exp(-timeInPulse / 0.014);

    // Characteristic 2-stroke sputter
    const sputter = 0.25 * whiteNoise() * Math.exp(-timeInPulse / 0.007);
    const lowThud = 0.3 * Math.sin(2 * Math.PI * (rpm / 60) * t);

    samples[i] = (pop * 0.45 + (chamberRing + chamberRing2) * 0.45 + sputter * 0.2 + lowThud) * 0.82;
  }
  return samples;
}

writeWav('engine_cng_idle.wav', SR, generateCng(900));
writeWav('engine_cng_rev.wav', SR, generateCng(3300));

// --------------------------------------------------------------------------
// 4. CAR ENGINE (Gulshan Executive Sedan & DMP Patrol Car)
// --------------------------------------------------------------------------
function generateCar(rpm) {
  const duration = 1.0;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  const firingRate = (rpm / 60) * 2; // 4-cylinder fires 2 per rev

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    // Multi-harmonic engine drone
    const f0 = firingRate;
    const h1 = Math.sin(2 * Math.PI * f0 * t);
    const h2 = 0.65 * Math.sin(2 * Math.PI * (f0 * 2) * t);
    const h3 = 0.38 * Math.sin(2 * Math.PI * (f0 * 3) * t);
    const h4 = 0.22 * Math.sin(2 * Math.PI * (f0 * 4) * t);

    // Exhaust muffler low rumble
    const rumble = 0.35 * Math.sin(2 * Math.PI * (rpm / 60) * t);

    // Intake airflow whisper
    const air = 0.08 * whiteNoise();

    samples[i] = (h1 + h2 + h3 + h4 + rumble + air) * 0.45;
  }
  return samples;
}

writeWav('engine_car_idle.wav', SR, generateCar(840));
writeWav('engine_car_rev.wav', SR, generateCar(3100));

// --------------------------------------------------------------------------
// 5. HEAVY DIESEL BUS (BRTC Tata / Ashok Leyland 6-cylinder)
// --------------------------------------------------------------------------
function generateBus(rpm) {
  const duration = 1.0;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  const firingRate = (rpm / 60) * 3; // 6-cylinder 4-stroke fires 3 times per rev
  const periodSamples = SR / firingRate;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const phaseInPulse = (i % periodSamples) / periodSamples;
    const timeInPulse = phaseInPulse * (1 / firingRate);

    // Heavy diesel knock: Direct high-pressure fuel injection impulse (~2100 Hz sharp ping)
    const dieselKnock = Math.sin(2 * Math.PI * 2150 * timeInPulse) * Math.exp(-timeInPulse / 0.005);

    // Deep sub-chassis diesel rumble (35-65 Hz)
    const bassRumble = Math.sin(2 * Math.PI * (rpm / 60) * t) + 0.6 * Math.sin(2 * Math.PI * firingRate * t);

    // Turbocharger spool whistle (swells with RPM)
    const isRev = rpm > 1200;
    const turboFreq = 2250 + (isRev ? 350 : 0);
    const turboWhistle = isRev ? (0.22 * Math.sin(2 * Math.PI * turboFreq * t)) : 0.04 * Math.sin(2 * Math.PI * 1800 * t);

    samples[i] = (dieselKnock * 0.35 + bassRumble * 0.55 + turboWhistle) * 0.75;
  }
  return samples;
}

writeWav('engine_bus_idle.wav', SR, generateBus(650));
writeWav('engine_bus_rev.wav', SR, generateBus(1850));

// Pneumatic air brake release hiss ("pssshh-chk!")
function generateBusAirBrake() {
  const duration = 0.55;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  let last = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const raw = whiteNoise();
    // High-pressure hiss envelope
    const env = t < 0.04 ? (t / 0.04) : Math.exp(-(t - 0.04) / 0.14);
    // Bandpass around 3200 Hz
    last = last * 0.25 + raw * 0.75;
    const hiss = last * Math.sin(2 * Math.PI * 3400 * t) * env;

    // Terminal mechanical valve click at t=0.22s
    let click = 0;
    if (t > 0.20 && t < 0.25) {
      const tc = t - 0.20;
      click = Math.sin(2 * Math.PI * 850 * tc) * Math.exp(-tc / 0.008);
    }

    samples[i] = hiss * 0.75 + click * 0.45;
  }
  return samples;
}
writeWav('bus_air_brake.wav', SR, generateBusAirBrake());

// --------------------------------------------------------------------------
// 6. CYCLE RICKSHAW: Chain clatter & authentic double brass bell ("Tring! Tring!")
// --------------------------------------------------------------------------
function generateRickshawChain() {
  const duration = 1.0;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  const clickRate = 24; // 24 sprocket teeth clicks per second
  const period = SR / clickRate;

  for (let i = 0; i < numSamples; i++) {
    const phase = (i % period) / period;
    const tInClick = phase / clickRate;
    // Metal roller tooth engagement click
    const click = Math.sin(2 * Math.PI * 1450 * tInClick) * Math.exp(-tInClick / 0.007);
    const frameHum = 0.15 * Math.sin(2 * Math.PI * 180 * (i / SR));
    samples[i] = (click * 0.8 + frameHum) * 0.6;
  }
  return samples;
}
writeWav('engine_rickshaw_chain.wav', SR, generateRickshawChain());

function generateRickshawBell() {
  const duration = 0.65;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  // Two chime strikes: t=0 and t=0.17
  const strikes = [0, 0.17];
  const f1 = 1760; // A6
  const f2 = 2349; // D7 (harmonic shimmer)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    let val = 0;
    for (const st of strikes) {
      if (t >= st) {
        const dt = t - st;
        const chime = (Math.sin(2 * Math.PI * f1 * dt) * 0.65 + Math.sin(2 * Math.PI * f2 * dt) * 0.45) * Math.exp(-dt / 0.16);
        val += chime;
      }
    }
    samples[i] = Math.max(-1, Math.min(1, val * 0.75));
  }
  return samples;
}
writeWav('horn_rickshaw_bell.wav', SR, generateRickshawBell());

// --------------------------------------------------------------------------
// 7. HORNS: CNG electric horn, Bus airhorn, Car horn, Police siren
// --------------------------------------------------------------------------
function generateCngHorn() {
  const duration = 0.42;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    // Iconic harsh Dhaka CNG electric buzzer (415 Hz + 520 Hz square-like harmonics)
    const env = t < 0.02 ? (t / 0.02) : t > 0.38 ? (0.42 - t) / 0.04 : 1.0;
    const w1 = Math.sign(Math.sin(2 * Math.PI * 415 * t));
    const w2 = Math.sign(Math.sin(2 * Math.PI * 520 * t));
    samples[i] = (w1 * 0.5 + w2 * 0.5) * env * 0.55;
  }
  return samples;
}
writeWav('horn_cng.wav', SR, generateCngHorn());

function generateBusAirHorn() {
  const duration = 0.72;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const env = t < 0.04 ? (t / 0.04) : t > 0.64 ? (0.72 - t) / 0.08 : 1.0;
    // Powerful dual-trumpet air blast (220 Hz + 311 Hz)
    const t1 = Math.sin(2 * Math.PI * 220 * t) + 0.4 * Math.sin(2 * Math.PI * 440 * t);
    const t2 = Math.sin(2 * Math.PI * 311 * t) + 0.4 * Math.sin(2 * Math.PI * 622 * t);
    samples[i] = (t1 * 0.55 + t2 * 0.55) * env * 0.75;
  }
  return samples;
}
writeWav('horn_bus_air.wav', SR, generateBusAirHorn());

function generateCarHorn() {
  const duration = 0.38;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    const env = t < 0.02 ? (t / 0.02) : t > 0.34 ? (0.38 - t) / 0.04 : 1.0;
    const c1 = Math.sin(2 * Math.PI * 349 * t);
    const c2 = Math.sin(2 * Math.PI * 440 * t);
    samples[i] = (c1 * 0.5 + c2 * 0.5) * env * 0.65;
  }
  return samples;
}
writeWav('horn_car.wav', SR, generateCarHorn());

function generatePoliceSiren() {
  const duration = 1.4;
  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    // Oscillating wail: 680 Hz to 1180 Hz over 1.4s
    const sweep = Math.sin(2 * Math.PI * (1 / 1.4) * t);
    const freq = 930 + sweep * 250;
    // Phase integration for accurate frequency modulation
    const phase = 2 * Math.PI * (930 * t - (250 * 1.4 / (2 * Math.PI)) * Math.cos(2 * Math.PI * (1 / 1.4) * t));
    const tone = Math.sin(phase) + 0.35 * Math.sin(phase * 2);
    samples[i] = tone * 0.65;
  }
  return samples;
}
writeWav('horn_siren.wav', SR, generatePoliceSiren());

console.log('All audio assets generated successfully in public/audio!');
