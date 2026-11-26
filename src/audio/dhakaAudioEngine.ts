import { RadioStationId, VehicleType } from '../types/game';
import { resolveAssetUrl } from '../utils/assets';

class DhakaAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Volumes
  public musicVolume = 0.45;
  public sfxVolume = 0.7;
  public ambienceVolume = 0.4;

  // Real Audio Assets Cache (Decoded AudioBuffers)
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingBuffers = new Set<string>();

  // Real Vehicle Engine Looping Audio Nodes
  private currentActiveVehicleType: VehicleType | null = null;
  private engineIdleSource: AudioBufferSourceNode | null = null;
  private engineRevSource: AudioBufferSourceNode | null = null;
  private engineIdleGain: GainNode | null = null;
  private engineRevGain: GainNode | null = null;
  private lastVehicleSpeed = 0;

  // Fallback Engine oscillator nodes (Dual-Oscillator for vehicle physics)
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private rickshawClickInterval: number | null = null;

  // Rain & marine wake ambience nodes
  private rainGain: GainNode | null = null;
  private boatWakeGain: GainNode | null = null;
  private isRaining = false;

  // Dhaka City Traffic Ambience (BGM) & Pedestrian Crowd Chatter
  private trafficGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private trafficLoopSource: AudioBufferSourceNode | null = null;
  private crowdLoopSource: AudioBufferSourceNode | null = null;
  private currentCrowdDensity = 0.35;
  private lastCalloutTime = 0;
  private trafficHornInterval: number | null = null;

  // Radio sequencer (default off to prevent unsolicited synthetic bg music)
  private currentStation: RadioStationId = 'off';
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
      this.preloadAllAudioAssets();
      this.setupEngineSound();
      this.setupRainAmbience();
      this.setupTrafficAmbience();
    } catch {
      // Web Audio not allowed yet
    }
  }

  private preloadAllAudioAssets() {
    const assets = [
      '/audio/footstep_walk_1.wav',
      '/audio/footstep_walk_2.wav',
      '/audio/footstep_run_1.wav',
      '/audio/footstep_run_2.wav',
      '/audio/footstep_land.wav',
      '/audio/engine_motorcycle_idle.wav',
      '/audio/engine_motorcycle_rev.wav',
      '/audio/engine_cng_idle.wav',
      '/audio/engine_cng_rev.wav',
      '/audio/engine_car_idle.wav',
      '/audio/engine_car_rev.wav',
      '/audio/engine_bus_idle.wav',
      '/audio/engine_bus_rev.wav',
      '/audio/bus_air_brake.wav',
      '/audio/engine_rickshaw_chain.wav',
      '/audio/horn_rickshaw_bell.wav',
      '/audio/horn_cng.wav',
      '/audio/horn_bus_air.wav',
      '/audio/horn_car.wav',
      '/audio/dhaka_traffic_bg.wav',
      '/audio/dhaka_crowd_chatter.wav',
      '/audio/voice_cha_vendor.wav',
      '/audio/voice_bus_conductor.wav',
      '/audio/voice_rickshaw_puller.wav',
      '/audio/voice_pedestrian_1.wav',
      '/audio/voice_pedestrian_2.wav',
      '/audio/voice_pedestrian_3.wav',
    ];
    assets.forEach((path) => this.preloadAudio(path));
  }

  public preloadAudio(url: string) {
    if (this.bufferCache.has(url) || this.loadingBuffers.has(url)) return;
    this.loadingBuffers.add(url);
    const resolved = resolveAssetUrl(url);
    fetch(resolved)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuf) => {
        if (!this.ctx) return;
        return this.ctx.decodeAudioData(arrayBuf);
      })
      .then((audioBuf) => {
        if (audioBuf) {
          this.bufferCache.set(url, audioBuf);
        }
      })
      .catch((err) => {
        console.warn(`[DhakaAudio] Preload note for ${url}:`, err);
      })
      .finally(() => {
        this.loadingBuffers.delete(url);
      });
  }

  private playBufferOneShot(
    url: string,
    volumeScale = 1.0,
    pitchVariation = 0.0
  ): boolean {
    if (!this.ctx) return false;
    const buf = this.bufferCache.get(url);
    if (!buf) {
      this.preloadAudio(url);
      return false;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    if (pitchVariation > 0) {
      source.playbackRate.value =
        1.0 + (Math.random() * 2 - 1) * pitchVariation;
    }
    const gain = this.ctx.createGain();
    gain.gain.value = volumeScale * this.sfxVolume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    return true;
  }

  /**
   * Plays authentic walking / sprinting / landing shoe impact sounds on Dhaka pavement.
   */
  public playFootstep(
    type: 'walk' | 'run' | 'land',
    isRight = false
  ) {
    this.init();
    if (!this.ctx) return;

    let url = '/audio/footstep_walk_1.wav';
    let vol = 0.35;
    if (type === 'land') {
      url = '/audio/footstep_land.wav';
      vol = 0.65;
    } else if (type === 'run') {
      url = isRight ? '/audio/footstep_run_2.wav' : '/audio/footstep_run_1.wav';
      vol = 0.48;
    } else {
      url = isRight ? '/audio/footstep_walk_2.wav' : '/audio/footstep_walk_1.wav';
      vol = 0.32;
    }

    if (!this.playBufferOneShot(url, vol, 0.06)) {
      // Synth fallback if WAV buffer not decoded yet
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const f = type === 'land' ? 62 : type === 'run' ? 95 : 80;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
      gain.gain.setValueAtTime(vol * 0.4 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
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

    // Master gains for clean organic city atmosphere
    this.trafficGain = this.ctx.createGain();
    this.trafficGain.gain.value = 0.14 * this.ambienceVolume;
    this.trafficGain.connect(this.ctx.destination);

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = this.currentCrowdDensity * 0.12 * this.ambienceVolume;
    this.crowdGain.connect(this.ctx.destination);

    // 1. Play real Dhaka Traffic Ambience AudioBuffer loop (clean, atmospheric, zero repetitive beeps)
    this.startTrafficBufferLoop();

    // 2. Play real Dhaka Pedestrian Crowd / Market Chatter AudioBuffer loop
    this.startCrowdBufferLoop();
  }

  private startTrafficBufferLoop() {
    if (!this.ctx || !this.trafficGain) return;
    const url = '/audio/dhaka_traffic_bg.wav';
    const buf = this.bufferCache.get(url);
    if (buf) {
      if (this.trafficLoopSource) {
        try { this.trafficLoopSource.stop(); } catch {}
      }
      this.trafficLoopSource = this.ctx.createBufferSource();
      this.trafficLoopSource.buffer = buf;
      this.trafficLoopSource.loop = true;
      this.trafficLoopSource.connect(this.trafficGain);
      this.trafficLoopSource.start();
    } else {
      // Start fallback noise until real audio buffer decodes
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
      trafficNoise.connect(filter);
      filter.connect(this.trafficGain);
      trafficNoise.start();

      const checkInterval = window.setInterval(() => {
        if (this.bufferCache.has(url)) {
          window.clearInterval(checkInterval);
          try { trafficNoise.stop(); } catch {}
          this.startTrafficBufferLoop();
        }
      }, 800);
    }
  }

  private startCrowdBufferLoop() {
    if (!this.ctx || !this.crowdGain) return;
    const url = '/audio/dhaka_crowd_chatter.wav';
    const buf = this.bufferCache.get(url);
    if (buf) {
      if (this.crowdLoopSource) {
        try { this.crowdLoopSource.stop(); } catch {}
      }
      this.crowdLoopSource = this.ctx.createBufferSource();
      this.crowdLoopSource.buffer = buf;
      this.crowdLoopSource.loop = true;
      this.crowdLoopSource.connect(this.crowdGain);
      this.crowdLoopSource.start();
    } else {
      const checkInterval = window.setInterval(() => {
        if (this.bufferCache.has(url)) {
          window.clearInterval(checkInterval);
          this.startCrowdBufferLoop();
        }
      }, 800);
    }
  }

  public setCrowdDensity(density: number) {
    this.currentCrowdDensity = Math.max(0, Math.min(1.0, density));
    if (this.ctx && this.crowdGain) {
      const targetGain = this.currentCrowdDensity * 0.22 * this.ambienceVolume;
      this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.35);
    }
  }

  public playStreetCallout(type?: 'vendor' | 'conductor' | 'rickshaw' | 'pedestrian') {
    if (!this.ctx || this.sfxVolume === 0) return;
    const now = performance.now();
    if (now - this.lastCalloutTime < 4500) return;
    this.lastCalloutTime = now;

    let path = '/audio/voice_pedestrian_1.wav';
    if (type === 'vendor') path = '/audio/voice_cha_vendor.wav';
    else if (type === 'conductor') path = '/audio/voice_bus_conductor.wav';
    else if (type === 'rickshaw') path = '/audio/voice_rickshaw_puller.wav';
    else {
      const pIdx = Math.floor(Math.random() * 3) + 1;
      path = `/audio/voice_pedestrian_${pIdx}.wav`;
    }

    this.playBufferOneShot(path, 0.50 * this.sfxVolume, 0.05);
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

    // Marine boat hull wake & water splash noise
    const wakeSource = this.ctx.createBufferSource();
    wakeSource.buffer = noiseBuffer;
    wakeSource.loop = true;

    const wakeFilter = this.ctx.createBiquadFilter();
    wakeFilter.type = 'lowpass';
    wakeFilter.frequency.value = 380;
    wakeFilter.Q.value = 0.9;

    this.boatWakeGain = this.ctx.createGain();
    this.boatWakeGain.gain.value = 0;

    wakeSource.connect(wakeFilter);
    wakeFilter.connect(this.boatWakeGain);
    this.boatWakeGain.connect(this.ctx.destination);
    wakeSource.start();
  }

  public setRainActive(active: boolean) {
    this.isRaining = active;
    if (!this.ctx || !this.rainGain) return;
    const target = active ? 0.14 * this.ambienceVolume : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  private startVehicleEngineLoops(type: VehicleType) {
    if (!this.ctx) return;
    this.stopVehicleEngineLoops();

    // Boats use synthesized marine outboard + hull water wake instead of road car WAVs
    if (type === "boat") {
      return;
    }

    let idleUrl = "/audio/engine_car_idle.wav";
    let revUrl: string | null = "/audio/engine_car_rev.wav";

    if (type === "motorcycle") {
      idleUrl = "/audio/engine_motorcycle_idle.wav";
      revUrl = "/audio/engine_motorcycle_rev.wav";
    } else if (type === "cng") {
      idleUrl = "/audio/engine_cng_idle.wav";
      revUrl = "/audio/engine_cng_rev.wav";
    } else if (type === "bus") {
      idleUrl = "/audio/engine_bus_idle.wav";
      revUrl = "/audio/engine_bus_rev.wav";
    } else if (type === "rickshaw") {
      idleUrl = "/audio/engine_rickshaw_chain.wav";
      revUrl = null;
    }

    const idleBuf = this.bufferCache.get(idleUrl);
    const revBuf = revUrl ? this.bufferCache.get(revUrl) : null;

    if (idleBuf) {
      this.engineIdleSource = this.ctx.createBufferSource();
      this.engineIdleSource.buffer = idleBuf;
      this.engineIdleSource.loop = true;
      this.engineIdleGain = this.ctx.createGain();
      this.engineIdleGain.gain.value = 0.05 * this.sfxVolume;
      this.engineIdleSource.connect(this.engineIdleGain);
      this.engineIdleGain.connect(this.ctx.destination);
      this.engineIdleSource.start();
    } else {
      this.preloadAudio(idleUrl);
    }

    if (revBuf) {
      this.engineRevSource = this.ctx.createBufferSource();
      this.engineRevSource.buffer = revBuf;
      this.engineRevSource.loop = true;
      this.engineRevGain = this.ctx.createGain();
      this.engineRevGain.gain.value = 0;
      this.engineRevSource.connect(this.engineRevGain);
      this.engineRevGain.connect(this.ctx.destination);
      this.engineRevSource.start();
    } else if (revUrl) {
      this.preloadAudio(revUrl);
    }
  }

  private stopVehicleEngineLoops() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.engineIdleGain) {
      this.engineIdleGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (this.engineRevGain) {
      this.engineRevGain.gain.setTargetAtTime(0, now, 0.08);
    }
    const oldIdle = this.engineIdleSource;
    const oldRev = this.engineRevSource;
    setTimeout(() => {
      try {
        oldIdle?.stop();
      } catch {}
      try {
        oldRev?.stop();
      } catch {}
    }, 100);
    this.engineIdleSource = null;
    this.engineRevSource = null;
    this.engineIdleGain = null;
    this.engineRevGain = null;
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
      this.currentActiveVehicleType = null;
      this.stopVehicleEngineLoops();
      this.lastVehicleSpeed = 0;
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.engineSubGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      if (this.boatWakeGain) {
        this.boatWakeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      }
      if (this.rickshawClickInterval) {
        window.clearInterval(this.rickshawClickInterval);
        this.rickshawClickInterval = null;
      }
      return;
    }

    const absSpeed = Math.abs(speedRatio);

    // If vehicle type switched or real buffer became available, start real engine loops
    if (this.currentActiveVehicleType !== vehicleType || !this.engineIdleSource) {
      this.currentActiveVehicleType = vehicleType;
      this.startVehicleEngineLoops(vehicleType);
    }

    // Bus pneumatic air brake release hiss when coming to a halt
    if (vehicleType === "bus" && this.lastVehicleSpeed > 0.35 && absSpeed < 0.08) {
      this.playBufferOneShot("/audio/bus_air_brake.wav", 0.65);
    }
    this.lastVehicleSpeed = absSpeed;

    if (this.boatWakeGain) {
      const wakeTarget =
        vehicleType === "boat"
          ? (0.025 + absSpeed * 0.14) * this.sfxVolume
          : 0;
      this.boatWakeGain.gain.setTargetAtTime(wakeTarget, this.ctx.currentTime, 0.08);
    }

    if (vehicleType === "boat") {
      // Dedicated Buriganga trawler / speedboat outboard rumble + hull splash
      this.engineOsc.type = "triangle";
      this.engineSubOsc.type = "sawtooth";
      const freq = 36 + absSpeed * 88;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, this.ctx.currentTime, 0.08);
      this.engineFilter.frequency.setTargetAtTime(220 + absSpeed * 280, this.ctx.currentTime, 0.09);
      this.engineGain.gain.setTargetAtTime((0.06 + absSpeed * 0.04) * this.sfxVolume, this.ctx.currentTime, 0.08);
      this.engineSubGain.gain.setTargetAtTime((0.04 + absSpeed * 0.025) * this.sfxVolume, this.ctx.currentTime, 0.08);
      return;
    }

    // If real recorded engine audio loop is active, update volume & pitch dynamics
    if (this.engineIdleGain && this.engineIdleSource) {
      const now = this.ctx.currentTime;
      if (vehicleType === "rickshaw") {
        const chainVol =
          absSpeed > 0.04
            ? Math.min(0.45, 0.12 + absSpeed * 0.35) * this.sfxVolume
            : 0;
        const chainRate = 0.65 + absSpeed * 0.95;
        this.engineIdleGain.gain.setTargetAtTime(chainVol, now, 0.05);
        this.engineIdleSource.playbackRate.setTargetAtTime(chainRate, now, 0.05);
      } else {
        const idleVol =
          Math.max(0.1, 1.0 - absSpeed * 1.15) * (0.35 * this.sfxVolume);
        const idleRate = 0.88 + absSpeed * 0.4;
        this.engineIdleGain.gain.setTargetAtTime(idleVol, now, 0.05);
        this.engineIdleSource.playbackRate.setTargetAtTime(idleRate, now, 0.05);

        if (this.engineRevGain && this.engineRevSource) {
          const revVol = Math.min(1.0, absSpeed * 1.35) * (0.42 * this.sfxVolume);
          const revRate = 0.72 + absSpeed * 0.92;
          this.engineRevGain.gain.setTargetAtTime(revVol, now, 0.04);
          this.engineRevSource.playbackRate.setTargetAtTime(revRate, now, 0.04);
        }
      }
      // Real recorded engine loops are active — silence fallback synth
      this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      this.engineSubGain.gain.setTargetAtTime(0, now, 0.1);
      return;
    }

    // Fallback Dual-Oscillator Synthesis if buffers are still decoding
    if (vehicleType === "rickshaw") {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.engineSubGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      if (this.boatWakeGain) {
        this.boatWakeGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
      }
      return;
    }

    if (vehicleType === "cng") {
      this.engineOsc.type = "sawtooth";
      this.engineSubOsc.type = "square";
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

    if (vehicleType === "bus") {
      this.engineOsc.type = "sawtooth";
      this.engineSubOsc.type = "sine";
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

    if (vehicleType === "police") {
      this.engineOsc.type = "sawtooth";
      this.engineSubOsc.type = "triangle";
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

    if (vehicleType === "motorcycle") {
      this.engineOsc.type = "sawtooth";
      this.engineSubOsc.type = "square";
      const freq = 80 + absSpeed * 195;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.035);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, this.ctx.currentTime, 0.035);
      this.engineFilter.frequency.setTargetAtTime(550 + absSpeed * 520, this.ctx.currentTime, 0.04);
      this.engineGain.gain.setTargetAtTime((0.075 + absSpeed * 0.035) * this.sfxVolume, this.ctx.currentTime, 0.04);
      this.engineSubGain.gain.setTargetAtTime(0.045 * this.sfxVolume, this.ctx.currentTime, 0.04);
      return;
    }

    // Default Car
    this.engineOsc.type = "triangle";
    this.engineSubOsc.type = "sawtooth";
    const baseFreq = 50;
    const maxFreq = 180;
    const freq = baseFreq + absSpeed * (maxFreq - baseFreq);
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 2, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(360 + absSpeed * 280, this.ctx.currentTime, 0.06);
    this.engineGain.gain.setTargetAtTime(0.065 * this.sfxVolume, this.ctx.currentTime, 0.06);
    this.engineSubGain.gain.setTargetAtTime(0.025 * this.sfxVolume, this.ctx.currentTime, 0.06);
  }

  public playHorn(type: "cng" | "bell" | "airhorn" | "car" | "siren" = "cng") {
    // Police case sound / siren completely deleted per user request
    if (type === "siren") return;

    this.init();
    if (!this.ctx) return;

    let hornUrl = "/audio/horn_car.wav";
    if (type === "bell") hornUrl = "/audio/horn_rickshaw_bell.wav";
    else if (type === "cng") hornUrl = "/audio/horn_cng.wav";
    else if (type === "airhorn") hornUrl = "/audio/horn_bus_air.wav";

    // Play real recorded audio if loaded
    if (this.playBufferOneShot(hornUrl, 0.75)) {
      return;
    }

    const now = this.ctx.currentTime;
    if (type === "bell") {
      [0, 0.13].forEach((offset) => {
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = "sine";
        osc2.type = "triangle";
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

    if (type === "airhorn") {
      [220, 277.18, 329.63].forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 1.03, now + 0.35);
        gain.gain.setValueAtTime(0.11 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        osc.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
      return;
    }

    // Car / CNG dual-tone acoustic horn
    const freqs = type === "cng" ? [392, 494] : [349, 440];
    freqs.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === "cng" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.10 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    });
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
      | 'death_groan'
      | 'bone_crack'
      | 'arterial_spray'
      | 'metro_chime'
      | 'thunder'
  ) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (effect === 'thunder') {
      // Atmospheric rolling monsoon thunder (no car glass or metallic impact)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(68, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.6);
      subGain.gain.setValueAtTime(0.01, now);
      subGain.gain.linearRampToValueAtTime(0.42 * this.sfxVolume, now + 0.08);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.95);

      const dur = 2.2;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        const tSec = i / this.ctx.sampleRate;
        const env =
          (Math.exp(-tSec * 1.45) + 0.35 * Math.exp(-Math.pow((tSec - 0.65) * 3.0, 2))) *
          Math.min(1, tSec * 14);
        data[i] = lastOut * 3.2 * env;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(520, now);
      lp.frequency.exponentialRampToValueAtTime(140, now + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
      noise.connect(lp);
      lp.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      return;
    }

    if (effect === 'crash') {
      // Realistic high-impact vehicular collision:
      // 1. Heavy structural chassis shockwave (deep sub-bass impact)
      const lowOsc = this.ctx.createOscillator();
      const lowGain = this.ctx.createGain();
      lowOsc.type = 'sawtooth';
      lowOsc.frequency.setValueAtTime(110, now);
      lowOsc.frequency.exponentialRampToValueAtTime(22, now + 0.38);
      lowGain.gain.setValueAtTime(0.48 * this.sfxVolume, now);
      lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      lowOsc.connect(lowGain);
      lowGain.connect(this.ctx.destination);
      lowOsc.start(now);
      lowOsc.stop(now + 0.44);

      // 2. Crumpled sheet metal & bumper crush
      const crashDur = 0.42;
      const crashBufSize = Math.floor(this.ctx.sampleRate * crashDur);
      const crashBuf = this.ctx.createBuffer(1, crashBufSize, this.ctx.sampleRate);
      const crashData = crashBuf.getChannelData(0);
      for (let i = 0; i < crashBufSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * 0.09));
        crashData[i] = (Math.random() * 2 - 1) * decay;
      }
      const metalNoise = this.ctx.createBufferSource();
      metalNoise.buffer = crashBuf;

      const metalFilter = this.ctx.createBiquadFilter();
      metalFilter.type = 'bandpass';
      metalFilter.frequency.setValueAtTime(750, now);
      metalFilter.Q.value = 1.4;

      const metalGain = this.ctx.createGain();
      metalGain.gain.setValueAtTime(0.40 * this.sfxVolume, now);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      metalNoise.connect(metalFilter);
      metalFilter.connect(metalGain);
      metalGain.connect(this.ctx.destination);
      metalNoise.start(now);

      // 3. Shattered safety glass fragmentation & tinkling scatter
      [0.04, 0.09, 0.16, 0.24].forEach((gOffset, gIdx) => {
        if (!this.ctx) return;
        const gOsc = this.ctx.createOscillator();
        const gGain = this.ctx.createGain();
        gOsc.type = 'sine';
        gOsc.frequency.setValueAtTime(3200 + gIdx * 750, now + gOffset);
        gOsc.frequency.exponentialRampToValueAtTime(1800, now + gOffset + 0.08);
        gGain.gain.setValueAtTime(0.12 * this.sfxVolume, now + gOffset);
        gGain.gain.exponentialRampToValueAtTime(0.001, now + gOffset + 0.085);
        gOsc.connect(gGain);
        gGain.connect(this.ctx.destination);
        gOsc.start(now + gOffset);
        gOsc.stop(now + gOffset + 0.09);
      });
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
      // Realistic abrasive rubber friction screech on gritty asphalt
      const dur = 0.24;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const tEnv = Math.sin((i / bufSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * tEnv;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, now);
      filter.frequency.exponentialRampToValueAtTime(820, now + dur);
      filter.Q.value = 3.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
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
      // High-Fidelity 4-Stage Procedural Firearm Acoustics:
      // Stage 1: Supersonic Muzzle Crack (0.015s sharp pressure impulse)
      const crackBufSize = Math.floor(this.ctx.sampleRate * 0.018);
      const crackBuf = this.ctx.createBuffer(1, crackBufSize, this.ctx.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackBufSize; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackBufSize * 0.25));
      }
      const crackSrc = this.ctx.createBufferSource();
      crackSrc.buffer = crackBuf;
      const crackFilter = this.ctx.createBiquadFilter();
      crackFilter.type = 'highpass';
      crackFilter.frequency.setValueAtTime(2600, now);
      const crackGain = this.ctx.createGain();
      crackGain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
      crackSrc.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.ctx.destination);
      crackSrc.start(now);

      // Stage 2: Gunpowder Expansion Explosion Body
      const blastDur = effect === 'shotgun' ? 0.32 : effect === 'rifle' ? 0.20 : 0.24;
      const blastBufSize = Math.floor(this.ctx.sampleRate * blastDur);
      const blastBuf = this.ctx.createBuffer(1, blastBufSize, this.ctx.sampleRate);
      const blastData = blastBuf.getChannelData(0);
      for (let i = 0; i < blastBufSize; i++) {
        blastData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (blastBufSize * 0.32));
      }
      const blastSrc = this.ctx.createBufferSource();
      blastSrc.buffer = blastBuf;
      const blastFilter = this.ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      const cutoff = effect === 'shotgun' ? 780 : effect === 'rifle' ? 1650 : 1200;
      blastFilter.frequency.setValueAtTime(cutoff, now);
      blastFilter.frequency.exponentialRampToValueAtTime(140, now + blastDur);
      const blastGain = this.ctx.createGain();
      blastGain.gain.setValueAtTime(0.50 * this.sfxVolume, now);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + blastDur);
      blastSrc.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(this.ctx.destination);
      blastSrc.start(now);

      // Stage 3: Low-End Mechanical Shockwave Punch
      const punch = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punch.type = 'triangle';
      const punchStartFreq = effect === 'shotgun' ? 95 : effect === 'rifle' ? 175 : 135;
      punch.frequency.setValueAtTime(punchStartFreq, now);
      punch.frequency.exponentialRampToValueAtTime(26, now + 0.12);
      punchGain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      punch.connect(punchGain);
      punchGain.connect(this.ctx.destination);
      punch.start(now);
      punch.stop(now + 0.15);

      // Stage 4: Urban Concrete Canyon Reverb Tail (Dhaka street wall slapback)
      [0.045, 0.11, 0.19].forEach((echoDelay, eIdx) => {
        if (!this.ctx) return;
        const eOsc = this.ctx.createOscillator();
        const eGain = this.ctx.createGain();
        eOsc.type = 'sine';
        eOsc.frequency.setValueAtTime(180 - eIdx * 35, now + echoDelay);
        eGain.gain.setValueAtTime((0.14 / (eIdx + 1)) * this.sfxVolume, now + echoDelay);
        eGain.gain.exponentialRampToValueAtTime(0.001, now + echoDelay + 0.12);
        eOsc.connect(eGain);
        eGain.connect(this.ctx.destination);
        eOsc.start(now + echoDelay);
        eOsc.stop(now + echoDelay + 0.13);
      });
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

    if (effect === 'death_groan') {
      // Visceral deep throat collapse groan / fatal death rattle
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(145, now);
      osc1.frequency.exponentialRampToValueAtTime(48, now + 0.42);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, now);
      osc2.frequency.exponentialRampToValueAtTime(36, now + 0.45);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.4);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.47);
      osc2.stop(now + 0.47);
      return;
    }

    if (effect === 'bone_crack') {
      // High-impact blunt bone fracture / crunch
      const dur = 0.08;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(950, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      return;
    }

    if (effect === 'arterial_spray') {
      // High-pressure ballistic arterial blood squirt
      const dur = 0.22;
      const bufSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
      filter.Q.setValueAtTime(4.0, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, now);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      return;
    }

    if (effect === 'metro_chime') {
      // Official Dhaka Metro 4-tone melodic arrival chime (C5 -> E5 -> G5 -> C6) + traction motor resonance
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t0 = now + idx * 0.13;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.22 * this.sfxVolume, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t0);
        osc.stop(t0 + 0.36);
      });
      // Soft electric traction motor hum
      const humOsc = this.ctx.createOscillator();
      const humGain = this.ctx.createGain();
      humOsc.type = 'triangle';
      humOsc.frequency.setValueAtTime(110, now);
      humOsc.frequency.linearRampToValueAtTime(165, now + 0.5);
      humGain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
      humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      humOsc.connect(humGain);
      humGain.connect(this.ctx.destination);
      humOsc.start(now);
      humOsc.stop(now + 0.56);
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
    if (this.radioInterval) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  public setVolumes(music: number, sfx: number, ambience: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.ambienceVolume = ambience;
    this.setRainActive(this.isRaining);
    if (this.ctx) {
      if (this.trafficGain) {
        this.trafficGain.gain.setTargetAtTime(
          0.22 * this.ambienceVolume,
          this.ctx.currentTime,
          0.2
        );
      }
      if (this.crowdGain) {
        this.crowdGain.gain.setTargetAtTime(
          this.currentCrowdDensity * 0.18 * this.ambienceVolume,
          this.ctx.currentTime,
          0.2
        );
      }
    }
  }
}

export const dhakaAudio = new DhakaAudioEngine();
