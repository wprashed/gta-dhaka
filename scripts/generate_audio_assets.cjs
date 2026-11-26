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
  // Police case sound / siren deleted per user request
  const duration = 0.05;
  const numSamples = Math.floor(duration * SR);
  return new Float32Array(numSamples);
}
writeWav('horn_siren.wav', SR, generatePoliceSiren());


// --------------------------------------------------------------------------
// 7. REALISTIC DHAKA URBAN ATMOSPHERE (12s SEAMLESS LOOP)
// Clean, natural atmospheric soundscape: gentle open-air city breeze,
// soft distant road texture, and natural acoustic depth.
// Absolutely ZERO repetitive beeps, fake horns, or monotone drones.
// --------------------------------------------------------------------------
function generateDhakaTrafficAmbience() {
  const duration = 12.0;
  const numSamples = Math.floor(duration * SR);
  const raw = new Float32Array(numSamples);

  let lp1 = 0;
  let lp2 = 0;
  let lp3 = 0;
  let rumbleLp = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;

    // 1. Gentle natural city air movement & atmospheric wind wash (3-pole lowpass)
    const wn = whiteNoise();
    lp1 = lp1 * 0.96 + wn * 0.04;
    lp2 = lp2 * 0.94 + lp1 * 0.06;
    lp3 = lp3 * 0.92 + lp2 * 0.08;

    // Slow, organic breathing envelope of open-air wind (undulating gently over 12 seconds)
    const breezeMod = 0.75 + 0.25 * Math.sin(2 * Math.PI * (1 / 12.0) * t + 0.4) + 0.12 * Math.sin(2 * Math.PI * (2 / 12.0) * t + 1.2);
    const airWash = lp3 * breezeMod * 0.42;

    // 2. Deep, warm distant urban presence (ultra-low 36-45 Hz sub rumble, smooth and non-intrusive)
    const subNoise = whiteNoise();
    rumbleLp = rumbleLp * 0.985 + subNoise * 0.015;
    const subRumble = rumbleLp * 0.28;

    // 3. Subtle distant tire roll on smooth asphalt (soft continuous whisper)
    const tireWhisper = (lp2 - lp3) * 0.18;

    raw[i] = airWash + subRumble + tireWhisper;
  }

  // Seamless crossfade: blend first 0.8s with last 0.8s for flawless loop
  const fadeSamples = Math.floor(0.8 * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    if (i < fadeSamples) {
      const alpha = i / fadeSamples;
      const tailIdx = numSamples - fadeSamples + i;
      samples[i] = raw[i] * alpha + raw[tailIdx] * (1 - alpha);
    } else {
      samples[i] = raw[i];
    }
  }

  return samples;
}
writeWav('dhaka_traffic_bg.wav', SR, generateDhakaTrafficAmbience());

