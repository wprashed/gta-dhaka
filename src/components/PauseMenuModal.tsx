import React, { useState } from 'react';
import { PauseTab, useGameStore } from '../store/useGameStore';
import {
  DHAKA_GAME_LOCATIONS,
  DISTRICTS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  STORY_MISSIONS,
  VEHICLE_STATS,
} from '../data/dhakaWorldData';
import {
  CHARACTER_PORTRAITS,
  DHAKA_DISTRICT_PHOTOS,
  DHAKA_VEHICLE_PHOTOS,
  SKETCHFAB_GTA_CATALOG,
} from '../data/sketchfabGtaCatalog';
import {
  Box,
  Briefcase,
  Car,
  CheckCircle2,
  Compass,
  Crosshair,
  ExternalLink,
  Flame,
  Gamepad2,
  Heart,
  Home,
  Map as MapIcon,
  MapPin,
  Navigation,
  Play,
  Save,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Upload,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DistrictId, VehicleType } from '../types/game';

export const PauseMenuModal: React.FC = () => {
  const {
    pauseTab,
    setPauseTab,
    setGamePhase,
    language,
    toggleLanguage,
    playerX,
    playerZ,
    taka,
    health,
    armor,
    healPlayer,
    spendTaka,
    transactions,
    activeMissionId,
    completedMissionIds,
    startMission,
    outfits,
    equippedOutfitId,
    equipOutfit,
    tools,
    equippedToolId,
    equipTool,
    customWaypoint,
    setCustomWaypoint,
    discoveredLocations,
    requestSpawnVehicle,
    requestSpawnSketchfabAsset,
    requestCustomGlbUrl,
    requestTeleport,
    graphicsQuality,
    setGraphicsQuality,
    musicVolume,
    sfxVolume,
    ambienceVolume,
    setVolumes,
    saveGameToStorage,
    showBanner,
  } = useGameStore();

  const [mapZoom, setMapZoom] = useState(1);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ahsan_manzil');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [locationMode, setLocationMode] = useState<'locations' | 'districts'>('locations');
  const [sketchfabFilter, setSketchfabFilter] = useState<
    'all' | 'building' | 'vehicle' | 'character' | 'prop'
  >('all');

  const tabs: Array<{
    id: PauseTab;
    labelEn: string;
    labelBn: string;
    icon: React.ElementType;
  }> = [
    { id: 'map', labelEn: 'Locations & Map', labelBn: 'লোকেশন ও ম্যাপ', icon: MapIcon },
    {
      id: 'missions',
      labelEn: 'Missions',
      labelBn: 'মিশনসমূহ',
      icon: Compass,
    },
    {
      id: 'sketchfab',
      labelEn: 'Sketchfab 3D Assets',
      labelBn: 'স্কেচফ্যাব থ্রিডি',
      icon: Box,
    },
    {
      id: 'inventory',
      labelEn: 'Wallet & Rides',
      labelBn: 'মানিব্যাগ ও গাড়ি',
      icon: Briefcase,
    },
    {
      id: 'character',
      labelEn: 'Character',
      labelBn: 'আরিফ ও পোশাক',
      icon: User,
    },
    {
      id: 'settings',
      labelEn: 'Settings',
      labelBn: 'সেটিংস',
      icon: Settings,
    },
    {
      id: 'controls',
      labelEn: 'Controls',
      labelBn: 'কন্ট্রোল',
      icon: Gamepad2,
    },
  ];

  const handleSaveGame = () => {
    saveGameToStorage();
    showBanner({
      titleEn: 'GAME PROGRESS SAVED LOCALLY',
      titleBn: 'গেম প্রগ্রেস সফলভাবে সেভ হয়েছে',
      subtitleEn: 'Saved to browser storage. You can resume anytime!',
      subtitleBn: 'ব্রাউজার স্টোরেজে সংরক্ষিত হয়েছে।',
      tone: 'green',
    });
  };

  const handleCustomGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    requestCustomGlbUrl(objectUrl);
  };

  const filteredSketchfab = SKETCHFAB_GTA_CATALOG.filter(
    (item) => sketchfabFilter === 'all' || item.category === sketchfabFilter
  );

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/88 backdrop-blur-xl flex flex-col p-3 sm:p-6 text-slate-100 select-none">
      {/* TOP HEADER BAR */}
      <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={CHARACTER_PORTRAITS.arif}
            alt="Arif Rahman"
            className="w-11 h-11 rounded-xl object-cover border-2 border-amber-400 shadow-lg"
          />
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              DHAKA CITY
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ঢাকা সিটি
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'en'
                ? 'Protagonist: Arif Rahman • Realistic GLTF 3D & Sketchfab GTA Asset Engine'
                : 'মূল চরিত্র: আরিফ রহমান • রিয়েলিস্টিক থ্রিডি ঢাকা অ্যাকশন গেম'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pauseTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPauseTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {language === 'en' ? t.labelEn : t.labelBn}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveGame}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {language === 'en' ? 'Save Game' : 'গেম সেভ'}
          </button>

          <button
            onClick={() => setGamePhase('playing')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            {language === 'en' ? 'Resume [ESC]' : 'খেলায় ফিরুন'}
          </button>

          <button
            onClick={() => setGamePhase('main_menu')}
            className="bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-colors"
            title="Return to Main Menu"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT BODY */}
      <div className="max-w-6xl w-full mx-auto flex-1 overflow-y-auto pt-4">
        {/* TAB 1: DHAKA GAME LOCATIONS, SKINS & FAST TRAVEL */}
        {pauseTab === 'map' && (
          <div className="flex flex-col gap-4 h-full">
            {/* Top Tactical Selector Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLocationMode('locations')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    locationMode === 'locations'
                      ? 'bg-emerald-500 text-slate-950 glow-cng'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {language === 'en' ? '16 Iconic Locations (Skins)' : '১৬টি বিশেষ স্থান ও আর্ট'}
                </button>

                <button
                  onClick={() => setLocationMode('districts')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    locationMode === 'districts'
                      ? 'bg-amber-400 text-slate-950 glow-amber'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {language === 'en' ? '10 Map Districts' : '১০টি প্রশাসনিক এলাকা'}
                </button>
              </div>

              {/* Search / Filter input */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Search location (Ahsan Manzil, Chawkbazar...)'
                        : 'লোকেশন খুঁজুন (আহসান মঞ্জিল, চকবাজার...)'
                    }
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-400"
                  />
                  {locationSearch && (
                    <button
                      onClick={() => setLocationSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {customWaypoint && (
                  <button
                    onClick={() => setCustomWaypoint(null)}
                    className="text-[11px] bg-rose-900/80 hover:bg-rose-800 text-rose-200 px-2.5 py-1.5 rounded-xl font-bold border border-rose-700 shrink-0"
                  >
                    {language === 'en' ? 'Clear Pin' : 'পিন মুছুন'}
                  </button>
                )}
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {locationMode === 'locations' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[460px]">
                {/* Left: Scrollable List of 16 Locations */}
                <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 max-h-[520px]">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800 font-mono">
                    <span>DHAKA_LOCATIONS // {DHAKA_GAME_LOCATIONS.length} IDENTIFIED</span>
                    <span className="text-emerald-400">SELECT TO INSPECT</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {DHAKA_GAME_LOCATIONS.filter((l) => {
                      if (!locationSearch) return true;
                      const q = locationSearch.toLowerCase();
                      return (
                        l.titleEn.toLowerCase().includes(q) ||
                        l.titleBn.includes(q) ||
                        l.taglineEn.toLowerCase().includes(q) ||
                        l.districtId.toLowerCase().includes(q)
                      );
                    }).map((loc) => {
                      const isSelected = selectedLocationId === loc.id;
                      const isDiscovered = discoveredLocations.includes(loc.id);
                      return (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedLocationId(loc.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-slate-800/95 border-emerald-400 glow-cng'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={loc.image}
                            alt={loc.titleEn}
                            className="w-16 h-12 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black font-display text-white truncate">
                                {language === 'en' ? loc.titleEn : loc.titleBn}
                              </p>
                              {isDiscovered ? (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                                  {language === 'en' ? 'DISCOVERED' : 'আবিষ্কৃত'}
                                </span>
                              ) : (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                                  {language === 'en' ? 'UNEXPLORED' : 'অজানা'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-amber-300 font-mono truncate">
                              {loc.coordinates} • {loc.threatLevel}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">
                              {language === 'en' ? loc.taglineEn : loc.taglineBn}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestTeleport(loc.x, loc.z);
                                setGamePhase('playing');
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[10px] font-mono font-black text-slate-950 shadow"
                              title="Instantly Travel here by CNG"
                            >
                              {language === 'en' ? 'GO' : 'যান'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomWaypoint({
                                  x: loc.x,
                                  z: loc.z,
                                  name: loc.titleEn,
                                });
                                setGamePhase('playing');
                              }}
                              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[9px] font-mono font-bold text-cyan-300 border border-slate-700"
                            >
                              GPS
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Location Dossier & Cinematic Inspection View */}
                {(() => {
                  const loc =
                    DHAKA_GAME_LOCATIONS.find((l) => l.id === selectedLocationId) ||
                    DHAKA_GAME_LOCATIONS[0];
                  return (
                    <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                      {/* Cinematic Widescreen Concept Art Preview */}
                      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950">
                        <img
                          src={loc.image}
                          alt={loc.titleEn}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

                        {/* Top Telemetry Header */}
                        <div className="absolute top-3 inset-x-4 flex items-center justify-between text-xs font-mono">
                          <span className="bg-slate-950/90 text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/40 tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            LOC://{loc.id.toUpperCase()} • {loc.coordinates}
                          </span>
                          <span className="bg-rose-500/20 text-rose-300 font-extrabold px-2.5 py-1 rounded-lg border border-rose-500/40">
                            {loc.threatLevel} (HEAT {loc.threatHeat})
                          </span>
                        </div>

                        {/* Bottom Banner Title */}
                        <div className="absolute bottom-3 inset-x-4">
                          <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight leading-none drop-shadow-xl">
                            {language === 'en' ? loc.titleEn : loc.titleBn}
                          </h2>
                          <p className="text-sm font-bold text-amber-300 mt-1 drop-shadow">
                            {language === 'en' ? loc.titleBn : loc.titleEn} • {language === 'en' ? loc.taglineEn : loc.taglineBn}
                          </p>
                        </div>
                      </div>

                      {/* Dossier Body Information */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">CATEGORY</span>
                              <span className="text-white font-bold uppercase">{loc.category}</span>
                            </div>
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">DISTRICT</span>
                              <span className="text-emerald-400 font-bold uppercase">{loc.districtId}</span>
                            </div>
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">COORDINATES</span>
                              <span className="text-cyan-300 font-bold">{loc.x}, {loc.z}</span>
                            </div>
                            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">HEAT THREAT</span>
                              <span className="text-amber-400 font-bold">LEVEL {loc.threatHeat} / 5</span>
                            </div>
                          </div>

                          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                            <p className="font-medium">
                              {language === 'en' ? loc.loreEn : loc.loreBn}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                requestTeleport(loc.x, loc.z);
                                setGamePhase('playing');
                              }}
                              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-xs sm:text-sm shadow-xl glow-cng flex items-center gap-2 transition-transform active:scale-95"
                            >
                              <Car className="w-4 h-4 text-slate-950" />
                              {language === 'en' ? 'FAST TRAVEL HERE (CNG)' : 'দ্রুত ভ্রমণ করুন (সিএনজি)'}
                            </button>

                            <button
                              onClick={() => {
                                setCustomWaypoint({
                                  x: loc.x,
                                  z: loc.z,
                                  name: loc.titleEn,
                                });
                                setGamePhase('playing');
                              }}
                              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-1.5"
                            >
                              <MapPin className="w-4 h-4" />
                              {language === 'en' ? 'SET GPS PIN' : 'জিপিএস পিন দিন'}
                            </button>
                          </div>

                          <span className="text-[11px] font-mono text-slate-400">
                            SYS://TELEPORT_READY
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-[440px]">
                <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col relative overflow-hidden min-h-[420px]">
                  <div className="flex items-center justify-between mb-2 z-10">
                    <div>
                      <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                        {language === 'en'
                          ? 'Interactive Dhaka Metropolitan GPS Map'
                          : 'ঢাকা মেট্রোপলিটন ইন্টারেক্টিভ জিপিএস ম্যাপ'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {language === 'en'
                          ? 'Click any District or Point of Interest to set a GPS route or Fast-Travel by CNG.'
                          : 'যেকোনো এলাকা বা স্থানে ক্লিক করে জিপিএস রুট সেট করুন অথবা দ্রুত ভ্রমণ করুন।'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setMapZoom((z) => Math.max(0.8, z - 0.2))}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setMapZoom((z) => Math.min(1.8, z + 0.2))}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative">
                    <svg
                      viewBox="-400 -400 800 800"
                      className="w-full h-full max-h-[480px] transition-transform duration-200"
                      style={{ transform: `scale(${mapZoom})` }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const nx =
                          ((e.clientX - rect.left) / rect.width) * 800 - 400;
                        const nz =
                          ((e.clientY - rect.top) / rect.height) * 800 - 400;
                        setCustomWaypoint({
                          x: Math.round(nx),
                          z: Math.round(nz),
                          name: 'Custom GPS Pin',
                        });
                      }}
                    >
                      {DISTRICTS.map((d) => {
                        const w = d.bounds.maxX - d.bounds.minX;
                        const h = d.bounds.maxZ - d.bounds.minZ;
                        const isSelected = selectedDistrict === d.id;
                        return (
                          <g
                            key={d.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedDistrict(d.id);
                              setCustomWaypoint({
                                x: d.center.x,
                                z: d.center.z,
                                name: d.nameEn,
                              });
                            }}
                            className="cursor-pointer group"
                          >
                            <rect
                              x={d.bounds.minX}
                              y={d.bounds.minZ}
                              width={w}
                              height={h}
                              fill={d.color}
                              fillOpacity={isSelected ? 0.32 : 0.14}
                              stroke={d.color}
                              strokeWidth={isSelected ? 4 : 1.5}
                              strokeOpacity={0.65}
                            />
                            <text
                              x={d.center.x}
                              y={d.center.z}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="16"
                              fontWeight="bold"
                              className="pointer-events-none drop-shadow"
                            >
                              {language === 'en'
                                ? d.nameEn.split(' ')[0]
                                : d.nameBn.split(' ')[0]}
                            </text>
                          </g>
                        );
                      })}

                      <rect
                        x={-390}
                        y={300}
                        width={780}
                        height={95}
                        fill="#0891b2"
                        fillOpacity={0.75}
                      />
                      <text
                        x={0}
                        y={355}
                        textAnchor="middle"
                        fill="#bae6fd"
                        fontSize="18"
                        fontWeight="bold"
                      >
                        BURIGANGA RIVER • বুড়িগঙ্গা নদী
                      </text>
                      <rect
                        x={170}
                        y={-75}
                        width={100}
                        height={145}
                        rx={14}
                        fill="#0891b2"
                        fillOpacity={0.6}
                      />
                      <rect
                        x={-260}
                        y={-35}
                        width={80}
                        height={120}
                        rx={14}
                        fill="#0891b2"
                        fillOpacity={0.6}
                      />

                      {[-170, 0, 220].map((rx) => (
                        <line
                          key={`ns_${rx}`}
                          x1={rx}
                          y1={-370}
                          x2={rx}
                          y2={295}
                          stroke="#475569"
                          strokeWidth={11}
                        />
                      ))}
                      {[-315, -175, 0, 175, 285].map((rz) => (
                        <line
                          key={`ew_${rz}`}
                          x1={-370}
                          y1={rz}
                          x2={370}
                          y2={rz}
                          stroke="#475569"
                          strokeWidth={11}
                        />
                      ))}

                      {POINTS_OF_INTEREST.map((poi) => (
                        <g
                          key={poi.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setCustomWaypoint({
                              x: poi.x,
                              z: poi.z,
                              name: poi.nameEn,
                            });
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={poi.x}
                            cy={poi.z}
                            r={9}
                            fill="#f59e0b"
                            stroke="#0f172a"
                            strokeWidth={2.5}
                          />
                        </g>
                      ))}

                      {customWaypoint && (
                        <g>
                          <line
                            x1={playerX}
                            y1={playerZ}
                            x2={customWaypoint.x}
                            y2={customWaypoint.z}
                            stroke="#ec4899"
                            strokeWidth={4}
                            strokeDasharray="10 6"
                          />
                          <circle
                            cx={customWaypoint.x}
                            cy={customWaypoint.z}
                            r={12}
                            fill="#ec4899"
                            stroke="#ffffff"
                            strokeWidth={3}
                          />
                        </g>
                      )}

                      {/* 16 Authentic Dhaka Landmark Diamonds on Tactical World Map */}
                      {DHAKA_GAME_LOCATIONS.map((loc) => {
                        const isDisc = discoveredLocations.includes(loc.id);
                        return (
                          <g
                            key={`svg_loc_${loc.id}`}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedLocationId(loc.id);
                              setLocationMode('locations');
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <polygon
                              points={`${loc.x},${loc.z - 11} ${loc.x + 11},${loc.z} ${loc.x},${loc.z + 11} ${loc.x - 11},${loc.z}`}
                              fill={isDisc ? '#f59e0b' : '#334155'}
                              stroke={isDisc ? '#fef08a' : '#1e293b'}
                              strokeWidth={2.5}
                            />
                            <text
                              x={loc.x}
                              y={loc.z + 20}
                              textAnchor="middle"
                              fill={isDisc ? '#fef08a' : '#94a3b8'}
                              fontSize={10}
                              fontFamily="monospace"
                              fontWeight="bold"
                              className="select-none pointer-events-none drop-shadow"
                            >
                              {language === 'en' ? loc.titleEn.split(' ')[0] : loc.titleBn.split(' ')[0]}
                            </text>
                          </g>
                        );
                      })}

                      <g transform={`translate(${playerX}, ${playerZ})`}>
                        <circle
                          cx={0}
                          cy={0}
                          r={13}
                          fill="#00ff66"
                          stroke="#0b0e13"
                          strokeWidth={3.5}
                        />
                        <circle cx={0} cy={0} r={5} fill="#ffffff" />
                      </g>
                    </svg>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    {language === 'en'
                      ? '10 Dhaka Districts & Fast Travel'
                      : 'ঢাকার ১০টি এলাকা ও দ্রুত ভ্রমণ'}
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                    {DISTRICTS.map((d) => (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedDistrict === d.id
                            ? 'bg-slate-800 border-amber-400'
                            : 'bg-slate-950/75 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <img
                            src={DHAKA_DISTRICT_PHOTOS[d.id]}
                            alt={d.nameEn}
                            className="w-16 h-12 rounded-lg object-cover border border-amber-400/40 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-white truncate">
                              {language === 'en' ? d.nameEn : d.nameBn}
                            </p>
                            <p className="text-[10px] text-amber-400 font-semibold truncate">
                              {d.coordinates} • {language === 'en' ? d.vibeEn : d.vibeBn}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setCustomWaypoint({
                                  x: d.center.x,
                                  z: d.center.z,
                                  name: d.nameEn,
                                });
                                setGamePhase('playing');
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 border border-slate-700"
                            >
                              GPS Pin
                            </button>
                            <button
                              onClick={() => {
                                requestTeleport(d.center.x, d.center.z);
                                setGamePhase('playing');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-extrabold text-white shadow"
                            >
                              {language === 'en' ? 'Go Now' : 'যান'}
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                          {language === 'en' ? d.descriptionEn : d.descriptionBn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MISSIONS */}
        {pauseTab === 'missions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-base font-black text-amber-400 uppercase tracking-wide">
                  {language === 'en'
                    ? 'Main Story Campaign — 5 Chapters'
                    : 'মূল কাহিনী — ৫টি অধ্যায়'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'Follow Arif Rahman’s investigation across Dhaka’s criminal underworld.'
                    : 'ভাই রফিকের সন্ধানে ঢাকার আন্ডারওয়ার্ল্ডে আরিফ রহমানের অভিযান।'}
                </p>
              </div>

              <div className="space-y-3">
                {STORY_MISSIONS.map((m) => {
                  const isDone = completedMissionIds.includes(m.id);
                  const isActive = activeMissionId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-amber-950/30 border-amber-400'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                          {language === 'en'
                            ? m.chapterTitleEn
                            : m.chapterTitleBn}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-emerald-400">
                          Reward: ৳ {m.rewardTaka.toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        {language === 'en' ? m.titleEn : m.titleBn}
                        {isDone && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {language === 'en' ? m.descriptionEn : m.descriptionBn}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Contact:{' '}
                          <strong className="text-slate-200">
                            {language === 'en' ? m.giverNameEn : m.giverNameBn}
                          </strong>
                        </span>
                        <button
                          onClick={() => startMission(m.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                            isActive
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isActive
                            ? language === 'en'
                              ? 'Restart / Active'
                              : 'চলমান মিশন'
                            : isDone
                            ? language === 'en'
                              ? 'Replay Chapter'
                              : 'আবার খেলুন'
                            : language === 'en'
                            ? 'Start Chapter'
                            : 'মিশন শুরু করুন'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-base font-black text-emerald-400 uppercase tracking-wide">
                  {language === 'en'
                    ? 'Dhaka Side Activities & Hustles'
                    : 'সাইড মিশন ও বাড়তি আয়ের কাজ'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'Earn extra Taka (৳) through CNG passenger fares, Fuchka deliveries, and Hatirjheel night races!'
                    : 'সিএনজি ভাড়া, ফুচকা ডেলিভারি এবং হাতিরঝিল নাইট রেস খেলে বাড়তি টাকা (৳) আয় করুন!'}
                </p>
              </div>

              <div className="space-y-3">
                {SIDE_MISSIONS.map((m) => {
                  const isActive = activeMissionId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border ${
                        isActive
                          ? 'bg-emerald-950/30 border-emerald-400'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {language === 'en'
                            ? m.chapterTitleEn
                            : m.chapterTitleBn}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-amber-400">
                          + ৳ {m.rewardTaka.toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white">
                        {language === 'en' ? m.titleEn : m.titleBn}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        {language === 'en' ? m.descriptionEn : m.descriptionBn}
                      </p>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => startMission(m.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                        >
                          {language === 'en' ? 'Launch Activity' : 'শুরু করুন'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SKETCHFAB GTA 3D ASSET CATALOG & CUSTOM .GLB IMPORTER */}
        {pauseTab === 'sketchfab' && (
          <div className="space-y-4">
            {/* Header & Custom .GLB File Uploader */}
            <div className="bg-slate-900/95 border border-amber-400/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  {language === 'en'
                    ? 'Sketchfab GTA Top-Liked 3D Models & Live Spawner'
                    : 'স্কেচফ্যাব জিটিএ থ্রিডি মডেল ও লাইভ স্পনার'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {language === 'en'
                    ? 'Synced from sketchfab.com/search?q=tag:gta&sort_by=-likeCount. Spawn any asset directly in front of Arif or import your own downloaded .GLB model!'
                    : 'যেকোনো থ্রিডি অ্যাসেট আরিফের সামনে স্থাপন করুন অথবা আপনার ডাউনলোড করা .GLB ফাইল আপলোড করুন!'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all">
                  <Upload className="w-4 h-4" />
                  {language === 'en'
                    ? 'Import Custom .GLB / .GLTF'
                    : 'কাস্টম .GLB আপলোড করুন'}
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleCustomGlbUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2">
              {(
                [
                  ['all', 'All Top GTA Models'],
                  ['building', 'Buildings & Shops'],
                  ['vehicle', 'Vehicles (Hilux)'],
                  ['character', '3D Characters'],
                  ['prop', 'Props, Cash & Billboards'],
                ] as const
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  onClick={() => setSketchfabFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sketchfabFilter === cat
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Grid of Sketchfab GTA Models */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {filteredSketchfab.map((item) => (
                <div
                  key={item.uid}
                  className="bg-slate-900/95 border border-slate-800 hover:border-amber-400/60 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl transition-all group"
                >
                  <div>
                    <div className="relative h-40 w-full bg-slate-950 overflow-hidden">
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30">
                        {item.category}
                      </span>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-950/90 text-rose-200 text-[10px] font-bold flex items-center gap-1 border border-rose-500/40">
                        <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                        {item.likeCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3.5">
                      <h4 className="text-sm font-black text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        By <strong className="text-slate-200">{item.author}</strong> •{' '}
                        {(item.faceCount / 1000).toFixed(1)}k faces
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 flex items-center gap-2">
                    <button
                      onClick={() =>
                        requestSpawnSketchfabAsset({
                          spawnType: item.spawnType,
                          thumbnail: item.thumbnail,
                          name: item.name,
                        })
                      }
                      className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2 px-3 rounded-xl shadow transition-transform active:scale-95"
                    >
                      {language === 'en'
                        ? item.spawnActionLabelEn
                        : item.spawnActionLabelBn}
                    </button>
                    <a
                      href={item.viewerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      title="Open on Sketchfab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: INVENTORY, GARAGE SPAWNER & TAKA WALLET */}
        {pauseTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {language === 'en'
                    ? 'Dholaikhal Garage — Vehicle Delivery'
                    : 'ধোলাইখাল গ্যারেজ — তাৎক্ষণিক গাড়ি ডেলিভারি'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'Spawn any authentic Bangladeshi vehicle directly next to Arif.'
                    : 'আরিফের পাশে যেকোনো বাংলাদেশি যানবাহন তাৎক্ষণিকভাবে আনুন।'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(VEHICLE_STATS) as VehicleType[]).map((vType) => {
                  const st = VEHICLE_STATS[vType];
                  return (
                    <div
                      key={vType}
                      className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 flex flex-col justify-between gap-2 overflow-hidden"
                    >
                      <div className="relative h-24 rounded-lg overflow-hidden border border-slate-800">
                        <img
                          src={DHAKA_VEHICLE_PHOTOS[vType]}
                          alt={st.nameEn}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1.5 right-1.5 bg-slate-950/90 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/40">
                          {st.maxSpeed * 2} km/h
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-white">
                          {language === 'en' ? st.nameEn : st.nameBn}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>Speed: {st.maxSpeed * 2} km/h</span>
                          <span>•</span>
                          <span>HP: {st.maxHealth}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          requestSpawnVehicle(vType);
                          setGamePhase('playing');
                        }}
                        className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors"
                      >
                        {language === 'en'
                          ? 'Deliver Vehicle Next to Me'
                          : 'আমার পাশে গাড়ি আনুন'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">
                    {language === 'en'
                      ? 'Arif Rahman — Taka Wallet'
                      : 'আরিফ রহমানের বর্তমান ব্যালেন্স'}
                  </p>
                  <p className="text-2xl font-black font-mono text-emerald-400">
                    ৳ {taka.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (
                      spendTaka(
                        150,
                        'Field Medkit & Body Armor Pack',
                        'জরুরি হেলথ ও বডি আর্মার প্যাক'
                      )
                    ) {
                      healPlayer(100, 100);
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  {language === 'en'
                    ? 'Full Heal & Armor (৳150)'
                    : 'ফুল হেলথ ও আর্মার (৳১৫০)'}
                </button>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-300 mb-2 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  {language === 'en'
                    ? 'Dhaka Underworld Armory & Local Arms (দেশি অস্ত্রাগার)'
                    : 'আন্ডারওয়ার্ল্ড অস্ত্রাগার ও দেশি অস্ত্র'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => equipTool(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        equippedToolId === t.id
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{t.icon}</span>
                          <div>
                            <p className="text-xs font-black text-amber-300">
                              {language === 'en' ? t.nameEn : t.nameBn}
                            </p>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                              {t.isGun
                                ? t.category === 'shotgun'
                                  ? 'Sawed-Off Shotgun'
                                  : t.category === 'rifle'
                                  ? 'Military Rifle'
                                  : 'Local Firearm'
                                : 'Street Melee'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {t.unlocked
                            ? equippedToolId === t.id
                              ? 'EQUIPPED ✓'
                              : 'EQUIP'
                            : `৳${t.price}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                        {language === 'en' ? t.loreEn : t.loreBn}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-slate-300 border-t border-slate-850 pt-1">
                        <span>DMG: <strong className="text-white">{t.damage}</strong></span>
                        <span>RNG: <strong className="text-white">{t.range}m</strong></span>
                        {t.isGun && (
                          <span>CLIP: <strong className="text-emerald-400">{t.clipSize}</strong></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-xs font-extrabold uppercase text-slate-300 mb-2">
                  {language === 'en'
                    ? 'Recent Taka (৳) Transactions'
                    : 'সাম্প্রতিক লেনদেনের বিবরণী'}
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800/80"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">
                          {language === 'en' ? tx.titleEn : tx.titleBn}
                        </p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {tx.timestamp}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          tx.type === 'earn'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'earn' ? '+' : '-'} ৳
                        {tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CHARACTER & BANGLADESHI OUTFITS */}
        {pauseTab === 'character' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <img
                  src={CHARACTER_PORTRAITS.arif}
                  alt="Arif Rahman"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl"
                />
                <div>
                  <h3 className="text-lg font-black text-white">
                    Arif Rahman (আরিফ রহমান)
                  </h3>
                  <p className="text-xs text-amber-400 font-semibold">
                    Age: 27 • Home Neighborhood: Farmgate, Dhaka
                  </p>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">
                    Rigged 3D Skeletal GLTF Character Model Active
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                {language === 'en'
                  ? 'Raised in a middle-class family in Dhaka, Arif returned home after an unexpected crisis involving his brother Rafiq. Navigating between Old Dhaka’s riverfront syndicates and Motijheel’s corporate towers, your choices shape his reputation.'
                  : 'ঢাকার এক মধ্যবিত্ত পরিবারে বেড়ে ওঠা আরিফ ভাই রফিকের আকস্মিক সংকটের খবর পেয়ে শহরে ফিরে এসেছে। পুরান ঢাকার ঘাট থেকে মতিঝিলের কর্পোরেট টাওয়ার পর্যন্ত আপনার প্রতিটি সিদ্ধান্ত তার ভবিষ্যৎ নির্ধারণ করবে।'}
              </p>

              {/* Key Story Contacts Gallery */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  {
                    name: 'Nadia Hasan',
                    role: 'Journalist',
                    img: CHARACTER_PORTRAITS.nadia,
                  },
                  {
                    name: 'Uncle Kamal',
                    role: 'Farmgate Mentor',
                    img: CHARACTER_PORTRAITS.kamal,
                  },
                  {
                    name: 'Chairman Sikder',
                    role: 'Syndicate Boss',
                    img: CHARACTER_PORTRAITS.sikder,
                  },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2"
                  >
                    <img
                      src={c.img}
                      alt={c.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-white truncate">
                        {c.name}
                      </p>
                      <p className="text-[9px] text-amber-400 truncate">
                        {c.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {language === 'en'
                  ? 'Banani & BangaBazar Wardrobe'
                  : 'বনানী ও বঙ্গবাজার পোশাক সংগ্রহ'}
              </h3>
              <div className="space-y-2.5">
                {outfits.map((o) => {
                  const isEq = equippedOutfitId === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        isEq
                          ? 'bg-emerald-950/30 border-emerald-400'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-7 h-7 rounded-lg border border-white/30 shrink-0"
                          style={{ backgroundColor: o.shirtColor }}
                        />
                        <div>
                          <p className="text-xs font-extrabold text-white">
                            {language === 'en' ? o.nameEn : o.nameBn}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {o.unlocked ? 'Owned' : `Price: ৳ ${o.price}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => equipOutfit(o.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                          isEq
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        {isEq
                          ? language === 'en'
                            ? 'Wearing ✓'
                            : 'পরিহিত ✓'
                          : o.unlocked
                          ? language === 'en'
                            ? 'Wear'
                            : 'পরুন'
                          : `Buy ৳${o.price}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {pauseTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
            <h3 className="text-base font-black text-amber-400 uppercase">
              {language === 'en'
                ? 'Audio, Performance & Language Settings'
                : 'অডিও, গ্রাফিক্স এবং ভাষা সেটিংস'}
            </h3>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-sm font-bold text-white">
                  {language === 'en'
                    ? 'UI & Subtitle Language (Localization)'
                    : 'গেমের ভাষা (বাংলা / English)'}
                </p>
                <p className="text-xs text-slate-400">
                  Switch between English and Bangla (বাংলা) interface &
                  dialogues.
                </p>
              </div>
              <button
                onClick={toggleLanguage}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                {language === 'en' ? 'Switch to বাংলা' : 'Switch to English'}
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-sm font-bold text-white">
                  {language === 'en'
                    ? '3D Graphics Performance Mode'
                    : 'গ্রাফিক্স পারফরম্যান্স মোড'}
                </p>
                <p className="text-xs text-slate-400">
                  Dynamically toggles 2x Retina PixelRatio, PCF Soft Shadows &
                  620m Draw Distance.
                </p>
              </div>
              <div className="flex gap-2">
                {(['high', 'low'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setGraphicsQuality(q)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                      graphicsQuality === q
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Bangla Radio & Background Music</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVolume}
                  onChange={(e) =>
                    setVolumes(
                      parseFloat(e.target.value),
                      sfxVolume,
                      ambienceVolume
                    )
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Vehicle Engines, Rickshaw Bells & Horns (SFX)</span>
                  <span>{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sfxVolume}
                  onChange={(e) =>
                    setVolumes(
                      musicVolume,
                      parseFloat(e.target.value),
                      ambienceVolume
                    )
                  }
                  className="w-full accent-emerald-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Dhaka Street & Monsoon Rain Ambience</span>
                  <span>{Math.round(ambienceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={ambienceVolume}
                  onChange={(e) =>
                    setVolumes(
                      musicVolume,
                      sfxVolume,
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CONTROLS REFERENCE */}
        {pauseTab === 'controls' && (
          <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-base font-black text-amber-400 uppercase mb-4">
              {language === 'en'
                ? 'Keyboard & Mouse Controls'
                : 'কীবোর্ড ও মাউস কন্ট্রোল গাইড'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['W, A, S, D / Arrow Keys', 'Walk, Run, Steer & Drive Vehicle'],
                ['Left Shift (Hold)', 'Sprint on Foot / Nitro Boost (In Vehicle)'],
                ['Right Click / Z', 'Aim Down Sights (ADS Precision Mode)'],
                ['Spacebar', 'Jump / Evade Roll (in ADS) / Drift (In Vehicle)'],
                ['1 – 0', 'Quick-Select Weapon (AK, Katta, TT, Ramda)'],
                ['Left Click / J / K', 'Fire Gun / Melee Strike (Ramda, Bat)'],
                ['Q / X / Mouse Wheel', 'Cycle Equipped Weapons'],
                ['R', 'Reload Firearm (On Foot) / Radio Station (In Vehicle)'],
                ['F or E', 'Enter / Exit Vehicle, Buy Street Food, Use Shop'],
                ['H', 'Honk CNG/Bus Horn or Ring Cycle Rickshaw Bell'],
                ['C', 'Toggle Crouch / Stealth (On Foot)'],
                ['T', 'Talk to Nearby Dhaka Citizens & Contacts'],
                ['Mouse Drag', 'Orbit 360° Third-Person Camera'],
                ['V', 'Cycle Camera Mode (Third, Far Chase, Hood / Cockpit)'],
                ['M or ESC', 'Open Interactive Dhaka GPS Map & Pause Menu'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                >
                  <span className="font-mono font-extrabold text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                    {key}
                  </span>
                  <span className="text-slate-200 text-right font-medium">
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
