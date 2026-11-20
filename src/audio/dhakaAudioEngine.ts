import { RadioStationId, VehicleType } from '../types/game';

class DhakaAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Volumes
  public musicVolume = 0.45;
  public sfxVolume = 0.7;
  public ambienceVolume = 0.4;

  // Engine oscillator nodes
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Rain ambience nodes
  private rainGain: GainNode | null = null;
  private isRaining = false;

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
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this.setupEngineSound();
      this.setupRainAmbience();
      this.startRadioSequencer();
    } catch {
      // Web Audio not allowed yet
    }
  }

  private setupEngineSound() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;

    this.engineGain.gain.value = 0.0;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
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

  public playDistantAmbientSound(type: 'rickshaw_bell' | 'boat_horn' = 'rickshaw_bell') {
    if (!this.ctx || this.ambienceVolume <= 0.05) return;
    const now = this.ctx.currentTime;
    if (type === 'rickshaw_bell') {
      [0, 0.16].forEach((offset) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(2093, now + offset);
        g.gain.setValueAtTime(0.045 * this.ambienceVolume, now + offset);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now + offset);
        o.stop(now + offset + 0.36);
      });
    } else {
      // Buriganga launch deep foghorn
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(85, now);
      o.frequency.linearRampToValueAtTime(82, now + 1.2);
      g.gain.setValueAtTime(0.04 * this.ambienceVolume, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now);
      o.stop(now + 1.45);
    }
  }

  public updateEngine(
    inVehicle: boolean,
    vehicleType: VehicleType | null,
    speedRatio: number
  ) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter)
      return;

    if (!inVehicle || !vehicleType || vehicleType === 'rickshaw') {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    const absSpeed = Math.abs(speedRatio);
    let baseFreq = 48;
    let gearStages = 4;
    let filterFreq = 280;

    if (vehicleType === 'cng') {
      baseFreq = 64;
      gearStages = 3;
      filterFreq = 420;
    } else if (vehicleType === 'motorcycle') {
      baseFreq = 84;
      gearStages = 5;
      filterFreq = 520;
    } else if (vehicleType === 'bus') {
      baseFreq = 34;
      gearStages = 4;
      filterFreq = 210;
    } else {
      // Cars & DMP Police cruisers
      baseFreq = 52;
      gearStages = 5;
      filterFreq = 350;
    }

    // Realistic RPM Pitch Shift with Simulated Gear Transitions
    const gearFraction = (absSpeed * gearStages) % 1.0;
    const gearBase = Math.floor(absSpeed * gearStages) * 0.14;
    const rpmPitch = baseFreq * (1.0 + gearBase + gearFraction * 1.55);

    this.engineOsc.frequency.setTargetAtTime(rpmPitch, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(
      filterFreq + absSpeed * 420,
      this.ctx.currentTime,
      0.06
    );
    this.engineGain.gain.setTargetAtTime(
      0.08 * this.sfxVolume,
      this.ctx.currentTime,
      0.06
    );
  }

  public playFootstep() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.045);
    gain.gain.setValueAtTime(0.075 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
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
      | 'mission_complete'
      | 'jump'
      | 'ui'
      | 'gunshot_shotgun'
      | 'gunshot_pistol'
      | 'gunshot_rifle'
      | 'reload'
      | 'dry_fire'
      | 'melee_slash'
      | 'ricochet'
  ) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (effect === 'gunshot_shotgun') {
      // Katta (দেশি কাটা রাইফেল) - Massive Dual-Stage Boom + Sub-Bass Slam + Metallic Reverb
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(175, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
      subGain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.4);

      // Noise blast
      const noiseLen = 0.32;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.22));
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = buf;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(1800, now);
      nFilter.frequency.exponentialRampToValueAtTime(400, now + noiseLen);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.48 * this.sfxVolume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
      nSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.ctx.destination);
      nSrc.start(now);
      return;
    }

    if (effect === 'gunshot_pistol') {
      // Shutter Revolver / Pipe Gun - Snappy Crack & Metallic Pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
      gain.gain.setValueAtTime(0.42 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);

      const noiseLen = 0.18;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.28));
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = buf;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
      nSrc.connect(nGain);
      nGain.connect(this.ctx.destination);
      nSrc.start(now);
      return;
    }

    if (effect === 'gunshot_rifle') {
      // Type-56 AK Assault Rifle - High Velocity Bark + Bolt Echo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
      gain.gain.setValueAtTime(0.38 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      const noiseLen = 0.22;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
      const nSrc = this.ctx.createBufferSource();
      nSrc.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(2400, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
      nSrc.connect(f);
      f.connect(nGain);
      nGain.connect(this.ctx.destination);
      nSrc.start(now);
      return;
    }

    if (effect === 'reload') {
      // Metallic magazine eject, slide, and bolt lock
      [0.0, 0.28, 0.55].forEach((offset, idx) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = idx === 1 ? 'square' : 'triangle';
        o.frequency.setValueAtTime(idx === 0 ? 540 : idx === 1 ? 880 : 340, now + offset);
        o.frequency.exponentialRampToValueAtTime(idx === 0 ? 280 : idx === 1 ? 420 : 180, now + offset + 0.08);
        g.gain.setValueAtTime(0.18 * this.sfxVolume, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(now + offset);
        o.stop(now + offset + 0.1);
      });
      return;
    }

    if (effect === 'dry_fire') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(1400, now);
      o.frequency.exponentialRampToValueAtTime(800, now + 0.04);
      g.gain.setValueAtTime(0.16 * this.sfxVolume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now);
      o.stop(now + 0.06);
      return;
    }

    if (effect === 'melee_slash') {
      // Heavy Ramda / Chapati air slash whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(480, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
      gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
      return;
    }

    if (effect === 'ricochet') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(2200, now);
      o.frequency.exponentialRampToValueAtTime(450, now + 0.18);
      g.gain.setValueAtTime(0.14 * this.sfxVolume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(now);
      o.stop(now + 0.21);
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
  }
}

export const dhakaAudio = new DhakaAudioEngine();