// --------------------------------------------------------------------------
// 8. DHAKA STREET CROWD & MARKET CHATTER (8s SEAMLESS LOOP)
// Multi-speaker South Asian conversational babble, tea stall whispers,
// pedestrian greetings, and tea cup spoon clinking.
// --------------------------------------------------------------------------
function generateDhakaCrowdChatter() {
  const duration = 8.0;
  const numSamples = Math.floor(duration * SR);
  const raw = new Float32Array(numSamples);

  // Formant vocal tract frequencies for speech babble:
  // F1 (male/female vowel vowels): 350 - 750 Hz
  // F2 (consonant transitions): 1100 - 2100 Hz
  // F3 (presence): 2600 - 3200 Hz
  const speakers = [
    { baseF0: 125, sylRate: 4.2, f1: 520, f2: 1400, amp: 0.18, phase: 0.2 },
    { baseF0: 160, sylRate: 3.8, f1: 650, f2: 1800, amp: 0.16, phase: 1.5 },
    { baseF0: 210, sylRate: 4.8, f1: 420, f2: 1950, amp: 0.15, phase: 3.1 },
    { baseF0: 110, sylRate: 3.4, f1: 580, f2: 1250, amp: 0.20, phase: 4.6 },
    { baseF0: 180, sylRate: 4.5, f1: 480, f2: 1650, amp: 0.14, phase: 5.8 },
    { baseF0: 140, sylRate: 4.0, f1: 720, f2: 1550, amp: 0.17, phase: 2.7 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    let babble = 0;

    for (const spk of speakers) {
      // Syllable rhythmic cadence: bursts of vowels modulated by consonants
      const sylPhase = 2 * Math.PI * spk.sylRate * t + spk.phase;
      const sylEnv = Math.max(0, Math.sin(sylPhase)) ** 3;

      // Voicing pulse with pitch intonation
      const f0 = spk.baseF0 * (1 + 0.12 * Math.sin(2 * Math.PI * 0.8 * t + spk.phase));
      const voiceWave =
        Math.sin(2 * Math.PI * f0 * t) +
        0.6 * Math.sin(2 * Math.PI * f0 * 2 * t) +
        0.35 * Math.sin(2 * Math.PI * f0 * 3 * t);

      // Formants
      const formant1 = Math.sin(2 * Math.PI * spk.f1 * t);
      const formant2 = Math.sin(2 * Math.PI * spk.f2 * t);
      const speechTone = voiceWave * (formant1 * 0.6 + formant2 * 0.4);

      // Whispered fricative noise (s, sh, kh, ch consonants)
      const fricative = (whiteNoise() * 0.4) * (Math.sin(sylPhase * 2) > 0.7 ? 1 : 0.1);

      babble += (speechTone * 0.8 + fricative * 0.2) * sylEnv * spk.amp;
    }

    // Tong tea stall ceramic / glass tea cup spoon clink accents (t=1.8s, t=4.4s, t=6.7s)
    let teaClink = 0;
    for (const clinkTime of [1.8, 4.4, 6.7]) {
      const dt = t - clinkTime;
      if (dt >= 0 && dt < 0.22) {
        teaClink += 0.14 * Math.sin(2 * Math.PI * 3400 * dt) * Math.exp(-dt / 0.035);
        teaClink += 0.09 * Math.sin(2 * Math.PI * 4750 * dt) * Math.exp(-dt / 0.025);
      }
    }

    raw[i] = babble * 0.75 + teaClink * 0.25;
  }

  // Seamless crossfade for continuous loop
  const fadeSamples = Math.floor(0.5 * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    if (i < fadeSamples) {
      const alpha = i / fadeSamples;
      const tailIdx = numSamples - fadeSamples + i;
      samples[i] = raw[i] * alpha + raw[tailIdx] * (1 - alpha);
    } else {
      samples[i] = raw[i];
    }
  }

  return samples;
}
writeWav("dhaka_crowd_chatter.wav", SR, generateDhakaCrowdChatter());

// --------------------------------------------------------------------------
// 9. BANGLA STREET VENDOR & PEDESTRIAN CALLOUTS
// High-fidelity speech and hawker phrases with Bengali prosody & acoustic flair
// --------------------------------------------------------------------------
function generateVoiceCallout(type) {
  let duration = 2.4;
  if (type === "conductor") duration = 2.8;
  else if (type === "vendor") duration = 2.5;
  else if (type === "rickshaw") duration = 2.0;

  const numSamples = Math.floor(duration * SR);
  const samples = new Float32Array(numSamples);

  // Syllabic pattern for specific authentic Bengali calls
  // e.g. "Cha go-rom cha!" or "Farm-gate! Shah-bagh! Gulis-tan!"
  const patterns = {
    vendor: [
      // "চা... গরম চা!" (Cha... gorom cha!)
      { start: 0.10, dur: 0.45, f0: 175, f1: 750, f2: 1250, text: "cha" },
      { start: 0.70, dur: 0.22, f0: 195, f1: 520, f2: 1100, text: "go" },
      { start: 0.95, dur: 0.35, f0: 220, f1: 580, f2: 1350, text: "rom" },
      { start: 1.45, dur: 0.55, f0: 185, f1: 780, f2: 1300, text: "cha" },
    ],
    conductor: [
      // "ফার্মগেট! শাহবাগ! মতিঝিল! উইঠা পরেন!"
      { start: 0.08, dur: 0.26, f0: 210, f1: 650, f2: 1700, text: "farm" },
      { start: 0.36, dur: 0.28, f0: 190, f1: 500, f2: 1900, text: "gate" },
      { start: 0.75, dur: 0.28, f0: 220, f1: 750, f2: 1350, text: "shah" },
      { start: 1.05, dur: 0.25, f0: 200, f1: 680, f2: 1200, text: "bagh" },
      { start: 1.40, dur: 0.24, f0: 230, f1: 450, f2: 1800, text: "mo" },
      { start: 1.66, dur: 0.32, f0: 215, f1: 380, f2: 2100, text: "ti" },
      { start: 2.10, dur: 0.45, f0: 240, f1: 600, f2: 1600, text: "utho" },
    ],
    rickshaw: [
      // "মামা ডানে যান! ডানে চাপান!"
      { start: 0.08, dur: 0.22, f0: 180, f1: 680, f2: 1350, text: "ma" },
      { start: 0.32, dur: 0.25, f0: 195, f1: 680, f2: 1350, text: "ma" },
      { start: 0.65, dur: 0.32, f0: 215, f1: 600, f2: 1750, text: "da" },
      { start: 1.00, dur: 0.28, f0: 190, f1: 480, f2: 1850, text: "ne" },
      { start: 1.35, dur: 0.42, f0: 175, f1: 720, f2: 1400, text: "jan" },
    ],
    greeting: [
      // "আসসালামু আলাইকুম ভাই!"
      { start: 0.10, dur: 0.25, f0: 140, f1: 700, f2: 1400, text: "as" },
      { start: 0.38, dur: 0.25, f0: 155, f1: 700, f2: 1400, text: "sa" },
      { start: 0.65, dur: 0.35, f0: 165, f1: 600, f2: 1550, text: "lam" },
      { start: 1.10, dur: 0.28, f0: 145, f1: 520, f2: 1800, text: "a" },
      { start: 1.40, dur: 0.30, f0: 160, f1: 450, f2: 1950, text: "lai" },
      { start: 1.75, dur: 0.45, f0: 135, f1: 680, f2: 1250, text: "bhai" },
    ],
  };

  const syls = patterns[type] || patterns.greeting;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    let voice = 0;

    for (const syl of syls) {
      const dt = t - syl.start;
      if (dt >= 0 && dt < syl.dur) {
        const env = Math.sin((dt / syl.dur) * Math.PI) ** 1.6;
        const pitchBend = syl.f0 * (1 + 0.08 * Math.sin(Math.PI * dt / syl.dur));

        const osc =
          Math.sin(2 * Math.PI * pitchBend * dt) +
          0.65 * Math.sin(2 * Math.PI * pitchBend * 2 * dt) +
          0.40 * Math.sin(2 * Math.PI * pitchBend * 3 * dt) +
          0.20 * Math.sin(2 * Math.PI * pitchBend * 4 * dt);

        const f1 = Math.sin(2 * Math.PI * syl.f1 * dt);
        const f2 = Math.sin(2 * Math.PI * syl.f2 * dt);
        const fricative = (whiteNoise() * 0.35) * (dt < 0.06 ? (0.06 - dt) / 0.06 : 0);

        voice += (osc * (f1 * 0.65 + f2 * 0.35) + fricative) * env * 0.85;
      }
    }

    // Add acoustic character: rickshaw bell for rickshaw caller, spoon clink for tea vendor
    if (type === "vendor") {
      const clinkT = t - 0.04;
      if (clinkT >= 0 && clinkT < 0.3) {
        voice += 0.22 * Math.sin(2 * Math.PI * 3650 * clinkT) * Math.exp(-clinkT / 0.04);
      }
    } else if (type === "rickshaw") {
      const bellT = t - 0.02;
      if (bellT >= 0 && bellT < 0.25) {
        voice += 0.20 * Math.sin(2 * Math.PI * 2900 * bellT) * Math.exp(-bellT / 0.05);
      }
    }

    samples[i] = voice * 0.72;
  }

  return samples;
}

writeWav("voice_cha_vendor.wav", SR, generateVoiceCallout("vendor"));
writeWav("voice_bus_conductor.wav", SR, generateVoiceCallout("conductor"));
writeWav("voice_rickshaw_puller.wav", SR, generateVoiceCallout("rickshaw"));
writeWav("voice_pedestrian_1.wav", SR, generateVoiceCallout("greeting"));
writeWav("voice_pedestrian_2.wav", SR, generateVoiceCallout("vendor"));
writeWav("voice_pedestrian_3.wav", SR, generateVoiceCallout("rickshaw"));

console.log('All audio assets generated successfully in public/audio!');
