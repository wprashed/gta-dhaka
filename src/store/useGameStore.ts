import { create } from 'zustand';
import {
  DistrictId,
  Language,
  MissionStep,
  PlayableCharacterId,
  PlayerOutfit,
  RadioStationId,
  ToolWeapon,
  ToolWeaponId,
  TransactionRecord,
  VehicleType,
  WeatherType,
} from '../types/game';
import {
  PLAYABLE_CHARACTERS,
  PLAYER_OUTFITS,
  SIDE_MISSIONS,
  STORY_MISSIONS,
  TOOL_WEAPONS,
} from '../data/dhakaWorldData';
import { dhakaAudio } from '../audio/dhakaAudioEngine';

export type GamePhase = 'main_menu' | 'playing' | 'paused';
export type PauseTab =
  | 'map'
  | 'missions'
  | 'sketchfab'
  | 'inventory'
  | 'character'
  | 'settings'
  | 'controls';

export interface NearbyPrompt {
  type: 'vehicle' | 'poi' | 'npc' | 'mission' | 'mall_shop';
  id: string;
  labelEn: string;
  labelBn: string;
}

interface GameState {
  gamePhase: GamePhase;
  pauseTab: PauseTab;
  language: Language;
  graphicsQuality: 'high' | 'low';
  cameraMode: 'third_person' | 'far_chase' | 'hood_close';

  // Player & Vehicle telemetry
  playerX: number;
  playerZ: number;
  playerRotation: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  stamina: number;
  isSwimming: boolean;
  taka: number;
  inVehicleId: string | null;
  currentVehicleType: VehicleType | null;
  currentVehicleSpeedKmh: number;
  currentVehicleHealth: number;
  currentVehicleMaxHealth: number;
  currentVehicleFuel: number;
  currentVehicleGear: string;
  currentDistrict: DistrictId;

  // Customization & inventory
  selectedCharacterId: PlayableCharacterId;
  outfits: PlayerOutfit[];
  equippedOutfitId: string;
  tools: ToolWeapon[];
  equippedToolId: ToolWeaponId;
  transactions: TransactionRecord[];

  // World & Police
  wantedLevel: number;
  wantedCooldown: number;
  timeOfDay: number; // 0 - 24
  weather: WeatherType;
  radioStation: RadioStationId;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;

  // Missions & Narrative
  activeMissionId: string | null;
  activeMissionStepIndex: number;
  missionTimer: number | null;
  completedMissionIds: string[];
  storyHonor: number;
  storyEndingEn: string | null;
  storyEndingBn: string | null;

  // Interactive overlays
  nearbyPrompt: NearbyPrompt | null;
  activeDialogue: {
    speakerEn: string;
    speakerBn: string;
    textEn: string;
    textBn: string;
  } | null;
  activeChoicePrompt: MissionStep['choicePrompt'] | null;
  bannerAlert: {
    titleEn: string;
    titleBn: string;
    subtitleEn: string;
    subtitleBn: string;
    rewardTaka?: number;
    tone: 'gold' | 'green' | 'red' | 'blue';
  } | null;
  customWaypoint: { x: number; z: number; name: string } | null;

  // Gameplay status flags
  isWasted: boolean;
  isBusted: boolean;

  // Engine command bridge callbacks
  spawnVehicleRequest: VehicleType | null;
  spawnSketchfabRequest: {
    spawnType: string;
    thumbnail: string;
    name: string;
  } | null;
  customGlbUrlRequest: string | null;
  repairVehicleRequest: boolean;
  resprayVehicleRequest: string | null;
  upgradeVehicleRequest: boolean;
  teleportRequest: { x: number; z: number } | null;
  metroRideRequest: { fromId: string; toId: string } | null;
  metroDisembarkRequest: boolean;
  activeMetroRide: {
    line: 'L6' | 'L5';
    fromNameEn: string;
    fromNameBn: string;
    toNameEn: string;
    toNameBn: string;
    progress: number;
    speedKmh: number;
    isTransferring: boolean;
  } | null;
  switchCharacterRequest: PlayableCharacterId | null;

  // Mall interior & interactive modals & side-jobs
  isInsideMall: boolean;
  mallId: string | null;
  mallFloor: number; // 0 = ground, 1 = first, 2 = second, 3 = food court / rooftop
  enterMall: (mallId: string) => void;
  exitMall: () => void;
  setMallFloor: (floor: number) => void;

  activeShopModal: {
    shopId: string;
    titleEn: string;
    titleBn: string;
    category: 'fashion' | 'food' | 'cinema' | 'tech' | 'arcade' | 'atm' | 'books' | 'footwear';
    cost: number;
  } | null;
  openShopModal: (shop: NonNullable<GameState['activeShopModal']>) => void;
  closeShopModal: () => void;

  activeMetroModal: string | null; // station id near player
  openMetroModal: (stationId: string) => void;
  closeMetroModal: () => void;
  requestMetroRide: (fromId: string, toId: string) => void;
  setActiveMetroRide: (ride: GameState['activeMetroRide']) => void;
  requestMetroDisembark: () => void;

  activeGarageModal: string | null; // garage poi id
  openGarageModal: (garageId: string) => void;
  closeGarageModal: () => void;
  requestResprayVehicle: (color: string) => void;
  requestUpgradeVehicle: () => void;

