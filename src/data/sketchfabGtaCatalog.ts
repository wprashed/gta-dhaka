import { DistrictId, POIType, VehicleType } from '../types/game';
import { resolveAssetUrl } from '../utils/assets';

export interface SketchfabGtaAsset {
  uid: string;
  name: string;
  author: string;
  likeCount: number;
  viewCount: number;
  faceCount: number;
  vertexCount: number;
  isDownloadable: boolean;
  viewerUrl: string;
  embedUrl: string;
  thumbnail: string;
  category: 'building' | 'vehicle' | 'character' | 'prop';
  spawnActionLabelEn: string;
  spawnActionLabelBn: string;
  spawnType:
    | 'city_block'
    | 'street_props'
    | 'hongkong_tower'
    | 'asian_building'
    | 'money_stacks'
    | 'asian_shop'
    | 'billboard'
    | 'hilux_pickup'
    | 'tactical_npc'
    | 'crime_scene'
    | 'briefcase';
}

export const SKETCHFAB_GTA_CATALOG: SketchfabGtaAsset[] = [
  {
    uid: '6a0e3b97a8a54f2a909d351322916293',
    name: 'Neighbourhood City Modular lowpoly',
    author: 'golukumar',
    likeCount: 2699,
    viewCount: 161782,
    faceCount: 415317,
    vertexCount: 304255,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-6a0e3b97a8a54f2a909d351322916293',
    embedUrl: 'https://sketchfab.com/models/6a0e3b97a8a54f2a909d351322916293/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_0.jpg'),
    category: 'building',
    spawnActionLabelEn: 'Spawn Modular Complex',
    spawnActionLabelBn: 'মডুলার ভবন স্থাপন করুন',
    spawnType: 'city_block',
  },
  {
    uid: '32b8b82bb1e9489c993799c91967a916',
    name: 'City Props Collection volume 1',
    author: 'TampaJoey',
    likeCount: 2427,
    viewCount: 80124,
    faceCount: 70831,
    vertexCount: 36860,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-32b8b82bb1e9489c993799c91967a916',
    embedUrl: 'https://sketchfab.com/models/32b8b82bb1e9489c993799c91967a916/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_1.jpg'),
    category: 'prop',
    spawnActionLabelEn: 'Spawn Urban Street Props',
    spawnActionLabelBn: 'রাস্তার প্রপস স্থাপন করুন',
    spawnType: 'street_props',
  },
  {
    uid: '31c1ede1fcbd49c7af85825905446ec5',
    name: 'Full Gameready City Buildings IV [HongKong]',
    author: 'abhayexe',
    likeCount: 1938,
    viewCount: 76106,
    faceCount: 369465,
    vertexCount: 211688,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-31c1ede1fcbd49c7af85825905446ec5',
    embedUrl: 'https://sketchfab.com/models/31c1ede1fcbd49c7af85825905446ec5/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_2.jpg'),
    category: 'building',
    spawnActionLabelEn: 'Spawn High-Rise Tower',
    spawnActionLabelBn: 'বহুতল ভবন স্থাপন করুন',
    spawnType: 'hongkong_tower',
  },
  {
    uid: 'd3d7c14c576547e8912df310eb1f0476',
    name: 'Asian Buildings Set',
    author: 'golukumar',
    likeCount: 990,
    viewCount: 30981,
    faceCount: 299382,
    vertexCount: 225803,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-d3d7c14c576547e8912df310eb1f0476',
    embedUrl: 'https://sketchfab.com/models/d3d7c14c576547e8912df310eb1f0476/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_4.jpg'),
    category: 'building',
    spawnActionLabelEn: 'Spawn Asian Apartment Block',
    spawnActionLabelBn: 'এশিয়ান অ্যাপার্টমেন্ট স্থাপন',
    spawnType: 'asian_building',
  },
  {
    uid: 'a9ce7f1cd9614376b39a96a1698d9109',
    name: 'Money Stacks Low Poly',
    author: 'Michael V',
    likeCount: 976,
    viewCount: 35427,
    faceCount: 7654,
    vertexCount: 4244,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-a9ce7f1cd9614376b39a96a1698d9109',
    embedUrl: 'https://sketchfab.com/models/a9ce7f1cd9614376b39a96a1698d9109/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_5.jpg'),
    category: 'prop',
    spawnActionLabelEn: 'Drop Cash Pallet (+৳2,500)',
    spawnActionLabelBn: 'টাকার বান্ডিল ড্রপ (+৳২,৫০০)',
    spawnType: 'money_stacks',
  },
  {
    uid: '2f603ad8d5c640f7b9794f6916f9fbdd',
    name: 'Asian Shop Pack Free Gameready',
    author: 'abhayexe',
    likeCount: 777,
    viewCount: 25954,
    faceCount: 39203,
    vertexCount: 21977,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-2f603ad8d5c640f7b9794f6916f9fbdd',
    embedUrl: 'https://sketchfab.com/models/2f603ad8d5c640f7b9794f6916f9fbdd/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_8.jpg'),
    category: 'building',
    spawnActionLabelEn: 'Spawn Asian Street Shopfront',
    spawnActionLabelBn: 'দোকান স্থাপন করুন',
    spawnType: 'asian_shop',
  },
  {
    uid: '20d1a51fbfa94373900e29de74a0f9ee',
    name: 'Billboard (.psd layered texture maps included)',
    author: 'TampaJoey',
    likeCount: 674,
    viewCount: 18410,
    faceCount: 11316,
    vertexCount: 6789,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-20d1a51fbfa94373900e29de74a0f9ee',
    embedUrl: 'https://sketchfab.com/models/20d1a51fbfa94373900e29de74a0f9ee/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_10.jpg'),
    category: 'prop',
    spawnActionLabelEn: 'Spawn Highway Billboard',
    spawnActionLabelBn: 'হাইওয়ে বিলবোর্ড স্থাপন',
    spawnType: 'billboard',
  },
  {
    uid: '82bd37c5065040098fb0b86e07fcb959',
    name: '2022 Toyota Hilux',
    author: 'BHP3D',
    likeCount: 670,
    viewCount: 69342,
    faceCount: 982566,
    vertexCount: 554041,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-82bd37c5065040098fb0b86e07fcb959',
    embedUrl: 'https://sketchfab.com/models/82bd37c5065040098fb0b86e07fcb959/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_11.jpg'),
    category: 'vehicle',
    spawnActionLabelEn: 'Drive 2022 Toyota Hilux Pickup',
    spawnActionLabelBn: 'টয়োটা হাইলাক্স পিকআপ চালান',
    spawnType: 'hilux_pickup',
  },
  {
    uid: '514ae7c16ba24d7db82bf05d0974c7e9',
    name: 'Assistant - Tactical Bodysuit',
    author: 'rexxgta1993',
    likeCount: 659,
    viewCount: 28040,
    faceCount: 96673,
    vertexCount: 50000,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-514ae7c16ba24d7db82bf05d0974c7e9',
    embedUrl: 'https://sketchfab.com/models/514ae7c16ba24d7db82bf05d0974c7e9/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_12.jpg'),
    category: 'character',
    spawnActionLabelEn: 'Spawn Rigged 3D Partner Ally',
    spawnActionLabelBn: 'থ্রিডি সহযোগী চরিত্র আনুন',
    spawnType: 'tactical_npc',
  },
  {
    uid: '83351a4cd72346ccad6792dfde46d22e',
    name: 'Crime Scene Tape & Sign with Chalk Body Outline',
    author: 'TampaJoey',
    likeCount: 587,
    viewCount: 16525,
    faceCount: 2174,
    vertexCount: 1160,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-83351a4cd72346ccad6792dfde46d22e',
    embedUrl: 'https://sketchfab.com/models/83351a4cd72346ccad6792dfde46d22e/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_13.jpg'),
    category: 'prop',
    spawnActionLabelEn: 'Spawn DMP Crime Scene Zone',
    spawnActionLabelBn: 'ক্রাইম সিন ব্যারিকেড স্থাপন',
    spawnType: 'crime_scene',
  },
  {
    uid: '9490e77925934d199235030b1a4d32c9',
    name: 'Briefcase / suitcase (low poly, game ready)',
    author: 'TampaJoey',
    likeCount: 427,
    viewCount: 19495,
    faceCount: 7858,
    vertexCount: 4814,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-9490e77925934d199235030b1a4d32c9',
    embedUrl: 'https://sketchfab.com/models/9490e77925934d199235030b1a4d32c9/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_16.jpg'),
    category: 'prop',
    spawnActionLabelEn: 'Drop Syndicate Ledger Briefcase',
    spawnActionLabelBn: 'সিন্ডিকেট ব্রিফকেস ড্রপ করুন',
    spawnType: 'briefcase',
  },
  {
    uid: '5ecf9daf4ab24784843daece45dcd58c',
    name: 'Asian City Scene',
    author: 'golukumar',
    likeCount: 414,
    viewCount: 17031,
    faceCount: 225234,
    vertexCount: 212017,
    isDownloadable: true,
    viewerUrl: 'https://sketchfab.com/3d-models/none-5ecf9daf4ab24784843daece45dcd58c',
    embedUrl: 'https://sketchfab.com/models/5ecf9daf4ab24784843daece45dcd58c/embed',
    thumbnail: resolveAssetUrl('/sketchfab/gta_model_17.jpg'),
    category: 'building',
    spawnActionLabelEn: 'Spawn Asian Commercial Plaza',
    spawnActionLabelBn: 'বাণিজ্যিক প্লাজা স্থাপন করুন',
    spawnType: 'city_block',
  },
];

