import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Crosshair,
  Flame,
  Heart,
  Languages,
  Map as MapIcon,
  MapPin,
  Navigation,
  Pause,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';
import { RadioStationId, ToolWeaponId, WeatherType } from '../types/game';

interface GameHUDProps {
  onTriggerAction: (
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera' | 'aim'
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
    weaponAmmo,
    isReloading,
    cycleWeapon,
    reloadActiveWeapon,
    setGamePhase,
    requestSpawnVehicle,
    storyEndingEn,
    storyEndingBn,
    districtArrivalNotice,
    dismissDistrictArrival,
    isAimingDownSights,
    isNitroActive,
  } = useGameStore();

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

  const arrivalDistrict = districtArrivalNotice
    ? DISTRICTS.find((d) => d.id === districtArrivalNotice.districtId) || districtInfo
    : null;

  const vehicleStats = currentVehicleType
    ? VEHICLE_STATS[currentVehicleType]
    : null;

  const activeWeapon =
    tools.find((t) => t.id === equippedToolId) || tools[0];
  const activeAmmo = weaponAmmo[activeWeapon.id] || { clip: 0, reserve: 0 };

  const radioLabels: Record<RadioStationId, { en: string; bn: string }> = {
    dhaka_folk: { en: '98.4 FM Folk Fusion', bn: '৯৮.৪ এফএম বাংলা ফোক' },
    gully_beat: { en: '101.2 FM Gully Beat', bn: '১০১.২ এফএম গলি হিপহপ' },
    hatirjheel_synth: { en: '105.6 FM Night Synth', bn: '১০৫.৬ হাতিরঝিল নাইটস' },
    off: { en: 'Radio Off', bn: 'রেডিও বন্ধ' },
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20 overflow-hidden">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* TOP-LEFT: Active Story/Side Mission Card & Quick Spawn */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-xs sm:max-w-sm">
          {activeMission && activeStep ? (
            <div className="bg-slate-950/90 backdrop-blur-md border-l-4 border-amber-400 rounded-r-xl p-3.5 shadow-2xl border-y border-r border-slate-800/80">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {language === 'en'
                    ? activeMission.chapterTitleEn
                    : activeMission.chapterTitleBn}
                </span>
                {distToObjective !== null && (
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {distToObjective}m
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {language === 'en'
                  ? activeMission.titleEn
                  : activeMission.titleBn}
              </h3>

              <p className="text-xs text-amber-200/95 mt-1 leading-relaxed font-medium">
                {language === 'en'
                  ? activeStep.instructionEn
                  : activeStep.instructionBn}
              </p>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  {activeMission.steps.map((st, idx) => (
                    <span
                      key={st.id}
                      className={`h-1.5 rounded-full transition-all ${
                        idx < activeMissionStepIndex
                          ? 'w-4 bg-emerald-400'
                          : idx === activeMissionStepIndex
                          ? 'w-6 bg-amber-400'
                          : 'w-3 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {missionTimer !== null && (
                  <span
                    className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                      missionTimer < 20
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-800 text-amber-300'
                    }`}
                  >
                    ⏱ {Math.ceil(missionTimer)}s
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => setGamePhase('paused', 'map')}
              className="tactical-glass border border-emerald-500/50 glow-cng rounded-xl p-2.5 shadow-2xl flex items-center gap-3 cursor-pointer group hover:border-amber-400 transition-all tactical-chamfer"
              title="Click to open Dhaka Locations Dossier & Fast Travel [M]"
            >
              <div className="relative shrink-0 overflow-hidden rounded-lg border border-emerald-400/60 shadow">
                <img
                  src={DHAKA_DISTRICT_PHOTOS[currentDistrict]}
                  alt={districtInfo.nameEn}
                  className="w-16 h-12 object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0.5 right-0.5 bg-slate-950/90 text-amber-300 text-[8px] font-mono font-bold px-1 rounded">
                  {districtInfo.tacticalCode?.split('//')[0] || 'SEC'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <p className="text-[11px] font-black font-display text-white uppercase tracking-wider truncate">
                    {language === 'en' ? districtInfo.nameEn : districtInfo.nameBn}
                  </p>
                </div>
                <p className="text-[10px] text-amber-400 font-mono font-semibold truncate mt-0.5">
                  {language === 'en' ? districtInfo.vibeEn : districtInfo.vibeBn}
                </p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate flex items-center gap-1">
                  <span>GPS: {districtInfo.coordinates}</span>
                  <span className="text-cyan-400 font-bold">[M]</span>
                </p>
              </div>
            </div>
          )}

          {/* Quick Action Strip - Monsoon Underworld Tactical Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => requestSpawnVehicle('cng')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-mono font-black px-2.5 py-1.5 rounded-md border border-emerald-300 glow-cng flex items-center gap-1.5 transition-all active:scale-95 shadow"
            >
              <Car className="w-3.5 h-3.5 text-slate-950" />
              {language === 'en' ? 'CALL CNG' : 'সিএনজি ডাকুন'}
            </button>

            <button
              onClick={() => requestSpawnVehicle('rickshaw')}
              className="bg-slate-900/90 hover:bg-pink-900/60 text-pink-300 hover:text-white text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-md border border-pink-500/40 shadow flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span className="text-amber-400">🚲</span>
              {language === 'en' ? 'RICKSHAW' : 'রিকশা'}
            </button>

            <button
              onClick={() => setGamePhase('paused', 'map')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-mono font-black px-2.5 py-1.5 rounded-md border border-amber-200 glow-amber shadow flex items-center gap-1 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              {language === 'en' ? 'LOCATIONS [M]' : 'লোকেশন [M]'}
            </button>

            <button
              onClick={() => setGamePhase('paused', 'sketchfab')}
              className="bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 text-[11px] font-mono font-black px-2.5 py-1.5 rounded-md border border-cyan-300 glow-neon shadow flex items-center gap-1 transition-all active:scale-95"
            >
              <Box className="w-3.5 h-3.5" />
              {language === 'en' ? '3D LAB' : 'থ্রিডি'}
            </button>

            <button
              onClick={() => setGamePhase('main_menu')}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono font-bold px-2 py-1.5 rounded-md border border-slate-700 shadow flex items-center gap-1 transition-all active:scale-95"
            >
              {language === 'en' ? 'MENU' : 'মেনু'}
            </button>
          </div>
        </div>

        {/* TOP-CENTER: Cinematic District Arrival Title Card & Celebratory Banners */}
        <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-lg w-full mx-auto">
          {arrivalDistrict && (
            <div
              key={districtArrivalNotice?.key}
              className="w-full tactical-glass-dark border border-emerald-400/80 rounded-xl overflow-hidden shadow-2xl glow-cng tactical-chamfer animate-location-banner relative"
            >
              <div className="relative h-28 sm:h-32 w-full overflow-hidden">
                <img
                  src={arrivalDistrict.bannerImage || DHAKA_DISTRICT_PHOTOS[arrivalDistrict.id]}
                  alt={arrivalDistrict.nameEn}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                <div className="absolute inset-0 scanlines opacity-35 pointer-events-none" />

                {/* Top Telemetry Header */}
                <div className="absolute top-2 inset-x-3 flex items-center justify-between text-[10px] font-mono">
                  <span className="bg-slate-950/90 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/40 tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LOCATION ENTERED // {arrivalDistrict.tacticalCode || 'SEC-04'}
                  </span>
                  <button
                    onClick={dismissDistrictArrival}
                    className="bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-700 transition-colors"
                  >
                    [✕]
                  </button>
                </div>

                {/* Title & Coordinates on Banner */}
                <div className="absolute bottom-2 inset-x-3 flex items-end justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-none drop-shadow-lg">
                      {language === 'en' ? arrivalDistrict.nameEn : arrivalDistrict.nameBn}
                    </h2>
                    <p className="text-xs font-bold text-amber-300 drop-shadow mt-0.5">
                      {language === 'en' ? arrivalDistrict.nameBn : arrivalDistrict.nameEn} • {language === 'en' ? arrivalDistrict.vibeEn : arrivalDistrict.vibeBn}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold text-cyan-300 block bg-slate-950/85 px-2 py-0.5 rounded border border-cyan-500/40">
                      {arrivalDistrict.coordinates || '23°43\'N 90°24\'E'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Telemetry strip */}
              <div className="bg-slate-950/95 px-3 py-1.5 flex items-center justify-between text-[11px] border-t border-slate-800">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    {arrivalDistrict.threatLevel || 'HEAT 3'}
                  </span>
                  <span className="text-slate-300 text-[10px] truncate">
                    {arrivalDistrict.landmarksEn ? arrivalDistrict.landmarksEn[0] : 'Landmark Area'}
                  </span>
                </div>
                <button
                  onClick={() => setGamePhase('paused', 'map')}
                  className="text-[10px] font-mono font-bold text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <MapIcon className="w-3 h-3" /> View Map [M]
                </button>
              </div>
            </div>
          )}

        {/* TOP-CENTER: Celebratory Banner Alert */}
        {bannerAlert && (
          <div
            className={`pointer-events-auto max-w-md w-full mx-auto px-5 py-3.5 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-center transform transition-all animate-bounce ${
              bannerAlert.tone === 'gold'
                ? 'bg-slate-950/95 border-amber-400 text-amber-300'
                : bannerAlert.tone === 'red'
                ? 'bg-red-950/95 border-red-500 text-red-200'
                : bannerAlert.tone === 'green'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
                : 'bg-slate-950/95 border-cyan-400 text-cyan-200'
            }`}
          >
            <p className="text-sm sm:text-base font-black tracking-wide uppercase">
              {language === 'en' ? bannerAlert.titleEn : bannerAlert.titleBn}
            </p>
            <p className="text-xs text-slate-200 mt-0.5 font-medium">
              {language === 'en'
                ? bannerAlert.subtitleEn
                : bannerAlert.subtitleBn}
            </p>
            {bannerAlert.rewardTaka && (
              <p className="text-base font-extrabold text-emerald-400 mt-1">
                + ৳ {bannerAlert.rewardTaka.toLocaleString()}
              </p>
            )}
          </div>
        )}
        </div>

        {/* TOP-RIGHT: Realistic Arif Portrait, Wallet (Taka ৳), Wanted Stars, Health/Armor/Stamina */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-2xl">
            {/* Realistic Character Avatar Portrait */}
            <img
              src={CHARACTER_PORTRAITS.arif}
              alt="Arif Rahman"
              className="w-8 h-8 rounded-lg object-cover border border-amber-400 shadow"
            />

            {/* Taka Currency Display */}
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-800">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 font-black text-sm flex items-center justify-center">
                ৳
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-400 tracking-tight">
                {taka.toLocaleString()}
              </span>
            </div>

            {/* Game Clock */}
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300 pr-2 border-r border-slate-800">
              <Clock className="w-3.5 h-3.5" />
              {formatGameClock(timeOfDay)}
            </div>

            {/* Bilingual Toggle */}
            <button
              onClick={toggleLanguage}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'en' ? 'বাংলা' : 'EN'}
            </button>

            <button
              onClick={() => setGamePhase('paused', 'map')}
              className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Pause / Open Menu [ESC]"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* WANTED LEVEL STARS */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
              wantedLevel > 0
                ? 'bg-red-950/90 border-red-500 shadow-lg shadow-red-950/60'
                : 'bg-slate-950/75 border-slate-800/80'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <ShieldAlert
                className={`w-3.5 h-3.5 ${
                  wantedLevel > 0
                    ? 'text-red-400 animate-ping'
                    : 'text-slate-500'
                }`}
              />
              {language === 'en' ? 'DMP Wanted' : 'পুলিশ ওয়ান্টেড'}
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= wantedLevel
                      ? 'text-amber-400 fill-amber-400 drop-shadow'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            {wantedLevel > 0 && (
              <span className="text-[11px] font-mono font-bold text-red-300 ml-1">
                {Math.ceil(wantedCooldown)}s
              </span>
            )}
          </div>

          {/* HEALTH, ARMOR & STAMINA BARS */}
          <div className="bg-slate-950/88 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 w-56 shadow-xl flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 shrink-0 fill-rose-500" />
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-600 to-emerald-400 h-full transition-all duration-200"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (health / maxHealth) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-white w-8 text-right">
                {Math.round(health)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 fill-cyan-400/30" />
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-200"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (armor / maxArmor) * 100)
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-300 w-8 text-right">
                {Math.round(armor)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, stamina))}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 w-8 text-right">
                {Math.round(stamina)}
              </span>
            </div>

            {/* Tactical Dhaka Armory Arsenal & Ammo Card */}
            <div className="pt-2 border-t border-slate-800/90 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base select-none">{activeWeapon.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-300 truncate font-mono tracking-tight leading-none">
                      {language === 'en' ? activeWeapon.nameEn : activeWeapon.nameBn}
                    </p>
                    <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-400">
                      {activeWeapon.isGun
                        ? activeWeapon.category === 'shotgun'
                          ? 'DESHI SHOTGUN'
                          : activeWeapon.category === 'rifle'
                          ? 'ASSAULT RIFLE'
                          : 'LOCAL PISTOL'
                        : 'MELEE WEAPON'}
                    </span>
                  </div>
                </div>

                {/* Ammo Display / Reload Action */}
                {activeWeapon.isGun ? (
                  <div className="flex items-center gap-1.5">
                    {isReloading ? (
                      <span className="text-[10px] font-black text-amber-400 animate-pulse flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 animate-spin" />
                        RELOAD
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30">
                        <span className="text-sm font-black font-mono text-white">
                          {activeAmmo.clip}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          / {activeAmmo.reserve}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => reloadActiveWeapon()}
                      disabled={
                        isReloading ||
                        activeAmmo.clip >= activeWeapon.clipSize ||
                        activeAmmo.reserve <= 0
                      }
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white"
                      title="Reload [R]"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    DMG {activeWeapon.damage}
                  </span>
                )}
              </div>

              {/* Weapon Carousel & Quick Hotkeys Strip */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  onClick={() => cycleWeapon(-1)}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors"
                  title="Previous Weapon [Q]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 overflow-x-auto max-w-[210px] no-scrollbar py-0.5">
                  {tools
                    .filter((t) => t.unlocked)
                    .map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => equipTool(t.id as ToolWeaponId)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-all border ${
                          equippedToolId === t.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_8px_#f59e0b]'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border-slate-800'
                        }`}
                        title={`${t.nameEn} [${idx + 1}]`}
                      >
                        <span className="mr-0.5 opacity-60">
                          {idx === 9 ? '0' : idx + 1}:
                        </span>
                        {t.id === 'fists'
                          ? 'Fist'
                          : t.id === 'ramda'
                          ? 'Ramda'
                          : t.id === 'chapati'
                          ? 'Chapati'
                          : t.id === 'pipe_gun'
                          ? 'Pipe'
                          : t.id === 'shutter_pistol'
                          ? 'Shutter'
                          : t.id === 'tt_pistol'
                          ? 'TT-33'
                          : t.id === 'katta'
                          ? 'Katta'
                          : t.id === 'type56_ak'
                          ? 'AK-47'
                          : t.id === 'cricket_bat'
                          ? 'Bat'
                          : t.id === 'bamboo_lathi'
                          ? 'Lathi'
                          : 'Stun'}
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => cycleWeapon(1)}
                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors"
                  title="Next Weapon [X / Wheel]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* QUICK WEATHER CONTROLS */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/80">
            {(
              [
                { id: 'golden_hour', label: 'Sunset', icon: Sun },
                { id: 'clear', label: 'Noon', icon: Sparkles },
                { id: 'monsoon_rain', label: 'Monsoon', icon: CloudRain },
                { id: 'night', label: 'Night', icon: Clock },
              ] as Array<{
                id: WeatherType;
                label: string;
                icon: React.ElementType;
              }>
            ).map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                    weather === w.id
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CENTER-SCREEN: Story Ending Unlocked Banner */}
      {storyEndingEn && (
        <div className="pointer-events-auto mx-auto max-w-lg bg-gradient-to-r from-emerald-950/95 via-slate-950/95 to-amber-950/95 border-2 border-amber-400 rounded-2xl p-4 text-center shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            ★ DHAKA CITY CAMPAIGN COMPLETE ★
          </p>
          <p className="text-sm font-extrabold text-white mt-1">
            {language === 'en' ? storyEndingEn : storyEndingBn}
          </p>
        </div>
      )}

      {/* CENTER-SCREEN: Moral Choice Modal */}
      {activeChoicePrompt && (
        <div className="pointer-events-auto mx-auto my-auto max-w-lg w-full bg-slate-950/95 backdrop-blur-xl border-2 border-amber-400 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Crosshair className="w-4 h-4" />
            {language === 'en'
              ? 'CRITICAL STORY DECISION'
              : 'গুরুত্বপূর্ণ কাহিনী সিদ্ধান্ত'}
          </div>
          <h3 className="text-lg font-black text-white mb-4">
            {language === 'en'
              ? activeChoicePrompt.questionEn
              : activeChoicePrompt.questionBn}
          </h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => resolveMissionChoice('A')}
              className="w-full text-left p-3.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-100 text-sm font-bold transition-all"
            >
              <span className="inline-block bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded mr-2 text-xs">
                CHOICE A
              </span>
              {language === 'en'
                ? activeChoicePrompt.optionAEn
                : activeChoicePrompt.optionABn}
            </button>
            <button
              onClick={() => resolveMissionChoice('B')}
              className="w-full text-left p-3.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-100 text-sm font-bold transition-all"
            >
              <span className="inline-block bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded mr-2 text-xs">
                CHOICE B
              </span>
              {language === 'en'
                ? activeChoicePrompt.optionBEn
                : activeChoicePrompt.optionBBn}
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="flex items-end justify-between gap-3 w-full">
        {/* BOTTOM-LEFT: Interactive Radar Minimap */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <MinimapHUD />
          <div className="hidden md:flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <span>
              <strong className="text-amber-400">WASD</strong> Move/Drive
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">F/E</strong> Enter Ride/Shop
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">H</strong> Horn/Bell
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">T</strong> Talk
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">J</strong> Attack
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">M</strong> Map
            </span>
          </div>
        </div>

        {/* BOTTOM-CENTER: Contextual Interaction Button & Realistic Portrait Dialogue Box */}
        <div className="pointer-events-auto flex flex-col items-center gap-2.5 max-w-xl w-full mx-auto">
          {nearbyPrompt && (
            <button
              onClick={() => onTriggerAction('interact')}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 transition-transform active:scale-95 animate-pulse"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              {language === 'en' ? nearbyPrompt.labelEn : nearbyPrompt.labelBn}
            </button>
          )}

          {activeDialogue && (
            <div className="w-full bg-slate-950/94 backdrop-blur-lg border border-amber-500/60 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3.5">
              {/* Photorealistic Speaker Portrait Image */}
              <img
                src={getPortraitForSpeaker(activeDialogue.speakerEn)}
                alt={activeDialogue.speakerEn}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-amber-400 shrink-0 shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 truncate">
                    {language === 'en'
                      ? activeDialogue.speakerEn
                      : activeDialogue.speakerBn}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    (
                    {language === 'en'
                      ? districtInfo.nameEn
                      : districtInfo.nameBn}
                    )
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-100 mt-1 leading-relaxed font-medium">
                  “
                  {language === 'en'
                    ? activeDialogue.textEn
                    : activeDialogue.textBn}
                  ”
                </p>
              </div>
              <button
                onClick={() => setDialogue(null)}
                className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-700"
              >
                {language === 'en' ? 'OK' : 'ঠিক আছে'}
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM-RIGHT: Vehicle Speedometer / Radio / On-Screen Action Buttons */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 shrink-0">
          {inVehicleId && vehicleStats && currentVehicleType && (
            <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3.5 w-64 shadow-2xl">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                <img
                  src={DHAKA_VEHICLE_PHOTOS[currentVehicleType]}
                  alt={vehicleStats.nameEn}
                  className="w-11 h-9 rounded-lg object-cover border border-emerald-400/50 shrink-0"
                />
                <div className="truncate flex-1">
                  <p className="text-xs font-extrabold text-emerald-400 truncate">
                    {language === 'en'
                      ? vehicleStats.nameEn
                      : vehicleStats.nameBn}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {language === 'en'
                      ? '[F] Exit • [H] Horn • [Space] Drift'
                      : '[F] নামুন • [H] হর্ন • [Space] ব্রেক'}
                  </p>
                </div>
                <div className="text-right pl-2">
                  <span className="text-2xl font-black font-mono text-white leading-none">
                    {currentVehicleSpeedKmh}
                  </span>
                  <span className="block text-[9px] font-bold text-amber-400 uppercase">
                    KM/H
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
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

              {/* Nitro / Turbo Boost Bar */}
              <div className="flex items-center gap-2 mb-2">
                <Flame
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isNitroActive
                      ? 'text-cyan-400 animate-pulse'
                      : 'text-slate-400'
                  }`}
                />
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isNitroActive
                        ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                        : 'bg-cyan-600'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, stamina))}%`,
                    }}
                  />
                </div>
                <span
                  className={`text-[9px] font-mono font-bold shrink-0 ${
                    isNitroActive ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  {isNitroActive ? 'NITRO!' : '[SHIFT] NITRO'}
                </span>
              </div>

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
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] text-amber-300 font-semibold transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {language === 'en'
                    ? radioLabels[radioStation].en
                    : radioLabels[radioStation].bn}
                </span>
                <span className="text-[9px] text-slate-400 ml-1">[R]</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => onTriggerAction('interact')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-3 py-2 rounded-lg shadow transition-transform active:scale-95"
            >
              {inVehicleId
                ? language === 'en'
                  ? 'Exit [F]'
                  : 'নামুন [F]'
                : language === 'en'
                ? 'Enter / Use [F]'
                : 'উঠুন / কাজ [F]'}
            </button>

            <button
              onClick={() => onTriggerAction('horn')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-2.5 py-2 rounded-lg shadow flex items-center gap-1 transition-transform active:scale-95"
              title="Horn / Rickshaw Bell [H]"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {language === 'en' ? 'Horn [H]' : 'হর্ন [H]'}
            </button>

            {!inVehicleId && (
              <button
                onClick={() => onTriggerAction('attack')}
                className={`text-white text-xs font-black px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 border ${
                  activeWeapon.isGun
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                    : 'bg-amber-600 hover:bg-amber-500 border-amber-400'
                }`}
                title={activeWeapon.isGun ? 'Fire Weapon [J / Left-Click]' : 'Melee Strike [J / Left-Click]'}
              >
                {activeWeapon.isGun ? (
                  <>
                    <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                    {language === 'en' ? 'FIRE [J]' : 'গুলি [J]'}
                  </>
                ) : (
                  <>
                    <Swords className="w-3.5 h-3.5" />
                    {language === 'en' ? 'STRIKE [J]' : 'আঘাত [J]'}
                  </>
                )}
              </button>
            )}

            {!inVehicleId && activeWeapon.isGun && (
              <button
                onClick={() => onTriggerAction('aim')}
                className={`text-xs font-black px-2.5 py-2 rounded-lg border shadow flex items-center gap-1 transition-transform active:scale-95 ${
                  isAimingDownSights
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : 'bg-slate-800 border-slate-750 text-slate-300'
                }`}
                title="Aim Down Sights [Right-Click / Z]"
              >
                <Target className="w-3.5 h-3.5" />
                {language === 'en' ? 'AIM [Z]' : 'লক্ষ্য [Z]'}
              </button>
            )}

            {!inVehicleId && activeWeapon.isGun && (
              <button
                onClick={() => reloadActiveWeapon()}
                disabled={
                  isReloading ||
                  activeAmmo.clip >= activeWeapon.clipSize ||
                  activeAmmo.reserve <= 0
                }
                className="bg-slate-850 hover:bg-slate-750 disabled:opacity-30 text-amber-300 text-xs font-bold px-2.5 py-2 rounded-lg border border-slate-700 flex items-center gap-1"
                title="Reload [R]"
              >
                <RotateCcw
                  className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`}
                />
                {language === 'en' ? 'Reload [R]' : 'রিলোড [R]'}
              </button>
            )}

            <button
              onClick={() => onTriggerAction('camera')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-2 rounded-lg border border-slate-700"
              title="Switch Camera View [V]"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Precision ADS Holographic Sight Reticle when Aiming Down Sights */}
      {isAimingDownSights && activeWeapon.isGun && !inVehicleId && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-20">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Holographic Compass Reticle Outer Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.45)] animate-pulse" />
            <div className="absolute inset-2.5 rounded-full border border-dashed border-emerald-400/50" />
            {/* Precision Crosshair Wires */}
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent" />
            {/* Mil-dot Range Ticks */}
            <div className="absolute top-3 w-1 h-1 rounded-full bg-cyan-400/70" />
            <div className="absolute bottom-3 w-1 h-1 rounded-full bg-cyan-400/70" />
            <div className="absolute left-3 w-1 h-1 rounded-full bg-cyan-400/70" />
            <div className="absolute right-3 w-1 h-1 rounded-full bg-cyan-400/70" />
            {/* Center Red Optic Bead */}
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_12px_#f43f5e] z-10" />
            {/* Tactical Status Readout */}
            <div className="absolute -bottom-8 bg-slate-950/90 border border-cyan-400/60 px-2 py-0.5 rounded text-[8px] font-mono text-cyan-300 tracking-widest whitespace-nowrap">
              ADS TACTICAL SIGHT // 2.4X // LOCKED
            </div>
          </div>
        </div>
      )}

      {/* Hip-fire Dynamic Screen-Center Tactical Crosshair */}
      {!isAimingDownSights && activeWeapon.isGun && !inVehicleId && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-10">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Center Reticle Pip */}
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            {/* Compass Marks */}
            <div className="absolute top-0 w-0.5 h-2 bg-emerald-400/80 shadow-[0_0_4px_#34d399]" />
            <div className="absolute bottom-0 w-0.5 h-2 bg-emerald-400/80 shadow-[0_0_4px_#34d399]" />
            <div className="absolute left-0 h-0.5 w-2 bg-emerald-400/80 shadow-[0_0_4px_#34d399]" />
            <div className="absolute right-0 h-0.5 w-2 bg-emerald-400/80 shadow-[0_0_4px_#34d399]" />
          </div>
        </div>
      )}
    </div>
  );
};