  activeFareJob: {
    id: string;
    passengerNameEn: string;
    passengerNameBn: string;
    dropNameEn: string;
    dropNameBn: string;
    dropX: number;
    dropZ: number;
    reward: number;
    timeLeft: number;
  } | null;
  startFareJob: (job: NonNullable<GameState['activeFareJob']>) => void;
  tickFareJob: (dt: number) => void;
  completeFareJob: () => void;
  cancelFareJob: () => void;

  // Actions
  startNewGame: () => void;
  continueGame: () => void;
  setGamePhase: (phase: GamePhase, tab?: PauseTab) => void;
  setPauseTab: (tab: PauseTab) => void;
  toggleLanguage: () => void;
  setGraphicsQuality: (q: 'high' | 'low') => void;
  cycleCameraMode: () => void;

  updateTelemetry: (data: {
    x: number;
    z: number;
    rotation: number;
    district: DistrictId;
    inVehicleId: string | null;
    vehicleType: VehicleType | null;
    speedKmh: number;
    vehicleHealth: number;
    vehicleMaxHealth: number;
    vehicleFuel?: number;
    vehicleGear?: string;
    stamina?: number;
    isSwimming?: boolean;
  }) => void;

  setNearbyPrompt: (prompt: NearbyPrompt | null) => void;
  setDialogue: (
    dialogue: {
      speakerEn: string;
      speakerBn: string;
      textEn: string;
      textBn: string;
    } | null
  ) => void;

  addTaka: (amount: number, titleEn: string, titleBn: string) => void;
  spendTaka: (amount: number, titleEn: string, titleBn: string) => boolean;
  damagePlayer: (amount: number) => void;
  healPlayer: (healthGain: number, armorGain?: number) => void;

  setWantedLevel: (level: number) => void;
  tickWorldClock: (dt: number, policePursuing?: boolean) => void;
  setWeather: (weather: WeatherType) => void;
  setTimeOfDay: (hour: number) => void;
  setRadioStation: (station: RadioStationId) => void;
  setVolumes: (music: number, sfx: number, ambience: number) => void;

  startMission: (missionId: string) => void;
  advanceMissionStep: () => void;
  resolveMissionChoice: (option: 'A' | 'B') => void;
  abandonMission: () => void;

  selectCharacter: (charId: PlayableCharacterId) => void;
  equipOutfit: (outfitId: string) => void;
  equipTool: (toolId: ToolWeaponId) => void;
  cycleTool: (dir?: 1 | -1) => void;
  setCustomWaypoint: (wp: { x: number; z: number; name: string } | null) => void;
  requestSpawnVehicle: (type: VehicleType | null) => void;
  requestSpawnSketchfabAsset: (req: {
    spawnType: string;
    thumbnail: string;
    name: string;
  }) => void;
  requestCustomGlbUrl: (url: string) => void;
  requestRepairVehicle: () => void;
  clearEngineRequests: () => void;
  requestTeleport: (x: number, z: number) => void;

  triggerWasted: () => void;
  triggerBusted: () => void;
  consumeAmmo: (toolId: ToolWeaponId) => boolean;
  reloadCurrentWeapon: () => boolean;
  addAmmo: (toolId: ToolWeaponId, count: number) => void;

  showBanner: (banner: GameState['bannerAlert']) => void;
  saveGameToStorage: () => void;
  hasSavedGame: () => boolean;
}

