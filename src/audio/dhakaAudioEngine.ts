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

  public updateEngine(inVehicle: boolean, vehicleType: VehicleType | null, speedRatio: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter) return;

    if (!inVehicle || !vehicleType || vehicleType === 'rickshaw') {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    let baseFreq = 52;
    let maxFreq = 165;
    let filterFreq = 320;

    if (vehicleType === 'cng') {
      baseFreq = 68;
      maxFreq = 210;
      filterFreq = 480;
    } else if (vehicleType === 'motorcycle') {
      baseFreq = 85;
      maxFreq = 280;
      filterFreq = 540;
    } else if (vehicleType === 'bus') {
      baseFreq = 38;
      maxFreq = 110;
      filterFreq = 220;
    }

    const freq = baseFreq + Math.abs(speedRatio) * (maxFreq - baseFreq);
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq + Math.abs(speedRatio) * 300, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.065 * this.sfxVolume, this.ctx.currentTime, 0.08);
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
      | 'gunshot'
      | 'shotgun'
      | 'rifle'
      | 'slash'
      | 'skid'
      | 'eat'
      | 'drink'
  ) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

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
  }
}

export const dhakaAudio = new DhakaAudioEngine();
