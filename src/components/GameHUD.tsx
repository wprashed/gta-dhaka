import React, { useState } from 'react';
import { formatGameClock, useGameStore } from '../store/useGameStore';
import {
  DISTRICTS,
  SIDE_MISSIONS,
  STORY_MISSIONS,
  VEHICLE_STATS,
} from '../data/dhakaWorldData';
import {
  CHARACTER_PORTRAITS,
  DHAKA_DISTRICT_PHOTOS,
  DHAKA_VEHICLE_PHOTOS,
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
  Heart,
  HelpCircle,
  Keyboard,
  Languages,
  MapPin,
  Pause,
  Radio,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Swords,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';
import { RadioStationId, ToolWeaponId, WeatherType } from '../types/game';

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
    health,
    maxHealth,
    armor,
    maxArmor,
    stamina,
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
    setGamePhase,
    requestSpawnVehicle,
    storyEndingEn,
    storyEndingBn,
  } = useGameStore();

  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [isMissionCollapsed, setIsMissionCollapsed] = useState(false);

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
    off: { en: 'Radio Off', bn: 'বন্ধ' },
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
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 z-20 overflow-hidden font-sans">
      {/* ==================== TOP BAR ==================== */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* TOP-LEFT: Clean, Streamlined Mission Tracker */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-xs sm:max-w-sm">
          {activeMission && activeStep ? (
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-2.5 shadow-xl transition-all">
              {/* Header row with chapter badge, distance, timer and collapse toggle */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 truncate">
                  {language === 'en'
                    ? activeMission.chapterTitleEn
                    : activeMission.chapterTitleBn}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {distToObjective !== null && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <MapPin className="w-3 h-3" /> {distToObjective}m
                    </span>
                  )}
                  {missionTimer !== null && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        missionTimer < 20
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 text-amber-300'
                      }`}
                    >
                      ⏱ {Math.ceil(missionTimer)}s
                    </span>
                  )}
                  <button
                    onClick={() => setIsMissionCollapsed(!isMissionCollapsed)}
                    className="text-slate-400 hover:text-white p-0.5"
                    title={isMissionCollapsed ? 'Expand Details' : 'Collapse Details'}
                  >
                    {isMissionCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mission Title */}
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                {language === 'en' ? activeMission.titleEn : activeMission.titleBn}
              </h3>

              {/* Collapsible Instruction & Step Progress */}
              {!isMissionCollapsed && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/80">
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {language === 'en'
                      ? activeStep.instructionEn
                      : activeStep.instructionBn}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
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
                </div>
              )}
            </div>
          ) : (
            /* Ambient District Badge when roaming */
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-1.5 shadow-lg flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-white">
                  {language === 'en' ? districtInfo.nameEn : districtInfo.nameBn}
                </span>
              </div>
              <span className="text-[9px] text-amber-300 font-semibold">
                [M] Missions
              </span>
            </div>
          )}

          {/* Quick Action Pill Bar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => requestSpawnVehicle('cng')}
              className="bg-slate-900/80 hover:bg-emerald-800/80 text-emerald-300 hover:text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-800 hover:border-emerald-500/50 shadow flex items-center gap-1 transition-all active:scale-95"
              title="Spawn green CNG baby taxi"
            >
              <Car className="w-3 h-3 text-emerald-400" />
              <span>{language === 'en' ? 'CNG' : 'সিএনজি'}</span>
            </button>

            <button
              onClick={() => requestSpawnVehicle('rickshaw')}
              className="bg-slate-900/80 hover:bg-pink-800/80 text-pink-300 hover:text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-800 hover:border-pink-500/50 shadow flex items-center gap-1 transition-all active:scale-95"
              title="Spawn cycle rickshaw"
            >
              <span>🚲</span>
              <span>{language === 'en' ? 'Rickshaw' : 'রিকশা'}</span>
            </button>

            <button
              onClick={() => setGamePhase('paused', 'sketchfab')}
              className="bg-slate-900/80 hover:bg-amber-600/80 text-amber-300 hover:text-slate-950 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-800 hover:border-amber-400/50 shadow flex items-center gap-1 transition-all active:scale-95"
              title="Browse & spawn Sketchfab 3D assets"
            >
              <Box className="w-3 h-3" />
              <span>3D</span>
            </button>

            <button
              onClick={() => setGamePhase('paused', 'missions')}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-800 shadow transition-all"
              title="Open full mission journal [M]"
            >
              {language === 'en' ? 'Missions' : 'মিশন'}
            </button>
          </div>
        </div>

        {/* TOP-CENTER: Milestone / Reward Banner */}
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
            <p className="text-xs font-black uppercase tracking-wider">
              {language === 'en' ? bannerAlert.titleEn : bannerAlert.titleBn}
            </p>
            <p className="text-[10px] text-slate-200 font-medium">
              {language === 'en' ? bannerAlert.subtitleEn : bannerAlert.subtitleBn}
            </p>
            {bannerAlert.rewardTaka && (
              <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                + ৳ {bannerAlert.rewardTaka.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* TOP-RIGHT: Streamlined Status, Vitals & Compact Arsenal */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          {/* Status Capsule: Avatar, ৳ Taka, Clock, Wanted, Weather, Language, Pause */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-xl">
            {/* Avatar */}
            <img
              src={CHARACTER_PORTRAITS.arif}
              alt="Arif Rahman"
              className="w-6 h-6 rounded-full object-cover border border-amber-400 shrink-0"
            />

            {/* Taka Wallet */}
            <div className="flex items-center gap-1 font-mono font-bold text-emerald-400 text-sm tabular-nums">
              <span className="text-xs text-emerald-500 font-sans">৳</span>
              <span>{taka.toLocaleString()}</span>
            </div>

            <span className="text-slate-700 select-none">|</span>

            {/* In-Game Clock */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 tabular-nums">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{formatGameClock(timeOfDay)}</span>
            </div>

            {/* Wanted Stars (only highlighted if police are alert) */}
            {wantedLevel > 0 && (
              <>
                <span className="text-slate-700 select-none">|</span>
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/70 animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  {[...Array(wantedLevel)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[9px] font-mono font-bold text-red-300 ml-0.5">
                    {Math.ceil(wantedCooldown)}s
                  </span>
                </div>
              </>
            )}

            <span className="text-slate-700 select-none">|</span>

            {/* Weather / Time Dropdown Pill */}
            <div className="relative">
              <button
                onClick={() => setShowWeatherMenu(!showWeatherMenu)}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 transition-colors"
                title="Change weather & time of day"
              >
                <WeatherIcon className="w-3 h-3 text-amber-400" />
                <span className="capitalize">
                  {language === 'en' ? currentWeatherOpt.labelEn : currentWeatherOpt.labelBn}
                </span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
              </button>

              {showWeatherMenu && (
                <div className="absolute right-0 top-full mt-1.5 bg-slate-950/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 z-30 min-w-[105px]">
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

            <span className="text-slate-700 select-none">|</span>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
              title="Toggle English / বাংলা"
            >
              {language === 'en' ? 'বাংলা' : 'EN'}
            </button>

            {/* Pause Menu Trigger */}
            <button
              onClick={() => setGamePhase('paused', 'map')}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
              title="Pause Menu [ESC]"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 2: Compact Vitals Bar + Sleek Active Weapon Badge */}
          <div className="flex items-center gap-2">
            {/* Vitals (Health & Armor) */}
            <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-1 w-36 sm:w-40">
              {/* Health */}
              <div className="flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-200"
                    style={{
                      width: `${Math.max(0, Math.min(100, (health / maxHealth) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-200 w-6 text-right tabular-nums">
                  {Math.round(health)}
                </span>
              </div>

              {/* Armor */}
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-400 fill-cyan-400/40 shrink-0" />
                <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-200"
                    style={{
                      width: `${Math.max(0, Math.min(100, (armor / maxArmor) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-cyan-300 w-6 text-right tabular-nums">
                  {Math.round(armor)}
                </span>
              </div>
            </div>

            {/* Active Weapon Pill + Quick Switch Drawer Trigger */}
            <div className="relative">
              <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-xl flex items-center gap-2">
                <button
                  onClick={() => setShowWeaponDrawer(!showWeaponDrawer)}
                  className="flex items-center gap-1.5 text-left group"
                  title="Click to switch weapons [Q / 1-0]"
                >
                  <span className="text-xs">
                    {activeTool.isFirearm ? '🔫' : '🗡️'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white group-hover:text-amber-300 leading-none truncate max-w-[80px]">
                      {language === 'en' ? activeTool.nameEn : activeTool.nameBn}
                    </span>
                    <span className="text-[8px] font-mono text-amber-400 font-semibold mt-0.5">
                      {activeTool.isFirearm ? 'GUN [Q]' : 'MELEE [Q]'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => onTriggerAction('attack')}
                  className="bg-red-600/90 hover:bg-red-500 text-white text-[9px] font-black px-1.5 py-1 rounded shadow active:scale-95 shrink-0"
                  title="Fire or Strike weapon [X]"
                >
                  <Crosshair className="w-3 h-3" />
                </button>
              </div>

              {/* Collapsible Weapon Selection Drawer */}
              {showWeaponDrawer && (
                <div className="absolute right-0 top-full mt-1.5 bg-slate-950/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 z-30 w-56">
                  <div>
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      {language === 'en' ? 'Melee Weapons [1-6]' : 'দেশীয় অস্ত্র [১-৬]'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {meleeWeapons.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            equipTool(item.id);
                            setShowWeaponDrawer(false);
                          }}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold text-center truncate transition-colors ${
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

                  <div className="pt-1.5 border-t border-slate-800">
                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                      {language === 'en' ? 'Firearms [7-0]' : 'আগ্নেয়াস্ত্র [৭-০]'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {firearms.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            equipTool(item.id);
                            setShowWeaponDrawer(false);
                          }}
                          className={`px-1.5 py-1 rounded text-[10px] font-bold text-center truncate transition-colors ${
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
          </div>
        </div>
      </div>

      {/* ==================== CENTER SCREEN ==================== */}
      {/* Aiming Reticle (Only when wielding a firearm on foot) */}
      {!inVehicleId && activeTool?.isFirearm && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative w-6 h-6 flex items-center justify-center opacity-80">
            <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <div className="absolute w-5 h-5 rounded-full border border-amber-400/60" />
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
        <div className="pointer-events-auto mx-auto my-auto max-w-md w-full bg-slate-950/95 backdrop-blur-xl border border-amber-400 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Crosshair className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'CRITICAL STORY DECISION' : 'গুরুত্বপূর্ণ সিদ্ধান্ত'}</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-3 leading-snug">
            {language === 'en' ? activeChoicePrompt.questionEn : activeChoicePrompt.questionBn}
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => resolveMissionChoice('A')}
              className="w-full text-left p-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-100 text-xs font-semibold transition-colors"
            >
              <span className="inline-block bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded mr-1.5 text-[10px]">
                A
              </span>
              {language === 'en' ? activeChoicePrompt.optionAEn : activeChoicePrompt.optionABn}
            </button>
            <button
              onClick={() => resolveMissionChoice('B')}
              className="w-full text-left p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-100 text-xs font-semibold transition-colors"
            >
              <span className="inline-block bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded mr-1.5 text-[10px]">
                B
              </span>
              {language === 'en' ? activeChoicePrompt.optionBEn : activeChoicePrompt.optionBBn}
            </button>
          </div>
        </div>
      )}

      {/* ==================== BOTTOM BAR ==================== */}
      <div className="flex items-end justify-between gap-3 w-full">
        {/* BOTTOM-LEFT: Minimap & Discreet Control Help */}
        <div className="pointer-events-auto flex flex-col gap-1.5">
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
                <span><kbd className="text-amber-400 font-bold">W A S D</kbd> : Move / Steer</span>
                <span><kbd className="text-amber-400 font-bold">F / E</kbd> : Enter / Talk</span>
                <span><kbd className="text-amber-400 font-bold">H</kbd> : Horn / Bell</span>
                <span><kbd className="text-amber-400 font-bold">SPACE</kbd> : Drift / Jump</span>
                <span><kbd className="text-amber-400 font-bold">Q / 1-0</kbd> : Weapons</span>
                <span><kbd className="text-amber-400 font-bold">CLICK / X</kbd> : Attack</span>
                <span><kbd className="text-amber-400 font-bold">V</kbd> : Camera View</span>
                <span><kbd className="text-amber-400 font-bold">M</kbd> : GPS Map</span>
                <span><kbd className="text-amber-400 font-bold">R</kbd> : Radio Station</span>
                <span><kbd className="text-amber-400 font-bold">ESC</kbd> : Pause Menu</span>
              </div>
            </div>
          )}

          <MinimapHUD />

          {/* Minimalist Keybind Hint Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-300">
            <span>
              <kbd className="text-amber-400 font-bold">WASD</kbd> Move
            </span>
            <span>•</span>
            <span>
              <kbd className="text-amber-400 font-bold">F</kbd> Action
            </span>
            <span>•</span>
            <span>
              <kbd className="text-amber-400 font-bold">M</kbd> Map
            </span>
            <span>•</span>
            <button
              onClick={() => setShowControlsHelp(!showControlsHelp)}
              className="text-amber-400 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showControlsHelp ? 'Hide' : 'Controls'}</span>
            </button>
          </div>
        </div>

        {/* BOTTOM-CENTER: Interaction Prompt & Dialogue */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-lg w-full mx-auto">
          {nearbyPrompt && (
            <button
              onClick={() => onTriggerAction('interact')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-full shadow-2xl border border-white flex items-center gap-1.5 transition-transform active:scale-95 animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>{language === 'en' ? nearbyPrompt.labelEn : nearbyPrompt.labelBn}</span>
            </button>
          )}

          {activeDialogue && (
            <div className="w-full bg-slate-950/92 backdrop-blur-lg border border-amber-500/50 rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3">
              <img
                src={getPortraitForSpeaker(activeDialogue.speakerEn)}
                alt={activeDialogue.speakerEn}
                className="w-12 h-12 rounded-lg object-cover border border-amber-400 shrink-0 shadow"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 truncate">
                    {language === 'en' ? activeDialogue.speakerEn : activeDialogue.speakerBn}
                  </span>
                </div>
                <p className="text-xs text-slate-100 mt-0.5 leading-snug font-medium line-clamp-3">
                  “{language === 'en' ? activeDialogue.textEn : activeDialogue.textBn}”
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

        {/* BOTTOM-RIGHT: Integrated Vehicle Dashboard & Contextual Actions */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
          {/* In-Vehicle Minimalist Cockpit HUD */}
          {inVehicleId && vehicleStats && currentVehicleType ? (
            <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 rounded-xl p-2.5 w-56 shadow-2xl flex flex-col gap-1.5">
              {/* Header: Name + Speedometer */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="truncate flex-1">
                  <p className="text-[11px] font-bold text-emerald-400 truncate">
                    {language === 'en' ? vehicleStats.nameEn : vehicleStats.nameBn}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {language === 'en' ? '[H] Horn • [Space] Drift' : '[H] হর্ন • [Space] ব্রেক'}
                  </p>
                </div>
                <div className="text-right pl-1">
                  <span className="text-xl font-black font-mono text-white leading-none tabular-nums">
                    {currentVehicleSpeedKmh}
                  </span>
                  <span className="block text-[8px] font-bold text-amber-400 uppercase leading-none mt-0.5">
                    KM/H
                  </span>
                </div>
              </div>

              {/* Vehicle Integrity Bar */}
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3 h-3 text-slate-400 shrink-0" />
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
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

              {/* Radio Station Switcher */}
              <button
                onClick={() => {
                  const list: RadioStationId[] = [
                    'dhaka_folk',
                    'gully_beat',
                    'hatirjheel_synth',
                    'off',
                  ];
                  const next = list[(list.indexOf(radioStation) + 1) % list.length];
                  setRadioStation(next);
                }}
                className="w-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between text-[10px] text-amber-300 font-semibold transition-colors"
                title="Change Radio Station [R]"
              >
                <span className="flex items-center gap-1 truncate">
                  <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {language === 'en' ? radioLabels[radioStation].en : radioLabels[radioStation].bn}
                  </span>
                </span>
                <span className="text-[8px] text-slate-400">[R]</span>
              </button>

              {/* Exit Vehicle Action Button */}
              <button
                onClick={() => onTriggerAction('interact')}
                className="w-full bg-emerald-700/80 hover:bg-emerald-600 text-white text-[10px] font-bold py-1 rounded-lg border border-emerald-500/40 shadow transition-transform active:scale-95"
              >
                {language === 'en' ? 'Exit Vehicle [F]' : 'গাড়ি থেকে নামুন [F]'}
              </button>
            </div>
          ) : (
            /* On-Foot Minimalist Action Pills */
            <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onTriggerAction('interact')}
                className="bg-emerald-700/90 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/40 shadow transition-transform active:scale-95"
                title="Interact / Enter Vehicle / Shop [F]"
              >
                {language === 'en' ? 'Action [F]' : 'কাজ [F]'}
              </button>

              <button
                onClick={() => onTriggerAction('camera')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-700 transition-colors"
                title="Toggle Camera Distance [V]"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