const SAVE_KEY = 'dhaka_city_save_v1';

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: 'playing',
  pauseTab: 'map',
  language: 'en',
  graphicsQuality: 'high',
  cameraMode: 'third_person',

  playerX: 6,
  playerZ: 16,
  playerRotation: Math.PI,
  health: 100,
  maxHealth: 100,
  armor: 35,
  maxArmor: 100,
  stamina: 100,
  isSwimming: false,
  taka: 1850,
  inVehicleId: null,
  currentVehicleType: null,
  currentVehicleSpeedKmh: 0,
  currentVehicleHealth: 120,
  currentVehicleMaxHealth: 120,
  currentVehicleFuel: 100,
  currentVehicleGear: 'P',
  currentDistrict: 'farmgate',
  isWasted: false,
  isBusted: false,

  selectedCharacterId: 'arif',
  outfits: PLAYER_OUTFITS,
  equippedOutfitId: 'modern_bomber',
  tools: TOOL_WEAPONS,
  equippedToolId: 'fists',
  transactions: [
    {
      id: 'tx_init',
      timestamp: '15:30',
      titleEn: 'Arrival Cash at Hazrat Shahjalal Airport',
      titleBn: 'ঢাকায় আগমনী নগদ অর্থ',
      amount: 1850,
      type: 'earn',
    },
  ],

  wantedLevel: 0,
  wantedCooldown: 0,
  timeOfDay: 15.5,
  weather: 'clear',
  radioStation: 'dhaka_folk',
  musicVolume: 0.45,
  sfxVolume: 0.7,
  ambienceVolume: 0.4,

  activeMissionId: 'm1_back_to_dhaka',
  activeMissionStepIndex: 0,
  missionTimer: null,
  completedMissionIds: [],
  storyHonor: 0,
  storyEndingEn: null,
  storyEndingBn: null,

  nearbyPrompt: null,
  activeDialogue: {
    speakerEn: 'Arif Rahman',
    speakerBn: 'আরিফ রহমান',
    textEn:
      'Back in Farmgate after three years... Traffic horns, roasting peanuts, and green CNGs everywhere. Let’s find Uncle Kamal at his Tong Cha Stall to find out what happened to Rafiq.',
    textBn:
      'তিন বছর পর আবার ফার্মগেটে ফিরলাম... চারদিকে বাসের হর্ন, রিকশার টুংটাং আর সবুজ সিএনজি। চলুন কামাল মামার টং দোকানে গিয়ে রফিকের খোঁজ নিই।',
  },
  activeChoicePrompt: null,
  bannerAlert: null,
  customWaypoint: null,

  spawnVehicleRequest: null,
  spawnSketchfabRequest: null,
  customGlbUrlRequest: null,
  repairVehicleRequest: false,
  resprayVehicleRequest: null,
  upgradeVehicleRequest: false,
  teleportRequest: null,
  metroRideRequest: null,
  metroDisembarkRequest: false,
  activeMetroRide: null,
  switchCharacterRequest: null,

  // Mall interior & modals
  isInsideMall: false,
  mallId: null,
  mallFloor: 0,
  activeShopModal: null,
  activeMetroModal: null,
  activeGarageModal: null,
  activeFareJob: null,

  startNewGame: () => {
    dhakaAudio.init();
    dhakaAudio.playSfx('ui');
    set({
      gamePhase: 'playing',
      health: 100,
      armor: 35,
      stamina: 100,
      taka: 1850,
      wantedLevel: 0,
      wantedCooldown: 0,
      activeMissionId: 'm1_back_to_dhaka',
      activeMissionStepIndex: 0,
      missionTimer: null,
      completedMissionIds: [],
      storyHonor: 0,
      storyEndingEn: null,
      storyEndingBn: null,
      selectedCharacterId: 'arif',
      outfits: PLAYER_OUTFITS,
      equippedOutfitId: 'modern_bomber',
      tools: TOOL_WEAPONS,
      equippedToolId: 'fists',
      transactions: [],
      isInsideMall: false,
      mallId: null,
      mallFloor: 0,
      activeShopModal: null,
      activeMetroModal: null,
      activeMetroRide: null,
      metroRideRequest: null,
      metroDisembarkRequest: false,
      activeGarageModal: null,
      activeFareJob: null,
      customWaypoint: null,
      isWasted: false,
      isBusted: false,
      teleportRequest: { x: 10, z: 18 },
      activeDialogue: {
        speakerEn: 'Arif Rahman (Chapter 1: Back to Dhaka)',
        speakerBn: 'আরিফ রহমান (অধ্যায় ১: ঢাকায় প্রত্যাবর্তন)',
        textEn:
          'Welcome to Dhaka! Walk over to Kamal Mama’s Tong Cha Stall (Golden Pillar Marker) or press [F] near any green CNG Auto-Rickshaw to drive through the city!',
        textBn:
          'ঢাকা সিটিতে স্বাগতম! কামাল মামার টং দোকানে যান (হলুদ মার্কার) অথবা যেকোনো সবুজ সিএনজি অটোরিকশার কাছে গিয়ে [F] চেপে চালানো শুরু করুন!',
      },
    });
  },

  continueGame: () => {
    dhakaAudio.init();
    dhakaAudio.playSfx('ui');
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const savedTools = Array.isArray(data.tools) ? data.tools : null;
        const mergedTools = savedTools
          ? TOOL_WEAPONS.map((def) => {
              const found = savedTools.find((t: ToolWeapon) => t.id === def.id);
              return found
                ? {
                    ...def,
                    unlocked: Boolean(found.unlocked),
                    currentClip: found.currentClip ?? def.currentClip,
                    reserveAmmo: found.reserveAmmo ?? def.reserveAmmo,
                  }
                : def;
            })
          : TOOL_WEAPONS;
        const savedOutfits = Array.isArray(data.outfits) ? data.outfits : null;
        const mergedOutfits = savedOutfits
          ? PLAYER_OUTFITS.map((def) => {
              const found = savedOutfits.find((o: PlayerOutfit) => o.id === def.id);
              return found ? { ...def, unlocked: Boolean(found.unlocked) } : def;
            })
          : PLAYER_OUTFITS;

        set({
          gamePhase: 'playing',
          taka: data.taka ?? 1850,
          health: data.health ?? 100,
          armor: data.armor ?? 35,
          completedMissionIds: data.completedMissionIds ?? [],
          activeMissionId: data.activeMissionId !== undefined ? data.activeMissionId : 'm1_back_to_dhaka',
          activeMissionStepIndex: data.activeMissionStepIndex ?? 0,
          selectedCharacterId: data.selectedCharacterId ?? 'arif',
          equippedOutfitId: data.equippedOutfitId ?? 'modern_bomber',
          equippedToolId: data.equippedToolId ?? 'fists',
          outfits: mergedOutfits,
          tools: mergedTools,
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          storyHonor: data.storyHonor ?? 0,
          storyEndingEn: data.storyEndingEn ?? null,
          storyEndingBn: data.storyEndingBn ?? null,
          teleportRequest: {
            x: data.playerX ?? 10,
            z: data.playerZ ?? 18,
          },
        });
        get().showBanner({
          titleEn: 'SAVED GAME LOADED',
          titleBn: 'সেভ করা গেম লোড হয়েছে',
          subtitleEn: 'Welcome back to the streets of Dhaka, Arif.',
          subtitleBn: 'ঢাকার রাজপথে আবার স্বাগতম, আরিফ।',
          tone: 'green',
        });
        return;
      }
    } catch {
      // Fallback to new game
    }
    get().startNewGame();
  },

  setGamePhase: (phase, tab) => {
    dhakaAudio.playSfx('ui');
    set((s) => ({
      gamePhase: phase,
      pauseTab: tab ?? s.pauseTab,
    }));
  },

  setPauseTab: (tab) => {
    dhakaAudio.playSfx('ui');
    set({ pauseTab: tab });
  },

  toggleLanguage: () => {
    dhakaAudio.playSfx('ui');
    set((s) => ({ language: s.language === 'en' ? 'bn' : 'en' }));
  },

  setGraphicsQuality: (q) => set({ graphicsQuality: q }),

  cycleCameraMode: () => {
    const modes: GameState['cameraMode'][] = [
      'third_person',
      'far_chase',
      'hood_close',
    ];
    const current = get().cameraMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ cameraMode: next });
  },

  updateTelemetry: (data) => {
    set((s) => ({
      playerX: data.x,
      playerZ: data.z,
      playerRotation: data.rotation,
      currentDistrict: data.district,
      inVehicleId: data.inVehicleId,
      currentVehicleType: data.vehicleType,
      currentVehicleSpeedKmh: data.speedKmh,
      currentVehicleHealth: data.vehicleHealth,
      currentVehicleMaxHealth: data.vehicleMaxHealth,
      currentVehicleFuel: data.vehicleFuel ?? 100,
      currentVehicleGear: data.vehicleGear ?? 'P',
      stamina: data.stamina ?? s.stamina,
      isSwimming: data.isSwimming ?? false,
    }));
  },

  setNearbyPrompt: (prompt) => set({ nearbyPrompt: prompt }),

  setDialogue: (dialogue) => set({ activeDialogue: dialogue }),

  addTaka: (amount, titleEn, titleBn) => {
    dhakaAudio.playSfx('cash');
    const nowStr = formatGameClock(get().timeOfDay);
    set((s) => ({
      taka: s.taka + amount,
      transactions: [
        {
          id: 'tx_' + Date.now() + Math.random(),
          timestamp: nowStr,
          titleEn,
          titleBn,
          amount,
          type: 'earn',
        },
        ...s.transactions.slice(0, 24),
      ],
    }));
  },

  spendTaka: (amount, titleEn, titleBn) => {
    const state = get();
    if (state.taka < amount) return false;
    dhakaAudio.playSfx('cash');
    const nowStr = formatGameClock(state.timeOfDay);
    set((s) => ({
      taka: s.taka - amount,
      transactions: [
        {
          id: 'tx_' + Date.now() + Math.random(),
          timestamp: nowStr,
          titleEn,
          titleBn,
          amount,
          type: 'spend',
        },
        ...s.transactions.slice(0, 24),
      ],
    }));
    return true;
  },

  damagePlayer: (amount) => {
    dhakaAudio.playSfx('hit');
    set((s) => {
      // Kabir "Iron Fist": heavy damage resistance (-22% incoming damage)
      let remaining = s.selectedCharacterId === 'kabir' ? amount * 0.78 : amount;
      let newArmor = s.armor;
      if (newArmor > 0) {
        const absorbed = Math.min(newArmor, remaining * 0.65);
        newArmor = Math.max(0, newArmor - absorbed);
        remaining -= absorbed;
      }
      const newHealth = Math.max(0, s.health - remaining);

      if (newHealth <= 0 && !s.isWasted) {
        setTimeout(() => {
          get().triggerWasted();
        }, 10);
      }

      return { health: newHealth, armor: newArmor };
    });
  },

  triggerWasted: () => {
    const s = get();
    if (s.isWasted) return;
    dhakaAudio.playSfx('wasted');
    set({
      isWasted: true,
      inVehicleId: null,
      currentVehicleType: null,
      bannerAlert: {
        titleEn: 'WASTED',
        titleBn: 'আহত / নিহত',
        subtitleEn: 'Admitted to Dhaka Medical College Hospital emergency ward (-৳200).',
        subtitleBn: 'ঢাকা মেডিকেল কলেজ হাসপাতালের জরুরি বিভাগে ভর্তি করা হয়েছে (-৳২০০)।',
        tone: 'red',
      },
    });

    setTimeout(() => {
      set((st) => ({
        isWasted: false,
        health: 100,
        armor: 0,
        stamina: 100,
        wantedLevel: 0,
        wantedCooldown: 0,
        taka: Math.max(0, st.taka - 200),
        teleportRequest: { x: -30, z: 125 }, // DMCH emergency ward courtyard
        bannerAlert: {
          titleEn: 'DISCHARGED FROM DHAKA MEDICAL',
          titleBn: 'ঢাকা মেডিকেল থেকে ছাড়পত্র প্রাপ্ত',
          subtitleEn: 'Emergency care bill ৳200 settled. Stay vigilant in Dhaka!',
          subtitleBn: 'চিকিৎসা খরচ বাবদ ৳২০০ পরিশোধিত। সাবধানে চলুন!',
          tone: 'blue',
        },
      }));
    }, 2800);
  },

  triggerBusted: () => {
    const s = get();
    if (s.isBusted || s.isWasted) return;
    dhakaAudio.playSfx('busted');
    set({
      isBusted: true,
      inVehicleId: null,
      currentVehicleType: null,
      bannerAlert: {
        titleEn: 'BUSTED!',
        titleBn: 'গ্রেফতার!',
        subtitleEn: 'Detained by DMP Traffic Police patrol.',
        subtitleBn: 'ডিএমপি ট্রাফিক পুলিশ আপনাকে আটক করেছে।',
        tone: 'gold',
      },
    });

    setTimeout(() => {
      set((st) => ({
        isBusted: false,
        health: 100,
        wantedLevel: 0,
        wantedCooldown: 0,
        taka: Math.max(0, st.taka - 500),
        tools: st.tools.map((t) =>
          t.isFirearm
            ? {
                ...t,
                currentClip: 0,
                reserveAmmo: Math.floor((t.reserveAmmo ?? 0) * 0.5),
              }
            : t
        ),
        teleportRequest: { x: 10, z: -10 }, // Farmgate Police Box
        bannerAlert: {
          titleEn: 'RELEASED FROM DMP POLICE BOX',
          titleBn: 'ফার্মগেট পুলিশ বক্স থেকে মুক্তি',
          subtitleEn: 'Bail fine ৳500 paid & loose firearm ammo confiscated.',
          subtitleBn: 'জামিন ৳৫০০ পরিশোধিত ও অবৈধ গুলি জব্দ করা হয়েছে।',
          tone: 'green',
        },
      }));
    }, 2800);
  },

  consumeAmmo: (toolId) => {
    let fired = false;
    set((s) => {
      const updatedTools = s.tools.map((t) => {
        if (t.id === toolId && t.isFirearm) {
          const current = t.currentClip ?? 1;
          if (current > 0) {
            fired = true;
            return { ...t, currentClip: current - 1 };
          }
        }
        return t;
      });
      return { tools: updatedTools };
    });
    return fired;
  },

  reloadCurrentWeapon: () => {
    let reloaded = false;
    set((s) => {
      const activeTool = s.tools.find((t) => t.id === s.equippedToolId);
      if (!activeTool || !activeTool.isFirearm) return {};
      const clipSize = activeTool.clipSize ?? 12;
      const currentClip = activeTool.currentClip ?? 0;
      const reserve = activeTool.reserveAmmo ?? 0;
      const needed = clipSize - currentClip;

      if (needed <= 0 || reserve <= 0) return {};

      const transfer = Math.min(needed, reserve);
      dhakaAudio.playSfx('reload');
      reloaded = true;

      const updatedTools = s.tools.map((t) => {
        if (t.id === activeTool.id) {
          return {
            ...t,
            currentClip: currentClip + transfer,
            reserveAmmo: reserve - transfer,
          };
        }
        return t;
      });
      return { tools: updatedTools };
    });
    return reloaded;
  },

  addAmmo: (toolId, count) => {
    set((s) => {
      const updatedTools = s.tools.map((t) => {
        if (t.id === toolId && t.isFirearm) {
          const maxRes = t.maxReserve ?? 200;
          const newRes = Math.min(maxRes, (t.reserveAmmo ?? 0) + count);
          return { ...t, reserveAmmo: newRes };
        }
        return t;
      });
      return { tools: updatedTools };
    });
  },

  healPlayer: (healthGain, armorGain = 0) => {
    dhakaAudio.playSfx('pickup');
    set((s) => ({
      health: Math.min(s.maxHealth, s.health + healthGain),
      armor: Math.min(s.maxArmor, s.armor + armorGain),
    }));
  },

  setWantedLevel: (level) => {
    const clamped = Math.max(0, Math.min(5, level));
    set({
      wantedLevel: clamped,
      wantedCooldown: clamped > 0 ? 22 + clamped * 8 : 0,
    });
  },

  tickWorldClock: (dt, policePursuing = false) => {
    const s = get();
    if (s.gamePhase !== 'playing') return;

    const nextHour = (s.timeOfDay + dt * 0.025) % 24;

    let nextWanted = s.wantedLevel;
    let nextCooldown = s.wantedCooldown;
    if (nextWanted > 0) {
      if (policePursuing) {
        // Hold wanted cooldown steady while pursuing police cruisers are within 55m
        nextCooldown = Math.max(nextCooldown, 14);
      } else {
        // Nadia "Digital Ghost": wanted level cools down 35% faster
        const decayMult = s.selectedCharacterId === 'nadia' ? 1.35 : 1.0;
        nextCooldown = Math.max(0, nextCooldown - dt * decayMult);
        if (nextCooldown <= 0) {
          nextWanted = Math.max(0, nextWanted - 1);
          nextCooldown = nextWanted > 0 ? 18 : 0;
        }
      }
    }

    let nextMissionTimer = s.missionTimer;
    if (nextMissionTimer !== null && !s.activeChoicePrompt) {
      nextMissionTimer = Math.max(0, nextMissionTimer - dt);
      if (nextMissionTimer <= 0) {
        get().showBanner({
          titleEn: 'TIME EXPIRED — RETRYING STEP',
          titleBn: 'সময় শেষ — আবার চেষ্টা করুন',
          subtitleEn:
            'Dhaka traffic slowed you down! Timer reset so you can keep going.',
          subtitleBn: 'যানজটে দেরি হয়ে গেছে! সময় পুনরায় শুরু হয়েছে।',
          tone: 'red',
        });
        nextMissionTimer = 85;
      }
    }

    set({
      timeOfDay: nextHour,
      wantedLevel: nextWanted,
      wantedCooldown: nextCooldown,
      missionTimer: nextMissionTimer,
    });
  },

  setWeather: (weather) => {
    dhakaAudio.setRainActive(weather === 'monsoon_rain');
    let nextTime = get().timeOfDay;
    if (weather === 'night') nextTime = 21.5;
    if (weather === 'golden_hour') nextTime = 17.2;
    if (weather === 'clear') nextTime = 11.5;
    set({ weather, timeOfDay: nextTime });
  },

  setTimeOfDay: (hour) => set({ timeOfDay: hour % 24 }),

  setRadioStation: (station) => {
    dhakaAudio.init();
    dhakaAudio.setRadioStation(station);
    set({ radioStation: station });
  },

  setVolumes: (music, sfx, ambience) => {
    dhakaAudio.setVolumes(music, sfx, ambience);
    set({ musicVolume: music, sfxVolume: sfx, ambienceVolume: ambience });
  },

  startMission: (missionId) => {
    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const mission = allMissions.find((m) => m.id === missionId);
    if (!mission) return;

    const firstStep = mission.steps[0];
    dhakaAudio.playSfx('pickup');

    set({
      activeMissionId: mission.id,
      activeMissionStepIndex: 0,
      missionTimer: firstStep.timeLimitSeconds ?? null,
      gamePhase: 'playing',
      activeDialogue: firstStep.dialogueTextEn
        ? {
            speakerEn: firstStep.dialogueSpeakerEn || mission.giverNameEn,
            speakerBn: firstStep.dialogueSpeakerBn || mission.giverNameBn,
            textEn: firstStep.dialogueTextEn,
            textBn: firstStep.dialogueTextBn || firstStep.dialogueTextEn,
          }
        : null,
    });

    get().showBanner({
      titleEn: `MISSION STARTED: ${mission.titleEn.toUpperCase()}`,
      titleBn: `মিশন শুরু: ${mission.titleBn}`,
      subtitleEn: mission.chapterTitleEn,
      subtitleBn: mission.chapterTitleBn,
      tone: 'blue',
    });
  },

  advanceMissionStep: () => {
    const s = get();
    if (!s.activeMissionId) return;

    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const mission = allMissions.find((m) => m.id === s.activeMissionId);
    if (!mission) return;

    const currentStep = mission.steps[s.activeMissionStepIndex];

    if (currentStep.dialogueTextEn) {
      set({
        activeDialogue: {
          speakerEn: currentStep.dialogueSpeakerEn || mission.giverNameEn,
          speakerBn: currentStep.dialogueSpeakerBn || mission.giverNameBn,
          textEn: currentStep.dialogueTextEn,
          textBn: currentStep.dialogueTextBn || currentStep.dialogueTextEn,
        },
      });
    }

    if (currentStep.spawnWantedLevel) {
      get().setWantedLevel(
        Math.max(s.wantedLevel, currentStep.spawnWantedLevel)
      );
    }

    if (currentStep.choicePrompt && !s.activeChoicePrompt) {
      set({ activeChoicePrompt: currentStep.choicePrompt });
      return;
    }

    const nextIndex = s.activeMissionStepIndex + 1;
    if (nextIndex < mission.steps.length) {
      const nextStep = mission.steps[nextIndex];
      dhakaAudio.playSfx('pickup');
      set({
        activeMissionStepIndex: nextIndex,
        missionTimer: nextStep.timeLimitSeconds ?? s.missionTimer,
      });
    } else {
      dhakaAudio.playSfx('mission_complete');
      get().addTaka(
        mission.rewardTaka,
        `Mission Reward: ${mission.titleEn}`,
        `মিশন পুরস্কার: ${mission.titleBn}`
      );

      const updatedCompleted = Array.from(
        new Set([...s.completedMissionIds, mission.id])
      );

      const nextStory = STORY_MISSIONS.find(
        (m) => !updatedCompleted.includes(m.id)
      );

      set({
        completedMissionIds: updatedCompleted,
        activeMissionId: nextStory ? nextStory.id : null,
        activeMissionStepIndex: 0,
        missionTimer: null,
        wantedLevel: 0,
        wantedCooldown: 0,
      });

      get().showBanner({
        titleEn: `MISSION PASSED: ${mission.titleEn.toUpperCase()}`,
        titleBn: `মিশন সম্পন্ন: ${mission.titleBn}`,
        subtitleEn: nextStory
          ? `Next Up: ${nextStory.chapterTitleEn} — ${nextStory.titleEn}`
          : 'All Story Chapters Completed! Explore Dhaka & Side Missions freely!',
        subtitleBn: nextStory
          ? `পরবর্তী অধ্যায়: ${nextStory.chapterTitleBn} — ${nextStory.titleBn}`
          : 'সকল স্টোরি অধ্যায় সম্পন্ন! এবার পুরো ঢাকা শহর ঘুরে দেখুন!',
        rewardTaka: mission.rewardTaka,
        tone: 'gold',
      });

      get().saveGameToStorage();
    }
  },

  resolveMissionChoice: (option) => {
    const s = get();
    const prompt = s.activeChoicePrompt;
    if (!prompt) return;

    const bonus = option === 'A' ? prompt.bonusA : prompt.bonusB;
    const honorDelta = option === 'A' ? 10 : -5;

    if (bonus > 0) {
      get().addTaka(
        bonus,
        option === 'A' ? 'Decision Bonus (Honor Path)' : 'Syndicate Deal Bonus',
        option === 'A' ? 'সৎ সিদ্ধান্তের পুরস্কার' : 'সিন্ডিকেট চুক্তির বোনাস'
      );
    }

    if (s.activeMissionId === 'm5_final_deal') {
      set({
        storyEndingEn:
          option === 'A'
            ? 'ENDING UNLOCKED: HERO OF DHAKA — The Syndicate ledger shook Motijheel and freed Sadarghat!'
            : 'ENDING UNLOCKED: KINGPIN OF BURIGANGA — Arif rescued Rafiq and took control of the river port!',
        storyEndingBn:
          option === 'A'
            ? 'সমাপ্তি: ঢাকার নায়ক — সিন্ডিকেটের মুখোশ উন্মোচিত হয়েছে এবং রফিক উদ্ধার হয়েছে!'
            : 'সমাপ্তি: বুড়িগঙ্গার সম্রাট — রফিককে উদ্ধার করে সদরঘাটের নিয়ন্ত্রণ নিয়েছেন আরিফ!',
      });
    }

    set({
      activeChoicePrompt: null,
      storyHonor: s.storyHonor + honorDelta,
    });

    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const mission = allMissions.find((m) => m.id === s.activeMissionId);
    if (!mission) return;

    dhakaAudio.playSfx('mission_complete');
    get().addTaka(
      mission.rewardTaka,
      `Mission Reward: ${mission.titleEn}`,
      `মিশন পুরস্কার: ${mission.titleBn}`
    );

    const updatedCompleted = Array.from(
      new Set([...s.completedMissionIds, mission.id])
    );
    const nextStory = STORY_MISSIONS.find(
      (m) => !updatedCompleted.includes(m.id)
    );

    set({
      completedMissionIds: updatedCompleted,
      activeMissionId: nextStory ? nextStory.id : null,
      activeMissionStepIndex: 0,
      missionTimer: null,
      wantedLevel: 0,
    });

    get().showBanner({
      titleEn: `MISSION PASSED: ${mission.titleEn.toUpperCase()}`,
      titleBn: `মিশন সম্পন্ন: ${mission.titleBn}`,
      subtitleEn: nextStory
        ? `Unlocked ${nextStory.chapterTitleEn}`
        : 'Story Campaign Complete! Free Roam & Side Jobs Active.',
      subtitleBn: nextStory
        ? `আনলক হয়েছে: ${nextStory.chapterTitleBn}`
        : 'মূল কাহিনী সম্পন্ন! এখন ফ্রি-রোম ও সাইড মিশন খেলুন।',
      rewardTaka: mission.rewardTaka + bonus,
      tone: 'gold',
    });

    get().saveGameToStorage();
  },

  abandonMission: () => {
    set({
      activeMissionId: null,
      activeMissionStepIndex: 0,
      missionTimer: null,
      activeChoicePrompt: null,
    });
  },

  selectCharacter: (charId) => {
    const char =
      PLAYABLE_CHARACTERS.find((c) => c.id === charId) ||
      PLAYABLE_CHARACTERS[0];
    dhakaAudio.playSfx('ui');
    set({
      selectedCharacterId: charId,
      switchCharacterRequest: charId,
    });
    get().showBanner({
      titleEn: `PLAYING AS: ${char.nameEn.toUpperCase()}`,
      titleBn: `চরিত্র: ${char.nameBn}`,
      subtitleEn: `${char.taglineEn} • ${char.specialAbilityEn}`,
      subtitleBn: `${char.taglineBn} • ${char.specialAbilityBn}`,
      tone: 'gold',
    });
  },

  equipOutfit: (outfitId) => {
    const s = get();
    const target = s.outfits.find((o) => o.id === outfitId);
    if (!target) return;

    if (!target.unlocked) {
      const ok = get().spendTaka(
        target.price,
        `Bought Outfit: ${target.nameEn}`,
        `পোশাক ক্রয়: ${target.nameBn}`
      );
      if (!ok) return;
      set({
        outfits: s.outfits.map((o) =>
          o.id === outfitId ? { ...o, unlocked: true } : o
        ),
        equippedOutfitId: outfitId,
      });
    } else {
      dhakaAudio.playSfx('ui');
      set({ equippedOutfitId: outfitId });
    }
  },

  equipTool: (toolId) => {
    const s = get();
    const target = s.tools.find((t) => t.id === toolId);
    if (!target) return;

    if (!target.unlocked) {
      const ok = get().spendTaka(
        target.price,
        `Bought Gear: ${target.nameEn}`,
        `সরঞ্জাম ক্রয়: ${target.nameBn}`
      );
      if (!ok) return;
      set({
        tools: s.tools.map((t) =>
          t.id === toolId ? { ...t, unlocked: true } : t
        ),
        equippedToolId: toolId,
      });
    } else {
      dhakaAudio.playSfx('ui');
      set({ equippedToolId: toolId });
    }
  },

  cycleTool: (dir = 1) => {
    const s = get();
    const unlocked = s.tools.filter((t) => t.unlocked);
    if (unlocked.length === 0) return;
    const idx = unlocked.findIndex((t) => t.id === s.equippedToolId);
    const nextIdx = (idx + dir + unlocked.length) % unlocked.length;
    dhakaAudio.playSfx('ui');
    set({ equippedToolId: unlocked[nextIdx].id });
  },

  setCustomWaypoint: (wp) => {
    dhakaAudio.playSfx('ui');
    set({ customWaypoint: wp });
  },

  requestSpawnVehicle: (type) => set({ spawnVehicleRequest: type }),
  requestSpawnSketchfabAsset: (req) =>
    set({ spawnSketchfabRequest: req, gamePhase: 'playing' }),
  requestCustomGlbUrl: (url) =>
    set({ customGlbUrlRequest: url, gamePhase: 'playing' }),
  requestRepairVehicle: () => set({ repairVehicleRequest: true }),
  requestResprayVehicle: (color) => set({ resprayVehicleRequest: color }),
  requestUpgradeVehicle: () => set({ upgradeVehicleRequest: true }),
  clearEngineRequests: () =>
    set({
      spawnVehicleRequest: null,
      spawnSketchfabRequest: null,
      customGlbUrlRequest: null,
      repairVehicleRequest: false,
      resprayVehicleRequest: null,
      upgradeVehicleRequest: false,
      teleportRequest: null,
      metroRideRequest: null,
      metroDisembarkRequest: false,
      switchCharacterRequest: null,
    }),
  requestTeleport: (x, z) =>
    set({ teleportRequest: { x, z }, gamePhase: 'playing' }),
  requestMetroRide: (fromId, toId) =>
    set({
      metroRideRequest: { fromId, toId },
      activeMetroModal: null,
      gamePhase: 'playing',
    }),
  setActiveMetroRide: (ride) => set({ activeMetroRide: ride }),
  requestMetroDisembark: () => set({ metroDisembarkRequest: true }),

  enterMall: (mallId) => set({ isInsideMall: true, mallId, mallFloor: 0 }),
  exitMall: () => set({ isInsideMall: false, mallId: null, mallFloor: 0 }),
  setMallFloor: (floor) => set({ mallFloor: floor }),

  openShopModal: (shop) => set({ activeShopModal: shop }),
  closeShopModal: () => set({ activeShopModal: null }),
  openMetroModal: (stationId) => set({ activeMetroModal: stationId }),
  closeMetroModal: () => set({ activeMetroModal: null }),
  openGarageModal: (garageId) => set({ activeGarageModal: garageId }),
  closeGarageModal: () => set({ activeGarageModal: null }),

  startFareJob: (job) => set({ activeFareJob: job }),
  tickFareJob: (dt) => {
    const job = get().activeFareJob;
    if (!job) return;
    const nextTime = job.timeLeft - dt;
    if (nextTime <= 0) {
      set({ activeFareJob: null });
      get().showBanner({
        titleEn: 'FARE CANCELLED: TIME EXPIRED',
        titleBn: 'ভাড়ার ট্রিপ বাতিল: সময় শেষ',
        subtitleEn: 'The passenger stepped out due to Dhaka traffic delay.',
        subtitleBn: 'যানজটে দেরি হওয়ায় যাত্রী নেমে গেছেন।',
        tone: 'red',
      });
    } else {
      set({ activeFareJob: { ...job, timeLeft: nextTime } });
    }
  },
  completeFareJob: () => {
    const job = get().activeFareJob;
    if (!job) return;
    get().addTaka(
      job.reward,
      `Dhaka Fare Completed: ${job.dropNameEn}`,
      `ভাড়া সম্পন্ন: ${job.dropNameBn}`
    );
    set({ activeFareJob: null });
    get().showBanner({
      titleEn: `PASSENGER DROPPED! +৳${job.reward}`,
      titleBn: `যাত্রী পৌঁছে দেওয়া হয়েছে! +৳${job.reward}`,
      subtitleEn: `Safe arrival at ${job.dropNameEn}. Ready for the next Dhaka trip!`,
      subtitleBn: `${job.dropNameBn}-এ নিরাপদে পৌঁছে দিয়েছেন।`,
      rewardTaka: job.reward,
      tone: 'gold',
    });
  },
  cancelFareJob: () => set({ activeFareJob: null }),

  showBanner: (banner) => {
    set({ bannerAlert: banner });
    if (banner) {
      setTimeout(() => {
        if (get().bannerAlert === banner) {
          set({ bannerAlert: null });
        }
      }, 5500);
    }
  },

  saveGameToStorage: () => {
    const s = get();
    const payload = {
      taka: s.taka,
      health: s.health,
      armor: s.armor,
      playerX: s.playerX,
      playerZ: s.playerZ,
      completedMissionIds: s.completedMissionIds,
      activeMissionId: s.activeMissionId,
      activeMissionStepIndex: s.activeMissionStepIndex,
      selectedCharacterId: s.selectedCharacterId,
      equippedOutfitId: s.equippedOutfitId,
      equippedToolId: s.equippedToolId,
      outfits: s.outfits,
      tools: s.tools,
      transactions: s.transactions,
      storyHonor: s.storyHonor,
      storyEndingEn: s.storyEndingEn,
      storyEndingBn: s.storyEndingBn,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota ignore
    }
  },

  hasSavedGame: () => {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  },
}));

export function formatGameClock(hourFloat: number): string {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}
