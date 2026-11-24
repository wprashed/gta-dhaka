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
  SIDE_MISSIONS,
  STORY_MISSIONS,
  VEHICLE_STATS,
} from '../data/dhakaWorldData';
import {
  CHARACTER_PORTRAITS,
  getPortraitForSpeaker,
} from '../data/sketchfabGtaCatalog';
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
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera'
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
    storyEndingEn,
    storyEndingBn,
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
        {/* TOP-LEFT: Ultra-Minimalist Floating Objective Badge */}
        <div className="pointer-events-auto flex items-start gap-1.5 max-w-sm">
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
              className="w-5 h-5 rounded-full object-cover border border-amber-400/80 shrink-0"
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

        {/* BOTTOM-CENTER: Minimal Subtitle Dialogue & Interaction Banner */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-lg w-full mx-auto">
          {nearbyPrompt && (
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
                className="w-10 h-10 rounded-lg object-cover border border-amber-400/80 shrink-0 shadow"
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
                  <p className="text-[8px] text-slate-400 font-mono">
                    [F] Exit • [H] Horn
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-white leading-none tabular-nums">
                    {currentVehicleSpeedKmh}
                  </span>
                  <span className="block text-[7px] font-bold text-amber-400 uppercase leading-none mt-0.5">
                    KM/H
                  </span>
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

              {/* Radio Pill */}
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
                className="flex items-center justify-between text-[9px] text-amber-300 font-medium hover:text-white transition-colors pt-0.5"
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
                <span className="text-[8px] text-slate-500 font-mono">[R]</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