// Actual real-world photographs of Dhaka districts (fetched via image_search)
export const DHAKA_DISTRICT_PHOTOS: Record<DistrictId, string> = {
  farmgate: resolveAssetUrl('/dhaka_photos/farmgate_real.jpg'),
  old_dhaka: resolveAssetUrl('/dhaka_photos/old_dhaka_real.jpg'),
  sadarghat: resolveAssetUrl('/dhaka_photos/sadarghat_real.jpg'),
  dhanmondi: resolveAssetUrl('/dhaka_photos/dhanmondi_real.jpg'),
  motijheel: resolveAssetUrl('/dhaka_photos/motijheel_real.jpg'),
  hatirjheel: resolveAssetUrl('/dhaka_photos/hatirjheel_real.jpg'),
  gulshan: resolveAssetUrl('/dhaka_photos/gulshan_real.jpg'),
  banani: resolveAssetUrl('/dhaka_photos/banani_real.jpg'),
  uttara: resolveAssetUrl('/dhaka_photos/uttara_real.jpg'),
  airport_road: resolveAssetUrl('/dhaka_photos/airport_real.jpg'),
  mirpur: resolveAssetUrl('/dhaka_photos/farmgate_real.jpg'),
  purbachal: resolveAssetUrl('/dhaka_photos/hatirjheel_real.jpg'),
  bashundhara: resolveAssetUrl('/dhaka_photos/gulshan_real.jpg'),
  keraniganj: resolveAssetUrl('/dhaka_photos/sadarghat_real.jpg'),
};

