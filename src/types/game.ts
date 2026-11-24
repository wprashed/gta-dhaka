export type Language = 'en' | 'bn';

export type DistrictId =
  | 'old_dhaka'
  | 'sadarghat'
  | 'motijheel'
  | 'dhanmondi'
  | 'farmgate'
  | 'hatirjheel'
  | 'gulshan'
  | 'banani'
  | 'uttara'
  | 'airport_road'
  | 'mirpur'
  | 'purbachal'
  | 'bashundhara'
  | 'keraniganj';

export interface DistrictInfo {
  id: DistrictId;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
  color: string;
  vibeEn: string;
  vibeBn: string;
}

export type VehicleType =
  | 'cng'
  | 'rickshaw'
  | 'bus'
  | 'motorcycle'
  | 'car'
  | 'pickup'
  | 'police';

export interface VehicleStats {
  type: VehicleType;
  nameEn: string;
  nameBn: string;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  turnSpeed: number;
  driftFactor: number;
  maxHealth: number;
  width: number;
  length: number;
  height: number;
  hornPitch: number;
  hornType: 'cng' | 'bell' | 'airhorn' | 'car' | 'siren';
  price: number;
}

export interface VehicleEntity {
  id: string;
  type: VehicleType;
  x: number;
  y: number;
  z: number;
  rotation: number;
  speed: number;
  steering: number;
  health: number;
  maxHealth: number;
  color: string;
  isTraffic: boolean;
  isPolice?: boolean;
  aiTargetX?: number;
  aiTargetZ?: number;
  aiLaneOffset?: number;
  aiWaitTimer?: number;
  plateNumber: string;
}

export type NPCRole =
  | 'rickshaw_puller'
  | 'shopkeeper'
  | 'street_vendor'
  | 'student'
  | 'office_worker'
  | 'police_officer'
  | 'tea_seller'
  | 'security_guard'
  | 'story_contact';

export interface NPCEntity {
  id: string;
  nameEn: string;
  nameBn: string;
  role: NPCRole;
  x: number;
  z: number;
  rotation: number;
  shirtColor: string;
  pantsColor: string;
  hasPanjabi?: boolean;
  hasSaree?: boolean;
  isStoryNPC?: boolean;
  storyId?: string;
  dialogueEn: string[];
  dialogueBn: string[];
  aiState: 'walk' | 'idle' | 'vendor' | 'flee' | 'patrol' | 'dead';
  walkTargetX: number;
  walkTargetZ: number;
  health: number;
  isDead?: boolean;
  respawnTimer?: number;
}

export type POIType =
  | 'tea_stall'
  | 'fuchka_stall'
  | 'biriyani_shop'
  | 'garage'
  | 'clothing_shop'
  | 'safe_house'
  | 'mosque'
  | 'ferry_ghat'
  | 'police_box';

export interface PointOfInterest {
  id: string;
  type: POIType;
  nameEn: string;
  nameBn: string;
  district: DistrictId;
  x: number;
  z: number;
  cost: number;
  actionLabelEn: string;
  actionLabelBn: string;
}

export type MissionCategory =
  | 'story'
  | 'delivery'
  | 'chase'
  | 'investigation'
  | 'race'
  | 'rescue';

export interface MissionStep {
  id: string;
  instructionEn: string;
  instructionBn: string;
  targetX: number;
  targetZ: number;
  radius: number;
  requireVehicleType?: VehicleType;
  requireInteraction?: boolean;
  requireWantedZero?: boolean;
  dialogueSpeakerEn?: string;
  dialogueSpeakerBn?: string;
  dialogueTextEn?: string;
  dialogueTextBn?: string;
  timeLimitSeconds?: number;
  spawnWantedLevel?: number;
  choicePrompt?: {
    questionEn: string;
    questionBn: string;
    optionAEn: string;
    optionABn: string;
    optionBEn: string;
    optionBBn: string;
    bonusA: number;
    bonusB: number;
  };
}

export interface MissionDefinition {
  id: string;
  chapter: number;
  chapterTitleEn: string;
  chapterTitleBn: string;
  titleEn: string;
  titleBn: string;
  category: MissionCategory;
  descriptionEn: string;
  descriptionBn: string;
  giverNameEn: string;
  giverNameBn: string;
  district: DistrictId;
  startX: number;
  startZ: number;
  rewardTaka: number;
  isSideMission?: boolean;
  steps: MissionStep[];
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  titleEn: string;
  titleBn: string;
  amount: number;
  type: 'earn' | 'spend';
}

export type WeatherType = 'clear' | 'golden_hour' | 'monsoon_rain' | 'night';

export type RadioStationId = 'off' | 'dhaka_folk' | 'gully_beat' | 'hatirjheel_synth';

export interface PlayerOutfit {
  id: string;
  nameEn: string;
  nameBn: string;
  shirtColor: string;
  pantsColor: string;
  accentColor: string;
  price: number;
  unlocked: boolean;
}

export type ToolWeaponId =
  | 'fists'
  | 'ramda'
  | 'chapati_cleaver'
  | 'bamboo_lathi'
  | 'cricket_bat'
  | 'stun_baton'
  | 'deshi_pipegun'
  | 'pistol_9mm'
  | 'bd08_rifle'
  | 'police_shotgun'
  | 'smg_uzi';

export interface ToolWeapon {
  id: ToolWeaponId;
  nameEn: string;
  nameBn: string;
  damage: number;
  range: number;
  price: number;
  unlocked: boolean;
  category?: 'melee' | 'local_arm' | 'firearm';
  isFirearm?: boolean;
  fireRate?: number;
  pellets?: number;
  clipSize?: number;
  currentClip?: number;
  reserveAmmo?: number;
  maxReserve?: number;
}
