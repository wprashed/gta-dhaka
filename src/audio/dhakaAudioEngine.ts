import { RadioStationId, VehicleType } from '../types/game';

class DhakaAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Volumes
  public musicVolume = 0.45;
  public sfxVolume = 0.7;
  public ambienceVolume = 0.4;

  // Engine oscillator nodes (Dual-Oscillator for rich vehicle physics)
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private rickshawClickInterval: number | null = null;

  // Rain ambience nodes
  private rainGain: GainNode | null = null;
  private isRaining = false;

  // Dhaka City Traffic Ambience (BGM)
  private trafficGain: GainNode | null = null;
  private trafficHornInterval: number | null = null;

  // Radio sequencer
  private currentStation: RadioStationId = 'dhaka_folk';
  private radioInterval: number | null = null;
  private radioStep = 0;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this.setupEngineSound();
      this.setupRainAmbience();
      this.setupTrafficAmbience();
      this.startRadioSequencer();
    } catch {
      // Web Audio not allowed yet
    }
  }

  private setupEngineSound() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();
    this.engineSubGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineSubOsc.type = 'square';
    this.engineSubOsc.frequency.value = 110;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;

    this.engineGain.gain.value = 0.0;
    this.engineSubGain.gain.value = 0.0;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineSubGain);
    this.engineSubGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  private setupTrafficAmbience() {
    if (!this.ctx) return;
    // Generate filtered urban rumble noise (muffled traffic, rolling tires, city presence)
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = output[i];
    }

    const trafficNoise = this.ctx.createBufferSource();
    trafficNoise.buffer = noiseBuffer;
    trafficNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;

    this.trafficGain = this.ctx.createGain();
    this.trafficGain.gain.value = 0.16 * this.ambienceVolume;

    trafficNoise.connect(filter);
    filter.connect(this.trafficGain);
    this.trafficGain.connect(this.ctx.destination);
    trafficNoise.start();

    // Periodic distant Dhaka traffic echoes (random bus airhorn or rickshaw chime echoing in background)
    if (this.trafficHornInterval) window.clearInterval(this.trafficHornInterval);
    this.trafficHornInterval = window.setInterval(() => {
      if (!this.ctx || this.trafficGain?.gain.value === 0) return;
      if (Math.random() < 0.65) {
        this.playDistantTrafficChirp();
      }
    }, 5500);
  }

  private playDistantTrafficChirp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const r = Math.random();

    if (r < 0.45) {
      // Distant cycle rickshaw bell chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, now);
      gain.gain.setValueAtTime(0.018 * this.ambienceVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (r < 0.75) {
      // Distant CNG auto-rickshaw horn chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.022 * this.ambienceVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Distant Dhaka City Bus dual airhorn blast echo
      [220, 277].forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.015 * this.ambienceVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    }
  }

  private setupRainAmbience() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.7;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    whiteNoise.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);
    whiteNoise.start();
  }

  public setRainActive(active: boolean) {
    this.isRaining = active;
    if (!this.ctx || !this.rainGain) return;
    const target = active ? 0.14 * this.ambienceVolume : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  public updateEngine(
    inVehicle: boolean,
    vehicleType: VehicleType | null,
    speedRatio: number
  ) {
    if (
      !this.ctx ||
      !this.engineOsc ||
      !this.engineSubOsc ||
      !this.engineGain ||
      !this.engineSubGain ||
      !this.engineFilter
    )
      return;

    if (!inVehicle || !vehicleType) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.engineSubGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      if (this.rickshawClickInterval) {
        window.clearInterval(this.rickshawClickInterval);
        this.rickshawClickInterval = null;
      }
      return;
    }

    const absSpeed = Math.abs(speedRatio);

    // 1. CYCLE RICKSHAW: Mechanical pedal chain rattle & spoke freewheel clicks
    if (vehicleType === 'rickshaw') {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.engineSubGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);

      if (absSpeed > 0.08) {
        if (!this.rickshawClickInterval) {
          this.rickshawClickInterval = window.setInterval(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(950, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
            gain.gain.setValueAtTime(0.045 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.045);
          }, 140);
        }
      } else if (this.rickshawClickInterval) {
        window.clearInterval(this.rickshawClickInterval);
        this.rickshawClickInterval = null;
      }
      return;
    }

    if (this.rickshawClickInterval) {
      window.clearInterval(this.rickshawClickInterval);
      this.rickshawClickInterval = null;
    }

    // 2. CNG AUTO-RICKSHAW: Iconic 2-stroke high-sputter "putt-putt" thrum
    if (vehicleType === 'cng') {
      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'square';
      const baseFreq = 72;
      const maxFreq = 235;
      const freq = baseFreq + absSpeed * (maxFreq - baseFreq);
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 2, this.ctx.currentTime, 0.05);
      this.engineFilter.frequency.setTargetAtTime(450 + absSpeed * 350, this.ctx.currentTime, 0.06);
      this.engineGain.gain.setTargetAtTime(0.075 * this.sfxVolume, this.ctx.currentTime, 0.06);
      this.engineSubGain.gain.setTargetAtTime(0.04 * this.sfxVolume, this.ctx.currentTime, 0.06);
      return;
    }

    // 3. DHAKA CITY BUS: Deep sub-harmonic 6-cylinder diesel chug & turbo air resonance
    if (vehicleType === 'bus') {
      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'sine';
      const baseFreq = 32;
      const maxFreq = 95;
      const freq = baseFreq + absSpeed * (maxFreq - baseFreq);
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, this.ctx.currentTime, 0.08);
      this.engineFilter.frequency.setTargetAtTime(200 + absSpeed * 180, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(0.09 * this.sfxVolume, this.ctx.currentTime, 0.08);
      this.engineSubGain.gain.setTargetAtTime(0.06 * this.sfxVolume, this.ctx.currentTime, 0.08);
      return;
    }

    // 4. DMP POLICE CRUISER: High-revving pursuit interceptor V6 engine
    if (vehicleType === 'police') {
      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      const baseFreq = 62;
      const maxFreq = 250;
      const freq = baseFreq + absSpeed * (maxFreq - baseFreq);
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 1.5, this.ctx.currentTime, 0.04);
      this.engineFilter.frequency.setTargetAtTime(520 + absSpeed * 400, this.ctx.currentTime, 0.06);
      this.engineGain.gain.setTargetAtTime(0.08 * this.sfxVolume, this.ctx.currentTime, 0.05);
      this.engineSubGain.gain.setTargetAtTime(0.035 * this.sfxVolume, this.ctx.currentTime, 0.05);
      return;
    }

    // 5. MOTORCYCLE: Thumping 4-stroke 150cc Bajaj Pulsar / Yamaha FZ with multi-gear rev acoustics
    if (vehicleType === 'motorcycle') {
      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'square';
      // Multi-gear RPM climb & shift drops (1st to 5th gear)
      let gearRpm = 0;
      if (absSpeed < 0.02) {
        gearRpm = 0.05; // Idle rumble
      } else if (absSpeed < 0.18) {
        gearRpm = absSpeed / 0.18;
      } else if (absSpeed < 0.38) {
        gearRpm = (absSpeed - 0.18) / 0.20;
      } else if (absSpeed < 0.60) {
        gearRpm = (absSpeed - 0.38) / 0.22;
      } else if (absSpeed < 0.82) {
        gearRpm = (absSpeed - 0.60) / 0.22;
      } else {
        gearRpm = Math.min(1.0, (absSpeed - 0.82) / 0.18);
      }
      const freq = 80 + gearRpm * 195;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.035);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, this.ctx.currentTime, 0.035);
      this.engineFilter.frequency.setTargetAtTime(550 + gearRpm * 520, this.ctx.currentTime, 0.04);
      this.engineGain.gain.setTargetAtTime((0.075 + gearRpm * 0.035) * this.sfxVolume, this.ctx.currentTime, 0.04);
      this.engineSubGain.gain.setTargetAtTime(0.045 * this.sfxVolume, this.ctx.currentTime, 0.04);
      return;
    }

    // 6. GULSHAN EXECUTIVE SEDAN (Default Car): Smooth modern 4-cylinder purr
    this.engineOsc.type = 'triangle';
    this.engineSubOsc.type = 'sawtooth';
    const baseFreq = 50;
    const maxFreq = 180;
    const freq = baseFreq + absSpeed * (maxFreq - baseFreq);
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 2, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(360 + absSpeed * 280, this.ctx.currentTime, 0.06);
    this.engineGain.gain.setTargetAtTime(0.065 * this.sfxVolume, this.ctx.currentTime, 0.06);
    this.engineSubGain.gain.setTargetAtTime(0.025 * this.sfxVolume, this.ctx.currentTime, 0.06);
  }

  public playHorn(type: 'cng' | 'bell' | 'airhorn' | 'car' | 'siren' = 'cng') {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (type === 'bell') {
      // Classic Bangladeshi Cycle Rickshaw "Tring-Tring!" double bell
      [0, 0.13].forEach((offset) => {
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1760, now + offset);
        osc2.frequency.setValueAtTime(2637, now + offset);

        gain.gain.setValueAtTime(0.22 * this.sfxVolume, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now + offset);
        osc2.start(now + offset);
        osc1.stop(now + offset + 0.26);
        osc2.stop(now + offset + 0.26);
      });
      return;
    }

    if (type === 'airhorn') {
      // Dhaka Bus Air Horn chord
      [220, 277.18, 329.63].forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 1.03, now + 0.35);

        gain.gain.setValueAtTime(0.11 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
      return;
    }

    if (type === 'siren') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(920, now + 0.22);
      osc.frequency.linearRampToValueAtTime(620, now + 0.44);

      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.47);
      return;
    }

    // Default CNG / Car horn
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const base = type === 'cng' ? 480 : 370;
    osc.frequency.setValueAtTime(base, now);

    gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playSfx(
    effect:
      | 'pickup'
      | 'cash'
      | 'hit'
      | 'heavy_hit'
      | 'punch_swing'
      | 'mission_complete'
      | 'jump'
      | 'ui'
      | 'gunshot'
      | 'shotgun'
      | 'rifle'
      | 'slash'
      | 'skid'
      | 'eat'
      | 'drink'
      | 'reload'
      | 'wasted'
      | 'busted'
      | 'crash'
      | 'dry_fire'
      | 'casing_drop'
      | 'ricochet'
      | 'pain_grunt'
  ) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (effect === 'crash') {
      // Violent metal crunch + shattering tempered safety glass
      const dur = 0.46;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] =
          (Math.random() * 2 - 1) *
          Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      // Heavy metal low-frequency impact crunch
      const lowOsc = this.ctx.createOscillator();
      const lowGain = this.ctx.createGain();
      lowOsc.type = 'sawtooth';
      lowOsc.frequency.setValueAtTime(145, now);
      lowOsc.frequency.exponentialRampToValueAtTime(30, now + 0.38);
      lowGain.gain.setValueAtTime(0.38 * this.sfxVolume, now);
      lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      lowOsc.connect(lowGain);
      lowGain.connect(this.ctx.destination);
      lowOsc.start(now);
      lowOsc.stop(now + 0.44);

      // Glass shatter high-frequency fizz
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);
      filter.Q.value = 2.2;

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.46);
      return;
    }

    if (effect === 'reload') {
      // Crisp mechanical metal slide & magazine latch
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(620, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain1.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.11);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(340, now + 0.14);
      osc2.frequency.setValueAtTime(520, now + 0.2);
      gain2.gain.setValueAtTime(0.2 * this.sfxVolume, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.29);
      return;
    }

    if (effect === 'wasted') {
      // Deep ominous bass drop and minor resonant chord
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 1.2);
      gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.55);
      return;
    }

    if (effect === 'busted') {
      // Dramatic brass detention chord / gavel impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.setValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.95);
      return;
    }

    if (effect === 'skid') {
      // High-pitched friction noise for tires drifting on Dhaka asphalt
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.linearRampToValueAtTime(710, now + 0.18);
      gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
      return;
    }

    if (effect === 'drink' || effect === 'eat') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(effect === 'drink' ? 360 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);
      gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      return;
    }

    if (
      effect === 'gunshot' ||
      effect === 'shotgun' ||
      effect === 'rifle'
    ) {
      // Synthesized ballistic transient + filtered noise tail
      const duration = effect === 'shotgun' ? 0.28 : effect === 'rifle' ? 0.16 : 0.2;
      const bufSize = Math.floor(this.ctx.sampleRate * duration);
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
      }
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        effect === 'shotgun' ? 950 : effect === 'rifle' ? 1850 : 1400,
        now
      );
      filter.frequency.exponentialRampToValueAtTime(160, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.42 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noiseSrc.start(now);

      // Low-end punch oscillator
      const punch = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punch.type = 'triangle';
      punch.frequency.setValueAtTime(effect === 'shotgun' ? 140 : 210, now);
      punch.frequency.exponentialRampToValueAtTime(34, now + 0.11);
      punchGain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      punch.connect(punchGain);
      punchGain.connect(this.ctx.destination);
      punch.start(now);
      punch.stop(now + 0.12);
      return;
    }

    if (effect === 'slash') {
      // Metallic blade whoosh for Dhaka Ramda / Chapati
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (effect === 'cash' || effect === 'mission_complete') {
      const notes = effect === 'mission_complete' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
      return;
    }

    if (effect === 'dry_fire') {
      // Hollow metallic firing pin click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      return;
    }

    if (effect === 'casing_drop') {
      // High brass shell casing ping and bounce
      const freqs = [3200, 3850];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.035);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, now + idx * 0.035 + 0.04);
        gain.gain.setValueAtTime(0.14 * this.sfxVolume, now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.045);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.05);
      });
      return;
    }

    if (effect === 'punch_swing') {
      // Snappy athletic arm swoosh
      const bufSize = Math.floor(this.ctx.sampleRate * 0.12);
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
      }
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.11);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noiseSrc.start(now);
      return;
    }

    if (effect === 'heavy_hit') {
      // Deep blunt wooden / bone crunch (cricket bat / bamboo lathi / heavy combo)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
      gain.gain.setValueAtTime(0.38 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
      return;
    }

    if (effect === 'ricochet') {
      // Whistling bullet ricochet zip
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      return;
    }

    if (effect === 'pain_grunt') {
      // Human vocal grunt reaction
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.15);
      gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    if (effect === 'hit') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(effect === 'jump' ? 240 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(effect === 'jump' ? 420 : 680, now + 0.12);

    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public setRadioStation(station: RadioStationId) {
    this.currentStation = station;
    this.radioStep = 0;
    if (station === 'off') {
      if (this.radioInterval) {
        window.clearInterval(this.radioInterval);
        this.radioInterval = null;
      }
    } else if (!this.radioInterval) {
      this.startRadioSequencer();
    }
  }

  private startRadioSequencer() {
    if (this.radioInterval) window.clearInterval(this.radioInterval);

    // Pentatonic / Bhairavi / Urban scales for authentic Dhaka vibe
    const folkScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
    const gullyScale = [110.0, 110.0, 130.81, 146.83, 110.0, 164.81, 146.83, 130.81];
    const synthScale = [220.0, 277.18, 329.63, 440.0, 329.63, 277.18, 246.94, 329.63];

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (this.currentStation === 'off' || this.musicVolume <= 0.01) return;

      const now = this.ctx.currentTime;
      const step = this.radioStep % 8;
      this.radioStep++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      let freq = 261.63;
      if (this.currentStation === 'dhaka_folk') {
        osc.type = 'triangle';
        freq = folkScale[step];
      } else if (this.currentStation === 'gully_beat') {
        osc.type = 'sawtooth';
        freq = gullyScale[step];
      } else {
        osc.type = 'sine';
        freq = synthScale[step];
      }

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.035 * this.musicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.34);
    }, 360);
  }

  public setVolumes(music: number, sfx: number, ambience: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.ambienceVolume = ambience;
    this.setRainActive(this.isRaining);
    if (this.ctx && this.trafficGain) {
      this.trafficGain.gain.setTargetAtTime(
        0.16 * this.ambienceVolume,
        this.ctx.currentTime,
        0.2
      );
    }
  }
}

export const dhakaAudio = new DhakaAudioEngine();