// Actual real-world photographs of Dhaka vehicles & 3D assets
export const DHAKA_VEHICLE_PHOTOS: Record<VehicleType, string> = {
  cng: resolveAssetUrl('/dhaka_photos/cng_real.jpg'),
  rickshaw: resolveAssetUrl('/dhaka_photos/old_dhaka_real.jpg'),
  bus: resolveAssetUrl('/dhaka_photos/bus_real.jpg'),
  motorcycle: resolveAssetUrl('/dhaka_photos/motorcycle_real.jpg'),
  car: resolveAssetUrl('/dhaka_photos/car_real.jpg'),
  pickup: resolveAssetUrl('/sketchfab/gta_model_11.jpg'),
  police: resolveAssetUrl('/dhaka_photos/police_real.jpg'),
  boat: resolveAssetUrl('/dhaka_photos/sadarghat_real.jpg'),
};

// Actual real-world photographs for Dhaka Points of Interest
export const DHAKA_POI_PHOTOS: Partial<Record<POIType, string>> = {
  fuchka_stall: resolveAssetUrl('/dhaka_photos/fuchka_real.jpg'),
  tea_stall: resolveAssetUrl('/dhaka_photos/tea_stall_real.jpg'),
  biriyani_shop: resolveAssetUrl('/dhaka_photos/biriyani_real.jpg'),
  ferry_ghat: resolveAssetUrl('/dhaka_photos/sadarghat_real.jpg'),
  garage: resolveAssetUrl('/dhaka_photos/cng_real.jpg'),
  clothing_shop: resolveAssetUrl('/dhaka_photos/banani_real.jpg'),
  safe_house: resolveAssetUrl('/dhaka_photos/dhanmondi_real.jpg'),
  mosque: resolveAssetUrl('/dhaka_photos/ahsan_manzil_real.jpg'),
  police_box: resolveAssetUrl('/dhaka_photos/police_real.jpg'),
};

export const CHARACTER_PORTRAITS: Record<string, string> = {
  arif: resolveAssetUrl('/textures/arif_portrait.jpg'),
  nadia: resolveAssetUrl('/textures/nadia_portrait.jpg'),
  kabir: resolveAssetUrl('/textures/kabir_portrait.jpg'),
  kamal: resolveAssetUrl('/textures/kamal_portrait.jpg'),
  tanvir: resolveAssetUrl('/textures/tanvir_portrait.jpg'),
  meher: resolveAssetUrl('/textures/meherun_portrait.jpg'),
  meherun: resolveAssetUrl('/textures/meherun_portrait.jpg'),
  sikder: resolveAssetUrl('/textures/sikder_portrait.jpg'),
  rickshaw_puller: resolveAssetUrl('/dhaka_photos/rickshaw_puller_real.jpg'),
  police_officer: resolveAssetUrl('/textures/tanvir_portrait.jpg'),
  tea_seller: resolveAssetUrl('/dhaka_photos/tea_stall_real.jpg'),
  street_vendor: resolveAssetUrl('/dhaka_photos/fuchka_real.jpg'),
  default_npc: resolveAssetUrl('/textures/arif_portrait.jpg'),
};

export function getPortraitForSpeaker(speakerName: string): string {
  const lower = speakerName.toLowerCase();
  if (lower.includes('arif') || lower.includes('আরিফ')) return CHARACTER_PORTRAITS.arif;
  if (lower.includes('nadia') || lower.includes('নাদিয়া')) return CHARACTER_PORTRAITS.nadia;
  if (lower.includes('kabir') || lower.includes('কবির')) return CHARACTER_PORTRAITS.kabir;
  if (lower.includes('kamal') || lower.includes('কামাল')) return CHARACTER_PORTRAITS.kamal;
  if (lower.includes('tanvir') || lower.includes('তানভীর')) return CHARACTER_PORTRAITS.tanvir;
  if (lower.includes('meher') || lower.includes('মেহের')) return CHARACTER_PORTRAITS.meher;
  if (lower.includes('sikder') || lower.includes('সিকদার')) return CHARACTER_PORTRAITS.sikder;
  return CHARACTER_PORTRAITS.default_npc;
}
