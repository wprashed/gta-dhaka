import React, { useState } from 'react';
import {
  formatGameClock,
  useGameStore,
} from '../store/useGameStore';
import {
  RadioStationId,
  ToolWeaponId,
  WeatherType,
} from '../types/game';
import {
  DISTRICTS,
  METRO_STATIONS,
  PLAYABLE_CHARACTERS,
  SIDE_MISSIONS,
  STORY_MISSIONS,
  VEHICLE_STATS,
} from '../data/dhakaWorldData';
import {
  CHARACTER_PORTRAITS,
  getPortraitForSpeaker,
} from '../data/sketchfabGtaCatalog';
import { resolveAssetUrl } from '../utils/assets';
import { MinimapHUD } from './MinimapHUD';
import {
  Box,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudRain,
  Compass,
  Crosshair,
  HelpCircle,
  Keyboard,
  MapPin,
  Pause,
  Plus,
  Radio,
  Sparkles,
  Star,
  Sun,
  Wrench,
  X,
} from 'lucide-react';

interface GameHUDProps {
  onTriggerAction: (
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera' | 'fare' | 'lights'
  ) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ onTriggerAction }) => {
  const {
    language,
    toggleLanguage,
    playerX,
    playerZ,
    taka,
    wantedLevel,
    wantedCooldown,
    timeOfDay,
    weather,
    setWeather,
    radioStation,
    setRadioStation,
    inVehicleId,
    currentVehicleType,
    currentVehicleSpeedKmh,
    currentVehicleHealth,
    currentVehicleMaxHealth,
    currentVehicleFuel,
    currentVehicleGear,
    currentDistrict,
    activeMissionId,
    activeMissionStepIndex,
    missionTimer,
    nearbyPrompt,
    activeDialogue,
    setDialogue,
    activeChoicePrompt,
    resolveMissionChoice,
    bannerAlert,
    equippedToolId,
    equipTool,
    tools,
    isWasted,
    isBusted,
    requestSpawnVehicle,
    setGamePhase,
    setPauseTab,
    selectedCharacterId,
    storyEndingEn,
    storyEndingBn,
    isInsideMall,
    mallFloor,
    activeShopModal,
    closeShopModal,
    activeMetroModal,
    closeMetroModal,
    activeMetroRide,
    requestMetroRide,
    requestMetroDisembark,
    activeGarageModal,
    closeGarageModal,
    activeFareJob,
    cancelFareJob,
    requestTeleport,
    requestRepairVehicle,
    requestResprayVehicle,
    requestUpgradeVehicle,
    spendTaka,
    addTaka,
    healPlayer,
    setWantedLevel,
    saveGameToStorage,
    showBanner,
    outfits,
    equipOutfit,
    equippedOutfitId,
    addAmmo,
  } = useGameStore();

  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [isMissionExpanded, setIsMissionExpanded] = useState(false);

  const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
  const activeMission = allMissions.find((m) => m.id === activeMissionId);
  const activeStep = activeMission
    ? activeMission.steps[activeMissionStepIndex]
    : null;
  const currentChar =
    PLAYABLE_CHARACTERS.find((c) => c.id === selectedCharacterId) ||
    PLAYABLE_CHARACTERS[0];

  const distToObjective = activeStep
    ? Math.round(
        Math.hypot(playerX - activeStep.targetX, playerZ - activeStep.targetZ)
      )
    : null;

  const districtInfo =
    DISTRICTS.find((d) => d.id === currentDistrict) || DISTRICTS[0];

  const vehicleStats = currentVehicleType
    ? VEHICLE_STATS[currentVehicleType]
    : null;

  const radioLabels: Record<RadioStationId, { en: string; bn: string }> = {
    dhaka_folk: { en: '98.4 FM Folk', bn: '৯৮.৪ ফোক' },
    gully_beat: { en: '101.2 FM Gully', bn: '১০১.২ গলি' },
    hatirjheel_synth: { en: '105.6 FM Synth', bn: '১০৫.৬ নাইটস' },
    off: { en: 'Radio Off', bn: 'রেডিও বন্ধ' },
  };

  const weatherOptions: Array<{
    id: WeatherType;
    labelEn: string;
    labelBn: string;
    icon: React.ElementType;
  }> = [
    { id: 'clear', labelEn: 'Noon', labelBn: 'দুপুর', icon: Sun },
    { id: 'golden_hour', labelEn: 'Sunset', labelBn: 'গোধূলি', icon: Sparkles },
    { id: 'monsoon_rain', labelEn: 'Monsoon', labelBn: 'বর্ষা', icon: CloudRain },
    { id: 'night', labelEn: 'Night', labelBn: 'রাত', icon: Clock },
  ];

  const currentWeatherOpt =
    weatherOptions.find((w) => w.id === weather) || weatherOptions[0];
  const WeatherIcon = currentWeatherOpt.icon;

  const activeTool = tools.find((t) => t.id === equippedToolId) || tools[0];

  const meleeWeapons: Array<{ id: ToolWeaponId; en: string; bn: string }> = [
    { id: 'fists', en: 'Fist', bn: 'ঘুষি' },
    { id: 'ramda', en: 'Ramda', bn: 'রামদা' },
    { id: 'chapati_cleaver', en: 'Chapati', bn: 'চাপাতি' },
    { id: 'bamboo_lathi', en: 'Lathi', bn: 'লাঠি' },
    { id: 'cricket_bat', en: 'Bat', bn: 'ব্যাট' },
    { id: 'stun_baton', en: 'Stun', bn: 'স্টান' },
  ];

  const firearms: Array<{ id: ToolWeaponId; en: string; bn: string }> = [
    { id: 'deshi_pipegun', en: 'PipeGun', bn: 'পাইপগান' },
    { id: 'pistol_9mm', en: '9mm', bn: '৯মিমি' },
    { id: 'bd08_rifle', en: 'BD-08', bn: 'বিডি-০৮' },
    { id: 'police_shotgun', en: 'Shotgun', bn: 'শটগান' },
    { id: 'smg_uzi', en: 'SMG', bn: 'এসএমজি' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-20 overflow-hidden font-sans select-none">
      {/* Cinematic WASTED / BUSTED Fullscreen Overlay */}
      {(isWasted || isBusted) && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div
            className={`absolute inset-0 ${
              isWasted
                ? 'bg-red-950/80 backdrop-grayscale'
                : 'bg-amber-950/80'
            }`}
          />
          <h1
            className={`relative text-5xl sm:text-7xl font-black uppercase tracking-widest drop-shadow-[0_10px_25px_rgba(0,0,0,0.95)] animate-pulse ${
              isWasted ? 'text-red-500' : 'text-amber-400'
            }`}
            style={{ fontFamily: 'Impact, sans-serif' }}
          >
            {isWasted
              ? language === 'en'
                ? 'WASTED'
                : 'আহত / নিহত'
              : language === 'en'
              ? 'BUSTED'
              : 'গ্রেফতার'}
          </h1>
          <p className="relative text-xs sm:text-sm font-semibold text-slate-200 mt-3 drop-shadow bg-black/75 px-4 py-1.5 rounded-full border border-white/10 text-center max-w-sm">
            {isWasted
              ? language === 'en'
                ? 'Admitted to Dhaka Medical College emergency ward (-৳200)'
                : 'ঢাকা মেডিকেল কলেজ হাসপাতালের জরুরি বিভাগে প্রাথমিক চিকিৎসা (-৳২০০)'
              : language === 'en'
              ? 'Detained by DMP Traffic Police. Bail fine ৳500 paid at Farmgate Police Box'
              : 'ডিএমপি ট্রাফিক পুলিশ আটক করেছে। জরিমানা বাবদ ৫০০ টাকা কর্তন'}
          </p>
        </div>
      )}

      {/* ==================== TOP BAR ==================== */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* TOP-LEFT: Ultra-Minimalist Floating Objective Badge & Active Character Pill */}
        <div className="pointer-events-auto flex items-start gap-2 max-w-sm">
          {/* Active Hero Pill */}
          <div
            onClick={() => {
              setPauseTab('character');
              setGamePhase('paused', 'character');
            }}
            className="bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 rounded-full pl-1.5 pr-2.5 py-1 shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 group shrink-0"
            title={language === 'en' ? 'Click to switch character' : 'চরিত্র পরিবর্তন করতে ক্লিক করুন'}
          >
            <img
              src={resolveAssetUrl(currentChar.avatar)}
              alt={currentChar.nameEn}
              className="w-5 h-5 rounded-full object-cover object-top border border-emerald-400 shrink-0"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes('arif_portrait.jpg')) {
                  el.src = resolveAssetUrl('/textures/arif_portrait.jpg');
                }
              }}
            />
            <span className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300">
              {language === 'en' ? currentChar.nameEn.split(' ')[0] : currentChar.nameBn.split(' ')[0]}
            </span>
          </div>

          {activeMission && activeStep ? (
            <div className="flex flex-col gap-1">
              <div
                onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                className="bg-slate-950/75 hover:bg-slate-950/90 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 group"
                title="Click to view full mission details"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[11px] font-bold text-white tracking-wide truncate max-w-[170px] sm:max-w-[220px]">
                  {language === 'en' ? activeMission.titleEn : activeMission.titleBn}
                </span>

                {distToObjective !== null && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-0.5 shrink-0 bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                    <MapPin className="w-2.5 h-2.5" />
                    {distToObjective}m
                  </span>
                )}

                {missionTimer !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      missionTimer < 20
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'text-amber-400 bg-amber-950/50 border border-amber-500/30'
                    }`}
                  >
                    ⏱ {Math.ceil(missionTimer)}s
                  </span>
                )}

                <span className="text-slate-400 group-hover:text-white shrink-0">
                  {isMissionExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </div>

              {/* Collapsible Instruction Detail */}
              {isMissionExpanded && (
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl max-w-xs animate-in fade-in zoom-in-95">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    {language === 'en'
                      ? activeMission.chapterTitleEn
                      : activeMission.chapterTitleBn}
                  </span>
                  <p className="text-[11px] text-slate-200 leading-snug">
                    {language === 'en'
                      ? activeStep.instructionEn
                      : activeStep.instructionBn}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {activeMission.steps.map((st, idx) => (
                      <span
                        key={st.id}
                        className={`h-1 rounded-full transition-all ${
                          idx < activeMissionStepIndex
                            ? 'w-3 bg-emerald-400'
                            : idx === activeMissionStepIndex
                            ? 'w-5 bg-amber-400'
                            : 'w-2 bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setGamePhase('paused', 'missions')}
                    className="w-full mt-2.5 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>📜</span>
                    <span>{language === 'en' ? 'Open Mission Menu [M]' : 'মিশন খাতা খুলুন [M]'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-full px-3 py-1 shadow-lg flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-white">
                {language === 'en' ? districtInfo.nameEn : districtInfo.nameBn}
              </span>
            </div>
          )}

          {isInsideMall && (
            <div className="bg-purple-950/90 backdrop-blur-md border border-purple-400/60 rounded-full px-3 py-1 shadow-lg flex items-center gap-1.5">
              <span className="text-xs">🏬</span>
              <span className="text-[11px] font-black text-amber-300">
                {language === 'en'
                  ? `Jamuna Future Park • ${
                      mallFloor === 0
                        ? 'Ground Floor (Fashion & Tech)'
                        : mallFloor === 1
                        ? '1st Floor (Lifestyle & Gadgets)'
                        : '2nd Floor (Food Court & Cinema)'
                    }`
                  : `যমুনা ফিউচার পার্ক • ${
                      mallFloor === 0
                        ? 'নিচতলা (ফ্যাশন ও টেক)'
                        : mallFloor === 1
                        ? '২য় তলা (লাইফস্টাইল ও ঘড়ি)'
                        : '৩য় তলা (ফুড কোর্ট ও সিনেমা)'
                    }`}
              </span>
            </div>
          )}

          {activeFareJob && (
            <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-400/60 rounded-full px-3 py-1 shadow-lg flex items-center gap-2">
              <span className="text-xs">🚕</span>
              <span className="text-[11px] font-bold text-emerald-200">
                {language === 'en' ? activeFareJob.dropNameEn : activeFareJob.dropNameBn} • ⏱ {Math.ceil(activeFareJob.timeLeft)}s • ৳{activeFareJob.reward}
              </span>
              <button
                onClick={cancelFareJob}
                className="text-red-300 hover:text-white text-[10px] font-black px-1"
                title="Cancel Fare"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Action Drawer Trigger [+] */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="bg-slate-950/75 hover:bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-full p-1.5 shadow-lg transition-all active:scale-95"
              title="Quick spawns & mission journal"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {showQuickMenu && (
              <div className="absolute left-0 top-full mt-1.5 bg-slate-950/95 border border-slate-800 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 z-30 min-w-[130px] animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    requestSpawnVehicle('cng');
                    setShowQuickMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 text-emerald-300 hover:bg-emerald-950/60 transition-colors"
                >
                  <Car className="w-3 h-3 text-emerald-400" />
                  <span>{language === 'en' ? 'Call CNG' : 'সিএনজি ডাকুন'}</span>
                </button>

                <button
                  onClick={() => {
                    requestSpawnVehicle('rickshaw');
                    setShowQuickMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 text-pink-300 hover:bg-pink-950/60 transition-colors"
                >
                  <span>🚲</span>
                  <span>{language === 'en' ? 'Call Rickshaw' : 'রিকশা ডাকুন'}</span>
                </button>

                <button
                  onClick={() => {
                    setGamePhase('paused', 'sketchfab');
                    setShowQuickMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 text-amber-300 hover:bg-amber-950/60 transition-colors"
                >
                  <Box className="w-3 h-3 text-amber-400" />
                  <span>{language === 'en' ? '3D Models' : 'থ্রিডি মডেল'}</span>
                </button>

                <div className="border-t border-slate-800 my-0.5" />

                <button
                  onClick={() => {
                    setGamePhase('paused', 'missions');
                    setShowQuickMenu(false);
                  }}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center justify-between text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <span>{language === 'en' ? 'Missions' : 'মিশন খাতা'}</span>
                  <span className="text-[9px] text-slate-500 font-mono">[M]</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Dedicated Mission Menu Pill Button */}
          <button
            onClick={() => setGamePhase('paused', 'missions')}
            className="bg-slate-950/85 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-black text-[11px] rounded-full px-2.5 py-1 shadow-lg border border-amber-400/50 hover:border-amber-400 flex items-center gap-1.5 transition-all active:scale-95 pointer-events-auto cursor-pointer"
            title="Open Dhaka Mission Menu [M / J]"
          >
            <span>📜</span>
            <span className="hidden sm:inline font-bold">{language === 'en' ? 'Missions' : 'মিশন'}</span>
            <span className="text-[9px] bg-slate-900 group-hover:bg-black text-amber-300 px-1 py-0.2 rounded font-mono font-bold">[M]</span>
          </button>
        </div>

        {/* TOP-CENTER: Milestone Banner Alert */}
        {bannerAlert && (
          <div
            className={`pointer-events-auto max-w-sm w-full mx-auto px-4 py-2 rounded-xl border shadow-2xl backdrop-blur-md text-center transform transition-all animate-bounce ${
              bannerAlert.tone === 'gold'
                ? 'bg-slate-950/95 border-amber-400 text-amber-300'
                : bannerAlert.tone === 'red'
                ? 'bg-red-950/95 border-red-500 text-red-200'
                : bannerAlert.tone === 'green'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
                : 'bg-slate-950/95 border-cyan-400 text-cyan-200'
            }`}
          >
            <p className="text-xs font-black tracking-wide">
              {language === 'en' ? bannerAlert.titleEn : bannerAlert.titleBn}
            </p>
            <p className="text-[10px] text-slate-300 mt-0.5">
              {language === 'en'
                ? bannerAlert.subtitleEn
                : bannerAlert.subtitleBn}
            </p>
            {bannerAlert.rewardTaka && (
              <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                + ৳ {bannerAlert.rewardTaka.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* TOP-RIGHT: Single Ultra-Clean Horizontal Status Capsule */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Active Wanted Badge (ONLY visible when wanted > 0) */}
          {wantedLevel > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-950/90 border border-red-500/80 shadow-lg animate-pulse">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-mono font-bold text-amber-300">
                ★{wantedLevel} ({Math.ceil(wantedCooldown)}s)
              </span>
            </div>
          )}

          {/* Main Status Capsule */}
          <div className="flex items-center gap-2.5 bg-slate-950/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800/80 shadow-xl">
            {/* Arif Profile Avatar */}
            <img
              src={CHARACTER_PORTRAITS.arif}
              alt="Arif"
              className="w-5 h-5 rounded-full object-cover object-top border border-amber-400/80 shrink-0"
            />

            {/* Taka Wallet */}
            <div className="flex items-center gap-0.5 font-mono font-bold text-emerald-400 text-xs tabular-nums">
              <span className="text-[10px] text-emerald-500 font-sans">৳</span>
              <span>{taka.toLocaleString()}</span>
            </div>

            <span className="text-slate-700 select-none">•</span>

            {/* In-Game Clock */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 tabular-nums">
              <Clock className="w-3 h-3 text-amber-400/80" />
              <span>{formatGameClock(timeOfDay)}</span>
            </div>

            <span className="text-slate-700 select-none">•</span>

            {/* Active Weapon Pill + Quick Wheel */}
            <div className="relative">
              <button
                onClick={() => setShowWeaponDrawer(!showWeaponDrawer)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 hover:text-amber-300 transition-colors"
                title="Switch weapons [Q / 1-0] • Reload [R]"
              >
                <span className="text-xs">
                  {activeTool.isFirearm ? '🔫' : '🗡️'}
                </span>
                <span className="truncate max-w-[65px] hidden sm:inline">
                  {language === 'en' ? activeTool.nameEn : activeTool.nameBn}
                </span>
                {activeTool.isFirearm ? (
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/70 px-1 py-0.5 rounded border border-amber-600/40">
                    {activeTool.currentClip ?? 0}
                    <span className="text-slate-400 text-[8px]">/{activeTool.reserveAmmo ?? 0}</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-400">∞</span>
                )}
                <span className="text-[8px] font-mono text-slate-500">[Q]</span>
              </button>

              {/* Weapon Selection Dropdown */}
              {showWeaponDrawer && (
                <div className="absolute right-0 top-full mt-2 bg-slate-950/95 border border-slate-800 rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 z-30 w-52 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                      {language === 'en' ? 'Arsenal [1-0]' : 'অস্ত্রাগার [১-০]'}
                    </span>
                    <button
                      onClick={() => setShowWeaponDrawer(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[8px] font-semibold text-slate-400 block mb-1">
                      {language === 'en' ? 'Melee [1-6]' : 'দেশীয় অস্ত্র'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {meleeWeapons.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            equipTool(item.id);
                            setShowWeaponDrawer(false);
                          }}
                          className={`px-1.5 py-1 rounded text-[9px] font-bold text-center truncate transition-colors ${
                            equippedToolId === item.id
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {idx + 1}:{language === 'en' ? item.en : item.bn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <span className="text-[8px] font-semibold text-red-400 block mb-1">
                      {language === 'en' ? 'Firearms [7-0]' : 'আগ্নেয়াস্ত্র'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {firearms.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            equipTool(item.id);
                            setShowWeaponDrawer(false);
                          }}
                          className={`px-1.5 py-1 rounded text-[9px] font-bold text-center truncate transition-colors ${
                            equippedToolId === item.id
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
                          }`}
                        >
                          {idx + 7}:{language === 'en' ? item.en : item.bn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="text-slate-700 select-none">•</span>

            {/* Weather / Time Selector Icon */}
            <div className="relative">
              <button
                onClick={() => setShowWeatherMenu(!showWeatherMenu)}
                className="text-slate-400 hover:text-amber-400 transition-colors p-0.5"
                title="Change weather & time of day"
              >
                <WeatherIcon className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {showWeatherMenu && (
                <div className="absolute right-0 top-full mt-2 bg-slate-950/95 border border-slate-800 rounded-xl p-1 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 z-30 min-w-[100px] animate-in fade-in zoom-in-95">
                  {weatherOptions.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          setWeather(w.id);
                          setShowWeatherMenu(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 text-left transition-colors ${
                          weather === w.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{language === 'en' ? w.labelEn : w.labelBn}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="text-slate-700 select-none">•</span>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="text-[10px] font-bold text-amber-300 hover:text-white transition-colors"
              title="Toggle English / বাংলা"
            >
              {language === 'en' ? 'বাং' : 'EN'}
            </button>

            {/* Pause Menu Trigger */}
            <button
              onClick={() => setGamePhase('paused', 'map')}
              className="text-slate-400 hover:text-white p-0.5 transition-colors"
              title="Pause Menu [ESC]"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== CENTER SCREEN ==================== */}
      {/* Dynamic Tactical Reticle & Aiming HUD */}
      {!inVehicleId && activeTool?.isFirearm && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Center precision red dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            {/* Outer tactical crosshair brackets */}
            <div className="absolute top-0 w-0.5 h-2 bg-amber-400/70" />
            <div className="absolute bottom-0 w-0.5 h-2 bg-amber-400/70" />
            <div className="absolute left-0 h-0.5 w-2 bg-amber-400/70" />
            <div className="absolute right-0 h-0.5 w-2 bg-amber-400/70" />
            <div className="absolute w-6 h-6 rounded-full border border-amber-400/30" />
          </div>
          {/* Tactical Hotkey Pill under reticle */}
          <div className="mt-2.5 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-sm border border-slate-700/60 text-[8px] font-mono font-medium text-slate-300 opacity-80">
            [RMB/Z] AIM • [LMB/X] FIRE • [R] RELOAD
          </div>
        </div>
      )}

      {!inVehicleId && !activeTool?.isFirearm && activeTool?.id !== 'fists' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
          <div className="w-2 h-2 rounded-full border border-amber-400/50 flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-amber-400" />
          </div>
          <div className="mt-2 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-sm border border-slate-700/60 text-[8px] font-mono font-medium text-amber-300 opacity-75">
            [LMB/X] STRIKE (COMBO 1-2-3)
          </div>
        </div>
      )}

      {/* Campaign Complete Banner */}
      {storyEndingEn && (
        <div className="pointer-events-auto mx-auto max-w-md bg-slate-950/95 border border-amber-400 rounded-xl p-3 text-center shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
            ★ DHAKA CITY CAMPAIGN COMPLETE ★
          </p>
          <p className="text-xs font-bold text-white mt-1">
            {language === 'en' ? storyEndingEn : storyEndingBn}
          </p>
        </div>
      )}

      {/* Moral Choice Prompt */}
      {activeChoicePrompt && (
        <div className="pointer-events-auto mx-auto my-auto max-w-md w-full bg-slate-950/95 backdrop-blur-xl border border-amber-400 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            <span>
              {language === 'en'
                ? 'CRITICAL STORY DECISION'
                : 'গুরুত্বপূর্ণ সিদ্ধান্ত'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mb-3 leading-snug">
            {language === 'en'
              ? activeChoicePrompt.questionEn
              : activeChoicePrompt.questionBn}
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => resolveMissionChoice('A')}
              className="w-full text-left p-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-100 text-xs font-semibold transition-colors"
            >
              <span className="inline-block bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded mr-1.5 text-[10px]">
                A
              </span>
              {language === 'en'
                ? activeChoicePrompt.optionAEn
                : activeChoicePrompt.optionABn}
            </button>
            <button
              onClick={() => resolveMissionChoice('B')}
              className="w-full text-left p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-100 text-xs font-semibold transition-colors"
            >
              <span className="inline-block bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded mr-1.5 text-[10px]">
                B
              </span>
              {language === 'en'
                ? activeChoicePrompt.optionBEn
                : activeChoicePrompt.optionBBn}
            </button>
          </div>
        </div>
      )}

      {/* ==================== BOTTOM BAR ==================== */}
      <div className="flex items-end justify-between gap-3 w-full">
        {/* BOTTOM-LEFT: Minimap with Integrated GTA V Vitals + Minimal Keyboard Tooltip */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
          {/* Controls Cheat-Sheet Popover */}
          {showControlsHelp && (
            <div className="bg-slate-950/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl text-[10px] text-slate-200 max-w-xs flex flex-col gap-1.5 mb-1 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3.5 h-3.5" /> Keyboard Controls
                </span>
                <button
                  onClick={() => setShowControlsHelp(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>
                  <kbd className="text-amber-400 font-bold">W A S D</kbd> : Move / Steer
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">F / E</kbd> : Enter / Talk
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">H</kbd> : Horn / Bell
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">SPACE</kbd> : Drift / Jump
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">Q / 1-0</kbd> : Weapons
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">CLICK / X</kbd> : Attack
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">V</kbd> : Camera View
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">M</kbd> : GPS Map
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">R</kbd> : Radio Station
                </span>
                <span>
                  <kbd className="text-amber-400 font-bold">ESC</kbd> : Pause Menu
                </span>
              </div>
            </div>
          )}

          <div className="relative">
            <MinimapHUD />
            {/* Subtle Controls Toggle Icon Button */}
            <button
              onClick={() => setShowControlsHelp(!showControlsHelp)}
              className="absolute -top-1 -right-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-amber-300 p-1 rounded-full shadow transition-colors"
              title="Keyboard Controls"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* BOTTOM-CENTER: Minimal Subtitle Dialogue, Metro Ride & Interaction Banner */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-lg w-full mx-auto">
          {activeMetroRide && (
            <div className="w-full bg-slate-950/92 backdrop-blur-md border-2 border-emerald-400/80 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      activeMetroRide.line === 'L5'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    MRT {activeMetroRide.line}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">
                      🚆 {language === 'en' ? activeMetroRide.fromNameEn : activeMetroRide.fromNameBn} →{' '}
                      {language === 'en' ? activeMetroRide.toNameEn : activeMetroRide.toNameBn}
                    </p>
                    <p className="text-[10px] text-emerald-300 font-semibold">
                      {activeMetroRide.isTransferring
                        ? language === 'en'
                          ? 'Interchange via Mirpur-10 Hub • Drag mouse for 360° city view'
                          : 'মিরপুর-১০ ইন্টারচেঞ্জ হয়ে যাত্রা • মাউস ঘুরিয়ে শহর দেখুন'
                        : language === 'en'
                        ? 'Elevated Viaduct Express • Drag mouse for 360° Dhaka view'
                        : 'এলিভেটেড মেট্রো এক্সপ্রেস • মাউস ঘুরিয়ে ঢাকা শহর দেখুন'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-amber-400 shrink-0">
                  {activeMetroRide.speedKmh} km/h
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    activeMetroRide.line === 'L5' ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.round(activeMetroRide.progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold">
                  {Math.round(activeMetroRide.progress * 100)}%{' '}
                  {language === 'en' ? 'Journey Progress' : 'যাত্রা সম্পন্ন'}
                </span>
                <button
                  onClick={requestMetroDisembark}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors"
                >
                  {language === 'en' ? '[E] Arrive & Disembark Now' : '[E] এখনই স্টেশনে নামুন'}
                </button>
              </div>
            </div>
          )}

          {nearbyPrompt && !activeMetroRide && (
            <button
              onClick={() => onTriggerAction('interact')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-2xl border border-white flex items-center gap-1.5 transition-transform active:scale-95 animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>
                {language === 'en'
                  ? nearbyPrompt.labelEn
                  : nearbyPrompt.labelBn}
              </span>
            </button>
          )}

          {activeDialogue && (
            <div className="w-full bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in">
              <img
                src={getPortraitForSpeaker(activeDialogue.speakerEn)}
                alt={activeDialogue.speakerEn}
                className="w-10 h-10 rounded-lg object-cover object-top border border-amber-400/80 shrink-0 shadow"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.src.includes('arif_portrait.jpg')) {
                    el.src = resolveAssetUrl('/textures/arif_portrait.jpg');
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block truncate">
                  {language === 'en'
                    ? activeDialogue.speakerEn
                    : activeDialogue.speakerBn}
                </span>
                <p className="text-xs text-slate-100 mt-0.5 leading-snug font-medium line-clamp-2">
                  “
                  {language === 'en'
                    ? activeDialogue.textEn
                    : activeDialogue.textBn}
                  ”
                </p>
              </div>
              <button
                onClick={() => setDialogue(null)}
                className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700"
              >
                {language === 'en' ? 'OK' : 'ঠিক আছে'}
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM-RIGHT: Sleek Minimalist Controls & Vehicle Speedometer */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
          {/* Virtual Quick Action Cluster */}
          <div className="flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md border border-slate-800/80 p-1 rounded-full shadow-2xl">
            {inVehicleId ? (
              <>
                <button
                  onClick={() => onTriggerAction('fare')}
                  className="px-2 h-7 rounded-full bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/50 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all active:scale-90"
                  title="Start/Cancel Dhaka Fare Job [G]"
                >
                  <span>🚕 Fare</span>
                </button>
                <button
                  onClick={() => onTriggerAction('horn')}
                  className="w-7 h-7 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[11px] transition-all active:scale-90"
                  title="Honk vehicle horn [H]"
                >
                  📢
                </button>
                <button
                  onClick={() => onTriggerAction('camera')}
                  className="w-7 h-7 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-200 flex items-center justify-center text-[11px] transition-all active:scale-90"
                  title="Switch camera view [V]"
                >
                  📷
                </button>
                <button
                  onClick={() => onTriggerAction('lights')}
                  className="w-7 h-7 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-amber-300 flex items-center justify-center text-[11px] transition-all active:scale-90"
                  title="Toggle Headlights [L]"
                >
                  💡
                </button>
                <button
                  onClick={() => onTriggerAction('interact')}
                  className="px-2.5 h-7 rounded-full bg-red-600/80 hover:bg-red-500 border border-red-400/50 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all active:scale-90"
                  title="Exit Vehicle [F]"
                >
                  <span>Exit</span>
                  <span className="text-[8px] font-mono text-red-200">[F]</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onTriggerAction('camera')}
                  className="w-7 h-7 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-200 flex items-center justify-center text-[11px] transition-all active:scale-90"
                  title="Switch camera view [V]"
                >
                  📷
                </button>
                <button
                  onClick={() => onTriggerAction('horn')}
                  className="w-7 h-7 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-200 flex items-center justify-center text-[11px] transition-all active:scale-90"
                  title="Ring Rickshaw Bell / Whistle [H]"
                >
                  🔔
                </button>
                <button
                  onClick={() => onTriggerAction('jump')}
                  className="w-7 h-7 rounded-full bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 flex items-center justify-center text-[11px] font-bold transition-all active:scale-90"
                  title="Jump [Space]"
                >
                  🦘
                </button>
                <button
                  onClick={() => onTriggerAction('attack')}
                  className="px-2.5 h-7 rounded-full bg-red-600 hover:bg-red-500 border border-red-400/60 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-lg shadow-red-900/40 transition-all active:scale-90 animate-pulse"
                  title="Attack / Shoot weapon [X / J / Click]"
                >
                  <span>{activeTool.isFirearm ? '🔫 FIRE' : '🗡️ STRIKE'}</span>
                  <span className="text-[8px] font-mono text-red-200">[X]</span>
                </button>
              </>
            )}
          </div>

          {inVehicleId && vehicleStats && currentVehicleType ? (
            <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-2xl p-2.5 w-44 shadow-2xl flex flex-col gap-1 animate-in fade-in">
              {/* Speedometer & Name */}
              <div className="flex items-baseline justify-between border-b border-slate-800 pb-1">
                <div className="truncate flex-1 pr-1">
                  <p className="text-[10px] font-bold text-emerald-400 truncate">
                    {language === 'en'
                      ? vehicleStats.nameEn
                      : vehicleStats.nameBn}
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono truncate">
                    [F] Exit • [L] Lights • [G] Fare
                  </p>
                </div>
                <div className="text-right flex items-end gap-1.5">
                  <span className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-black font-mono text-emerald-400 leading-none mb-0.5">
                    {currentVehicleGear}
                  </span>
                  <div>
                    <span className="text-2xl font-black font-mono text-white leading-none tabular-nums">
                      {currentVehicleSpeedKmh}
                    </span>
                    <span className="block text-[7px] font-bold text-amber-400 uppercase leading-none mt-0.5">
                      KM/H
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Integrity Bar */}
              <div className="flex items-center gap-1 pt-0.5">
                <Wrench className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all ${
                      currentVehicleHealth / currentVehicleMaxHealth > 0.4
                        ? 'bg-emerald-400'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (currentVehicleHealth / currentVehicleMaxHealth) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Fuel / CNG Bar (motorized vehicles & boats) */}
              {currentVehicleType !== 'rickshaw' && (
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[7px] font-black uppercase tracking-wider shrink-0 ${
                      currentVehicleFuel <= 18
                        ? 'text-amber-400 animate-pulse'
                        : 'text-sky-400'
                    }`}
                  >
                    {currentVehicleType === 'boat'
                      ? 'FUEL'
                      : currentVehicleType === 'motorcycle'
                      ? 'OCT'
                      : currentVehicleType === 'bus' ||
                        currentVehicleType === 'pickup'
                      ? 'DSL'
                      : 'CNG'}
                  </span>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        currentVehicleFuel <= 18
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-sky-400'
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, currentVehicleFuel))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Radio & Headlights Pills */}
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                <button
                  onClick={() => {
                    const list: RadioStationId[] = [
                      'dhaka_folk',
                      'gully_beat',
                      'hatirjheel_synth',
                      'off',
                    ];
                    const next =
                      list[(list.indexOf(radioStation) + 1) % list.length];
                    setRadioStation(next);
                  }}
                  className="flex-1 min-w-0 flex items-center justify-between text-[9px] text-amber-300 font-medium hover:text-white transition-colors"
                  title="Change Radio Station [R]"
                >
                  <span className="flex items-center gap-1 truncate">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {language === 'en'
                        ? radioLabels[radioStation].en
                        : radioLabels[radioStation].bn}
                    </span>
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono ml-1">[R]</span>
                </button>
                <button
                  onClick={() => onTriggerAction('lights')}
                  className="px-1.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[8px] font-mono text-amber-300 shrink-0 transition-colors"
                  title="Toggle Headlights [L]"
                >
                  💡[L]
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* IN-GAME MODAL 1: JAMUNA FUTURE PARK STOREFRONT BROWSER */}
      {activeShopModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">
                  🏬 {language === 'en' ? 'Jamuna Future Park Storefront' : 'যমুনা ফিউচার পার্ক শোরুম'}
                </span>
                <h3 className="text-lg font-black text-white">
                  {language === 'en' ? activeShopModal.titleEn : activeShopModal.titleBn}
                </h3>
              </div>
              <button
                onClick={closeShopModal}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeShopModal.category === 'fashion' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {outfits.map((o) => {
                  const isEq = equippedOutfitId === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`p-3 rounded-xl border ${
                        isEq ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-800 bg-slate-950/80'
                      } flex flex-col justify-between gap-2`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: o.shirtColor }}
                        />
                        <p className="text-xs font-bold text-white truncate">
                          {language === 'en' ? o.nameEn : o.nameBn}
                        </p>
                      </div>
                      <button
                        onClick={() => equipOutfit(o.id)}
                        className={`w-full py-1.5 rounded-lg text-xs font-black ${
                          isEq
                            ? 'bg-emerald-600 text-white'
                            : o.unlocked
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        {isEq
                          ? 'Equipped ✓'
                          : o.unlocked
                          ? 'Wear Outfit'
                          : `Buy & Wear — ৳${o.price}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {activeShopModal.category === 'food' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { nameEn: 'Crispy Chicken Bucket', nameBn: 'ক্রিস্পি চিকেন বাকেট', hp: 80, arm: 0, price: 180 },
                  { nameEn: 'Supreme Pan Pizza', nameBn: 'সুপ্রিম প্যান পিৎজা', hp: 90, arm: 25, price: 220 },
                  { nameEn: 'Iced Caramel Chiller', nameBn: 'আইসড ক্যারামেল কফি', hp: 50, arm: 0, price: 120 },
                  { nameEn: 'Royal Shahi Kacchi', nameBn: 'রয়েল শাহী কাচ্চি ও বোরহানি', hp: 100, arm: 50, price: 250 },
                ].map((item) => (
                  <button
                    key={item.nameEn}
                    onClick={() => {
                      if (spendTaka(item.price, item.nameEn, item.nameBn)) {
                        healPlayer(item.hp, item.arm);
                        showBanner({
                          titleEn: `${item.nameEn.toUpperCase()} ENJOYED! (+${item.hp} HP)`,
                          titleBn: `${item.nameBn} সম্পন্ন! (+${item.hp} হেলথ)`,
                          subtitleEn: 'Served hot at Jamuna Future Park 2F Food Court.',
                          subtitleBn: 'যমুনা ফিউচার পার্ক ফুড কোর্টে তাজা পরিবেশিত।',
                          tone: 'gold',
                        });
                        closeShopModal();
                      }
                    }}
                    className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left flex flex-col gap-1"
                  >
                    <span className="text-xs font-black text-white">
                      {language === 'en' ? item.nameEn : item.nameBn}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      +{item.hp} HP {item.arm > 0 ? `• +${item.arm} Armor` : ''} • ৳{item.price}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {(activeShopModal.category === 'tech' ||
              activeShopModal.category === 'footwear' ||
              activeShopModal.category === 'books' ||
              activeShopModal.category === 'cinema' ||
              activeShopModal.category === 'arcade' ||
              activeShopModal.category === 'atm') && (
              <div className="space-y-2.5">
                {activeShopModal.category === 'tech' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        if (spendTaka(450, 'Mall Tactical Armor Vest', 'বডি আর্মার ভেস্ট')) {
                          healPlayer(40, 65);
                          showBanner({
                            titleEn: 'TACTICAL ARMOR VEST EQUIPPED (+65 ARMOR)',
                            titleBn: 'নতুন ট্যাকটিক্যাল আর্মার যুক্ত (+৬৫ আর্মার)',
                            subtitleEn: 'Purchased at Jamuna Future Park Tech Wing.',
                            subtitleBn: 'যমুনা টেক উইং থেকে সংগৃহীত।',
                            tone: 'blue',
                          });
                          closeShopModal();
                        }
                      }}
                      className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <p className="text-xs font-black text-white">🛡️ Tactical Armor Vest</p>
                      <p className="text-[10px] text-cyan-400 font-bold">+65 Armor & +40 HP • ৳450</p>
                    </button>
                    <button
                      onClick={() => {
                        if (spendTaka(300, 'Full Firearm Ammo Refill', 'অস্ত্রের গুলি রিফিল')) {
                          (['pistol_9mm', 'bd08_rifle', 'police_shotgun', 'smg_uzi', 'deshi_pipegun'] as ToolWeaponId[]).forEach((id) =>
                            addAmmo(id, 30)
                          );
                          showBanner({
                            titleEn: 'AMMUNITION PACK REFILLED (+30 ROUNDS)',
                            titleBn: 'সকল আগ্নেয়াস্ত্রের গুলি রিফিল সম্পন্ন!',
                            subtitleEn: 'Tactical ammo restocked for all unlocked firearms.',
                            subtitleBn: 'আপনার সব অস্ত্রের ম্যাগাজিন পূর্ণ হয়েছে।',
                            tone: 'gold',
                          });
                          closeShopModal();
                        }
                      }}
                      className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
                    >
                      <p className="text-xs font-black text-white">🔫 Tactical Ammo Pack</p>
                      <p className="text-[10px] text-amber-400 font-bold">+30 Rounds All Guns • ৳300</p>
                    </button>
                  </div>
                )}

                {activeShopModal.category === 'cinema' && (
                  <button
                    onClick={() => {
                      if (spendTaka(200, 'Blockbuster Cinemas IMAX Ticket', 'ব্লকবাস্টার সিনেমাস টিকিট')) {
                        healPlayer(100, 50);
                        setWantedLevel(0);
                        saveGameToStorage();
                        showBanner({
                          titleEn: '🎬 BLOCKBUSTER CINEMAS: FULL REST & WANTED CLEARED!',
                          titleBn: '🎬 ব্লকবাস্টার সিনেমাস: মুভি দেখে সম্পূর্ণ সুস্থ ও গেম সেভ!',
                          subtitleEn: 'Watched Dhaka Attack 2 in 3D IMAX! HP 100%, Wanted Cleared.',
                          subtitleBn: 'থ্রিডি আইম্যাক্স শো উপভোগ করেছেন।',
                          tone: 'gold',
                        });
                        closeShopModal();
                      }
                    }}
                    className="w-full p-3.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-left"
                  >
                    <p className="text-sm font-black text-white">🎬 Watch Dhaka Attack 2 (3D IMAX + Popcorn)</p>
                    <p className="text-xs text-amber-300 mt-0.5">Full Heal +50 Armor, Clear Wanted ★ & Save Game — ৳200</p>
                  </button>
                )}

                {activeShopModal.category === 'arcade' && (
                  <button
                    onClick={() => {
                      if (spendTaka(50, 'Future World VR & Arcade Tokens', 'গেম জোন টোকেন')) {
                        healPlayer(35, 0);
                        showBanner({
                          titleEn: '🎮 FUTURE WORLD GAME ZONE: HIGH SCORE!',
                          titleBn: '🎮 ফিউচার ওয়ার্ল্ড: হাই স্কোর!',
                          subtitleEn: 'Enjoyed VR racing & arcade machines (+35 HP)!',
                          subtitleBn: 'আর্কেড ও ভিআর গেম খেলে সতেজ হয়েছেন!',
                          tone: 'blue',
                        });
                        closeShopModal();
                      }
                    }}
                    className="w-full p-3.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 text-left"
                  >
                    <p className="text-sm font-black text-white">🎮 Play VR Racing & Bowling Tokens</p>
                    <p className="text-xs text-purple-200 mt-0.5">Restore Energy & +35 HP — ৳50</p>
                  </button>
                )}

                {(activeShopModal.category === 'footwear' || activeShopModal.category === 'books') && (
                  <button
                    onClick={() => {
                      if (spendTaka(activeShopModal.cost || 150, activeShopModal.titleEn, activeShopModal.titleBn)) {
                        healPlayer(50, 0);
                        setWantedLevel(Math.max(0, wantedLevel - 1));
                        showBanner({
                          titleEn: `${activeShopModal.titleEn}: REFRESHED (+50 HP & -1 WANTED)`,
                          titleBn: `${activeShopModal.titleEn}: সতেজ বিশ্রাম সম্পন্ন!`,
                          subtitleEn: 'Ready to explore Jamuna Future Park!',
                          subtitleBn: 'যমুনা ফিউচার পার্ক ঘুরে দেখুন!',
                          tone: 'green',
                        });
                        closeShopModal();
                      }
                    }}
                    className="w-full p-3.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-left"
                  >
                    <p className="text-sm font-black text-white">
                      {activeShopModal.category === 'books' ? '📚 Espresso & Bangla Novel (+50 HP, -1★)' : '👟 Fresh Running Sneakers (+50 HP)'}
                    </p>
                    <p className="text-xs text-emerald-300 mt-0.5">৳{activeShopModal.cost || 150}</p>
                  </button>
                )}

                {activeShopModal.category === 'atm' && (
                  <button
                    onClick={() => {
                      addTaka(500, 'DBBL Mall Cashback Bonus', 'ডাচ-বাংলা এটিএম বোনাস');
                      showBanner({
                        titleEn: '🏧 DBBL FAST TRACK: +৳500 CASHBACK ADDED!',
                        titleBn: '🏧 ডাচ-বাংলা এটিএম: +৳৫০০ ক্যাশব্যাক যোগ হয়েছে!',
                        subtitleEn: 'GF: Fashion | West Escalator -> 1F | East Escalator -> 2F Food Court & Cinema',
                        subtitleBn: 'নিচতলা: ফ্যাশন • ২য় তলা: গ্যাজেট • ৩য় তলা: ফুড কোর্ট ও সিনেমা!',
                        tone: 'green',
                      });
                      closeShopModal();
                    }}
                    className="w-full p-3.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-left"
                  >
                    <p className="text-sm font-black text-white">🏧 Claim DBBL Fast-Track Cashback (+৳500)</p>
                    <p className="text-xs text-emerald-300 mt-0.5">Free Mall Member Reward</p>
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span>Balance: <strong className="text-amber-400">৳{taka.toLocaleString()}</strong></span>
              <button onClick={closeShopModal} className="px-3 py-1 rounded-lg bg-slate-800 text-white font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME MODAL 2: DHAKA METRO RAIL (MRT) FAST TRAVEL */}
      {activeMetroModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  🚆 Dhaka Mass Rapid Transit (MRT Line 5 & 6)
                </span>
                <h3 className="text-base font-black text-white">
                  {language === 'en' ? 'Select Destination Station' : 'গন্তব্য মেট্রোরেল স্টেশন বাছুন'}
                </h3>
              </div>
              <button onClick={closeMetroModal} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {wantedLevel >= 3 && (
                <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-[11px] font-bold">
                  🚨{' '}
                  {language === 'en'
                    ? 'MRT SECURITY LOCKDOWN: Clear Wanted ★3+ police heat before boarding Dhaka Metro!'
                    : 'মেট্রোরেল নিরাপত্তা সতর্কতা: ★৩+ পুলিশ কেস থাকা অবস্থায় মেট্রোতে ওঠা নিষেধ!'}
                </div>
              )}
              {METRO_STATIONS.map((st) => {
                const isHere = st.id === activeMetroModal;
                const blockedByPolice = wantedLevel >= 3;
                const originStation = METRO_STATIONS.find((s) => s.id === activeMetroModal);
                const needsTransfer = Boolean(originStation && originStation.line !== st.line);
                return (
                  <button
                    key={st.id}
                    disabled={isHere || blockedByPolice}
                    onClick={() => {
                      const paid = spendTaka(st.fare, `Dhaka Metro Ticket -> ${st.nameEn}`, `মেট্রোরেল টিকিট -> ${st.nameBn}`);
                      if (!paid) {
                        showBanner({
                          titleEn: '🎫 RAPID PASS COURTESY RIDE',
                          titleBn: '🎫 র‍্যাপিড পাস সৌজন্য যাত্রা',
                          subtitleEn: 'Free emergency MRT boarding pass applied.',
                          subtitleBn: 'পর্যাপ্ত টাকা না থাকায় ফ্রি র‍্যাপিড পাস ব্যবহার হয়েছে।',
                          tone: 'gold',
                        });
                      }
                      requestMetroRide(activeMetroModal, st.id);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      isHere
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 cursor-default'
                        : blockedByPolice
                        ? 'bg-slate-950/50 border-slate-800/60 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-slate-950/85 hover:bg-slate-800 border-slate-800 text-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black">
                        [{st.line}] {language === 'en' ? st.nameEn : st.nameBn}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isHere
                          ? language === 'en'
                            ? 'Current Station'
                            : 'বর্তমান স্টেশন'
                          : needsTransfer
                          ? language === 'en'
                            ? 'Tap to board elevated train (Transfer at Mirpur-10)'
                            : 'মেট্রো ট্রেনে উঠুন (মিরপুর-১০ এ লাইন পরিবর্তন)'
                          : language === 'en'
                          ? 'Tap to board elevated express train'
                          : 'এলিভেটেড মেট্রো ট্রেনে উঠতে ক্লিক করুন'}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {isHere ? 'HERE' : `৳${st.fare}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* IN-GAME MODAL 3: DHAKA AUTO GARAGE RESPRAY & UPGRADES */}
      {activeGarageModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                  🔧 {language === 'en' ? 'Dhaka Auto Workshop & Customs' : 'ঢাকা অটো ওয়ার্কশপ ও মডিফিকেশন'}
                </span>
                <h3 className="text-base font-black text-white">
                  {language === 'en' ? 'Repair, Tune & Respray Nearest Vehicle' : 'গাড়ি মেরামত, স্পিড টিউনিং ও রঙ পরিবর্তন'}
                </h3>
              </div>
              <button onClick={closeGarageModal} className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  if (spendTaka(200, 'Garage Full Vehicle Repair', 'গাড়ি ফুল মেরামত')) {
                    requestRepairVehicle();
                    showBanner({
                      titleEn: '🔧 VEHICLE 100% REPAIRED!',
                      titleBn: '🔧 গাড়ি সম্পূর্ণ মেরামত সম্পন্ন!',
                      subtitleEn: 'Engine & chassis restored to factory condition.',
                      subtitleBn: 'ইঞ্জিন ও বডি নতুনের মতো হয়েছে।',
                      tone: 'green',
                    });
                    closeGarageModal();
                  }
                }}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
              >
                <p className="text-xs font-black text-white">🔧 Full Body Repair</p>
                <p className="text-[10px] text-emerald-400 font-bold">100% Vehicle HP • ৳200</p>
              </button>

              <button
                onClick={() => {
                  if (spendTaka(500, 'Garage Turbo & Armor Tune', 'টার্বো ও বডি আর্মার টিউনিং')) {
                    requestUpgradeVehicle();
                    showBanner({
                      titleEn: '⚡ TURBO +25% SPEED & +35% ARMOR APPLIED!',
                      titleBn: '⚡ গাড়িতে টার্বো গতি ও হেভি আর্মার যুক্ত!',
                      subtitleEn: 'Your vehicle now outperforms Dhaka traffic.',
                      subtitleBn: 'আপনার গাড়ি এখন সুপারচার্জড!',
                      tone: 'gold',
                    });
                    closeGarageModal();
                  }
                }}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left"
              >
                <p className="text-xs font-black text-white">⚡ Turbo & Armor Tune</p>
                <p className="text-[10px] text-amber-400 font-bold">+25% Speed & +35% HP • ৳500</p>
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-300 mb-2">
                🎨 {language === 'en' ? 'Custom Dhaka Paint Respray (৳150)' : 'পছন্দের রঙ করুন (৳১৫০)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Pearl', hex: '#f8fafc' },
                  { name: 'Crimson', hex: '#dc2626' },
                  { name: 'Cobalt', hex: '#0284c7' },
                  { name: 'CNG Green', hex: '#15803d' },
                  { name: 'Gold', hex: '#eab308' },
                  { name: 'Obsidian', hex: '#0f172a' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      if (spendTaka(150, `Respray Paint: ${c.name}`, `গাড়ির রঙ: ${c.name}`)) {
                        requestResprayVehicle(c.hex);
                        showBanner({
                          titleEn: `🎨 PAINT JOB COMPLETE (${c.name.toUpperCase()})`,
                          titleBn: `🎨 নতুন রঙ সম্পন্ন!`,
                          subtitleEn: 'Fresh metallic lacquer applied in workshop.',
                          subtitleBn: 'গাড়িতে ঝকঝকে নতুন রঙ করা হয়েছে।',
                          tone: 'blue',
                        });
                        closeGarageModal();
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 text-[11px] font-bold text-white"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (spendTaka(300, 'Workshop Tuned CNG Delivery', 'গ্যারেজ সিএনজি ডেলিভারি')) {
                  requestSpawnVehicle('cng');
                  closeGarageModal();
                }
              }}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
            >
              🛺 Deliver Fresh CNG Outside Garage (৳300)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
