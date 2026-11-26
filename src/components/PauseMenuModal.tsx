import React, { useState } from 'react';
import { PauseTab, useGameStore } from '../store/useGameStore';
import {
  CNG_STATIONS,
  DISTRICTS,
  MARINE_DOCKS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  SPEED_CAMERAS,
  STORY_MISSIONS,
  STREET_ATMS,
  VEHICLE_STATS,
  PLAYABLE_CHARACTERS,
} from '../data/dhakaWorldData';
import {
  CHARACTER_PORTRAITS,
  DHAKA_DISTRICT_PHOTOS,
  DHAKA_VEHICLE_PHOTOS,
  SKETCHFAB_GTA_CATALOG,
} from '../data/sketchfabGtaCatalog';
import {
  Award,
  Box,
  Briefcase,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  ExternalLink,
  Flag,
  Gamepad2,
  Heart,
  Home,
  Map as MapIcon,
  Navigation,
  Play,
  Save,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  Upload,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DistrictId, VehicleType } from '../types/game';
import { resolveAssetUrl } from '../utils/assets';

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
    addAmmo,
    transactions,
    activeMissionId,
    activeMissionStepIndex,
    completedMissionIds,
    startMission,
    outfits,
    equippedOutfitId,
    equipOutfit,
    selectedCharacterId,
    selectCharacter,
    tools,
    equippedToolId,
    equipTool,
    customWaypoint,
    setCustomWaypoint,
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
  const [sketchfabFilter, setSketchfabFilter] = useState<
    'all' | 'building' | 'vehicle' | 'character' | 'prop'
  >('all');
  const [missionFilter, setMissionFilter] = useState<
    'all' | 'story' | 'side' | 'completed'
  >('all');
  const [missionDistrictFilter, setMissionDistrictFilter] =
    useState<string>('all');
  const [missionSearch, setMissionSearch] = useState<string>('');

  const tabs: Array<{
    id: PauseTab;
    labelEn: string;
    labelBn: string;
    icon: React.ElementType;
  }> = [
    { id: 'map', labelEn: 'Dhaka Map', labelBn: 'ঢাকার ম্যাপ', icon: MapIcon },
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
            className="w-11 h-11 rounded-xl object-cover object-top border-2 border-amber-400 shadow-lg"
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
        {/* TAB 1: INTERACTIVE DHAKA GPS CITY MAP */}
        {pauseTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
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
                  {customWaypoint && (
                    <button
                      onClick={() => setCustomWaypoint(null)}
                      className="text-[11px] bg-rose-900/80 text-rose-200 px-2.5 py-1 rounded-lg font-bold"
                    >
                      Clear Pin
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative">
                <svg
                  viewBox="-980 -950 1960 1600"
                  className="w-full h-full max-h-[480px] transition-transform duration-200"
                  style={{ transform: `scale(${mapZoom})` }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const nx =
                      ((e.clientX - rect.left) / rect.width) * 1960 - 980;
                    const nz =
                      ((e.clientY - rect.top) / rect.height) * 1600 - 950;
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
                          fillOpacity={isSelected ? 0.34 : 0.16}
                          stroke={d.color}
                          strokeWidth={isSelected ? 7 : 2.5}
                          strokeOpacity={0.7}
                        />
                        <text
                          x={d.center.x}
                          y={d.center.z}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="30"
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

                  {/* Water Bodies (1:1 match to DhakaCityEngine.isPositionInWater) */}
                  <rect x={-950} y={303.5} width={1900} height={143.5} fill="#0891b2" fillOpacity={0.78} />
                  <text x={0} y={388} textAnchor="middle" fill="#bae6fd" fontSize="34" fontWeight="bold">
                    BURIGANGA RIVER • বুড়িগঙ্গা নদী
                  </text>
                  <rect x={165} y={-80} width={110} height={150} rx={18} fill="#0891b2" fillOpacity={0.68} />
                  <rect x={-265} y={-35} width={82} height={120} rx={16} fill="#0891b2" fillOpacity={0.68} />
                  <rect x={280} y={-290} width={100} height={160} rx={16} fill="#0891b2" fillOpacity={0.68} />
                  <rect x={-220} y={-600} width={80} height={120} rx={16} fill="#0891b2" fillOpacity={0.68} />

                  {/* Jamuna Future Park Complex */}
                  <rect x={464} y={-421} width={112} height={72} rx={8} fill="#7e22ce" fillOpacity={0.85} stroke="#fbbf24" strokeWidth={4} />
                  <text x={520} y={-432} textAnchor="middle" fill="#fde68a" fontSize="24" fontWeight="bold">
                    🏬 Jamuna Future Park
                  </text>

                  {[-950, -780, -580, -480, -380, -170, 0, 220, 440, 640, 840, 950].map((rx) => (
                    <line
                      key={`ns_${rx}`}
                      x1={rx}
                      y1={-940}
                      x2={rx}
                      y2={640}
                      stroke="#475569"
                      strokeWidth={16}
                    />
                  ))}
                  {[-850, -620, -460, -315, -175, 0, 175, 240, 285, 460].map((rz) => (
                    <line
                      key={`ew_${rz}`}
                      x1={-950}
                      y1={rz}
                      x2={950}
                      y2={rz}
                      stroke="#475569"
                      strokeWidth={16}
                    />
                  ))}

                  {/* DHAKA MASS RAPID TRANSIT (MRT) SYSTEM OVERLAY */}
                  <line x1={-12.2} y1={-900} x2={-12.2} y2={450} stroke="#10b981" strokeWidth={8} strokeDasharray="16 8" />
                  <line x1={-480} y1={-175} x2={640} y2={-175} stroke="#f43f5e" strokeWidth={8} strokeDasharray="16 8" />

                  {[
                    { name: 'Uttara North', bn: 'উত্তরা উত্তর', z: -530 },
                    { name: 'Mirpur-10', bn: 'মিরপুর-১০', z: -175 },
                    { name: 'Farmgate', bn: 'ফার্মগেট', z: -15 },
                    { name: 'Shahbagh', bn: 'শাহবাগ', z: 160 },
                    { name: 'Motijheel', bn: 'মতিঝিল', z: 270 },
                  ].map((st) => (
                    <g key={`l6_${st.name}`}>
                      <circle cx={-12.2} cy={st.z} r={12} fill="#10b981" stroke="#ffffff" strokeWidth={3} />
                      <text x={-32} y={st.z + 8} textAnchor="end" fill="#6ee7b7" fontSize="22" fontWeight="bold">
                        {language === 'en' ? st.name : st.bn}
                      </text>
                    </g>
                  ))}

                  {[
                    { name: 'Gulshan-2 / Jamuna Link', bn: 'গুলশান-২', x: 430 },
                  ].map((st) => (
                    <g key={`l5_${st.name}`}>
                      <circle cx={st.x} cy={-175} r={12} fill="#f43f5e" stroke="#ffffff" strokeWidth={3} />
                      <text x={st.x} y={-202} textAnchor="middle" fill="#fda4af" fontSize="22" fontWeight="bold">
                        {language === 'en' ? st.name : st.bn}
                      </text>
                    </g>
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
                        r={16}
                        fill="#f59e0b"
                        stroke="#0f172a"
                        strokeWidth={4}
                      />
                    </g>
                  ))}

                  {/* CNG Stations, Marine Fuel Docks, ATMs & Speed Cameras */}
                  {CNG_STATIONS.map((cs, idx) => (
                    <rect
                      key={`cng_${idx}`}
                      x={cs.x - 11}
                      y={cs.z - 11}
                      width={22}
                      height={22}
                      rx={4}
                      fill="#16a34a"
                      stroke="#ffffff"
                      strokeWidth={3}
                      className="cursor-pointer"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setCustomWaypoint({ x: cs.x, z: cs.z, name: cs.nameEn });
                      }}
                    />
                  ))}
                  {MARINE_DOCKS.map((md, idx) => (
                    <rect
                      key={`marine_${idx}`}
                      x={md.x - 11}
                      y={md.z - 11}
                      width={22}
                      height={22}
                      rx={4}
                      fill="#0284c7"
                      stroke="#ffffff"
                      strokeWidth={3}
                      className="cursor-pointer"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setCustomWaypoint({ x: md.x, z: md.z, name: md.nameEn });
                      }}
                    />
                  ))}
                  {STREET_ATMS.map((atm, idx) => (
                    <circle
                      key={`atm_${idx}`}
                      cx={atm.x}
                      cy={atm.z}
                      r={11}
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth={3}
                      className="cursor-pointer"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setCustomWaypoint({ x: atm.x, z: atm.z, name: atm.nameEn });
                      }}
                    />
                  ))}
                  {SPEED_CAMERAS.map((cam, idx) => (
                    <circle
                      key={`cam_${idx}`}
                      cx={cam.x}
                      cy={cam.z}
                      r={9}
                      fill="#ef4444"
                      stroke="#fef08a"
                      strokeWidth={2.5}
                    />
                  ))}

                  {customWaypoint && (
                    <g>
                      <line
                        x1={playerX}
                        y1={playerZ}
                        x2={customWaypoint.x}
                        y2={customWaypoint.z}
                        stroke="#ec4899"
                        strokeWidth={7}
                        strokeDasharray="18 10"
                      />
                      <circle
                        cx={customWaypoint.x}
                        cy={customWaypoint.z}
                        r={22}
                        fill="#ec4899"
                        stroke="#ffffff"
                        strokeWidth={5}
                      />
                    </g>
                  )}

                  <g transform={`translate(${playerX}, ${playerZ})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={24}
                      fill="#22d3ee"
                      stroke="#083344"
                      strokeWidth={6}
                    />
                    <circle cx={0} cy={0} r={9} fill="#ffffff" />
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
                          {language === 'en' ? d.vibeEn : d.vibeBn}
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
                          onClick={() =>
                            requestTeleport(d.center.x, d.center.z)
                          }
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

        {/* TAB 2: MISSIONS (18 TOTAL: 10 STORY CHAPTERS + 8 SIDE ACTIVITIES) */}
        {pauseTab === 'missions' && (() => {
          const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
          const activeMission = allMissions.find((m) => m.id === activeMissionId);
          const activeStep = activeMission ? activeMission.steps[activeMissionStepIndex] : null;

          const filteredMissions = allMissions.filter((m) => {
            const isDone = completedMissionIds.includes(m.id);
            const isStory = 'chapter' in m;

            if (missionFilter === 'story' && !isStory) return false;
            if (missionFilter === 'side' && isStory) return false;
            if (missionFilter === 'completed' && !isDone) return false;

            if (missionDistrictFilter !== 'all' && m.district !== missionDistrictFilter) {
              return false;
            }

            if (missionSearch.trim()) {
              const query = missionSearch.toLowerCase();
              const matchEn = m.titleEn.toLowerCase().includes(query) || m.descriptionEn.toLowerCase().includes(query) || m.giverNameEn.toLowerCase().includes(query);
              const matchBn = m.titleBn.toLowerCase().includes(query) || m.descriptionBn.toLowerCase().includes(query) || m.giverNameBn.toLowerCase().includes(query);
              if (!matchEn && !matchBn) return false;
            }

            return true;
          });

          return (
            <div className="flex flex-col gap-5">
              {/* Active Mission Spotlight Card */}
              {activeMission && (
                <div className="bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-emerald-950/50 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-mono">
                        {language === 'en' ? 'ACTIVE MISSION / চলমান মিশন' : 'চলমান মিশন'}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-slate-800 text-amber-300 px-2 py-0.5 rounded">
                        {language === 'en' ? activeMission.chapterTitleEn : activeMission.chapterTitleBn}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                      {language === 'en' ? activeMission.titleEn : activeMission.titleBn}
                      <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                        ৳ {activeMission.rewardTaka.toLocaleString()}
                      </span>
                    </h3>
                    {activeStep && (
                      <p className="text-xs sm:text-sm text-slate-200 mt-1.5 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong className="text-amber-300 font-mono">
                            Step {activeMissionStepIndex + 1}/{activeMission.steps.length}:
                          </strong>{' '}
                          {language === 'en' ? activeStep.instructionEn : activeStep.instructionBn}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setGamePhase('playing')}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{language === 'en' ? 'Resume Playing' : 'খেলায় ফিরুন'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filters & Navigation Strip */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'all', en: `All Missions (${allMissions.length})`, bn: `সকল মিশন (${allMissions.length})` },
                    { id: 'story', en: `Story Campaign (${STORY_MISSIONS.length})`, bn: `মূল কাহিনী (${STORY_MISSIONS.length})` },
                    { id: 'side', en: `Side Activities (${SIDE_MISSIONS.length})`, bn: `সাইড কাজ (${SIDE_MISSIONS.length})` },
                    { id: 'completed', en: `Completed (${completedMissionIds.length})`, bn: `সম্পন্ন (${completedMissionIds.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setMissionFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        missionFilter === tab.id
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {language === 'en' ? tab.en : tab.bn}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={language === 'en' ? 'Search missions...' : 'মিশন খুঁজুন...'}
                      value={missionSearch}
                      onChange={(e) => setMissionSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <select
                    value={missionDistrictFilter}
                    onChange={(e) => setMissionDistrictFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">{language === 'en' ? 'All Districts' : 'সকল এলাকা'}</option>
                    <option value="farmgate">Farmgate</option>
                    <option value="dhanmondi">Dhanmondi</option>
                    <option value="gulshan">Gulshan</option>
                    <option value="mirpur">Mirpur</option>
                    <option value="uttara">Uttara</option>
                    <option value="old_dhaka">Old Dhaka</option>
                    <option value="purbachal">Purbachal 300ft</option>
                    <option value="bashundhara">Bashundhara</option>
                    <option value="keraniganj">Keraniganj</option>
                  </select>
                </div>
              </div>

              {/* Mission Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMissions.map((m) => {
                  const isDone = completedMissionIds.includes(m.id);
                  const isActive = activeMissionId === m.id;
                  const isStory = 'chapter' in m;

                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isActive
                          ? 'bg-amber-950/30 border-amber-400 shadow-xl shadow-amber-950/20 ring-1 ring-amber-400'
                          : isDone
                          ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                                isStory
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {language === 'en' ? m.chapterTitleEn : m.chapterTitleBn}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              📍 {m.district.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-black text-emerald-400">
                            ৳ {m.rewardTaka.toLocaleString()}
                          </span>
                        </div>

                        <h4 className="text-base font-black text-white flex items-center gap-2">
                          {language === 'en' ? m.titleEn : m.titleBn}
                          {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </h4>

                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {language === 'en' ? m.descriptionEn : m.descriptionBn}
                        </p>

                        {/* Objectives Step Checklist Preview */}
                        <div className="mt-3 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                            {language === 'en' ? 'Mission Objectives:' : 'মিশনের ধাপসমূহ:'}
                          </p>
                          {m.steps.map((st, idx) => {
                            const isStepPassed = isActive && idx < activeMissionStepIndex;
                            const isCurrent = isActive && idx === activeMissionStepIndex;
                            return (
                              <div key={st.id} className="flex items-start gap-1.5 text-[11px]">
                                <span className="font-mono text-[10px] shrink-0 mt-0.5">
                                  {isStepPassed ? (
                                    <span className="text-emerald-400">✓</span>
                                  ) : isCurrent ? (
                                    <span className="text-amber-400 animate-pulse">▶</span>
                                  ) : (
                                    <span className="text-slate-600">{idx + 1}.</span>
                                  )}
                                </span>
                                <span
                                  className={`${
                                    isStepPassed
                                      ? 'text-slate-400 line-through'
                                      : isCurrent
                                      ? 'text-amber-300 font-bold'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {language === 'en' ? st.instructionEn : st.instructionBn}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400 truncate">
                          {language === 'en' ? 'Client: ' : 'যোগাযোগ: '}
                          <strong className="text-slate-200">
                            {language === 'en' ? m.giverNameEn : m.giverNameBn}
                          </strong>
                        </span>

                        <button
                          onClick={() => {
                            startMission(m.id);
                            setGamePhase('playing');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95 flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300'
                              : isDone
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {isActive
                              ? language === 'en'
                                ? 'Track / Resume'
                                : 'চালিয়ে যান'
                              : isDone
                              ? language === 'en'
                                ? 'Replay Mission'
                                : 'আবার খেলুন'
                              : language === 'en'
                              ? 'Start Mission'
                              : 'মিশন শুরু করুন'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                <div className="flex flex-col sm:flex-row gap-2">
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
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    {language === 'en'
                      ? 'Full Heal (৳150)'
                      : 'ফুল হেলথ (৳১৫০)'}
                  </button>

                  <button
                    onClick={() => {
                      if (
                        spendTaka(
                          250,
                          'Dholaikhal Heavy Ammo Supply Crate',
                          'ধোলাইখাল গোলাবারুদের বাক্স'
                        )
                      ) {
                        addAmmo('deshi_pipegun', 50);
                        addAmmo('pistol_9mm', 120);
                        addAmmo('bd08_rifle', 300);
                        addAmmo('police_shotgun', 60);
                        addAmmo('smg_uzi', 280);
                        showBanner({
                          titleEn: 'AMMO CRATE PURCHASED!',
                          titleBn: 'গোলাবারুদের বক্স ক্রয় সম্পন্ন!',
                          subtitleEn: 'All firearm reserves restocked to maximum capacity.',
                          subtitleBn: 'সকল অস্ত্রের গুলি সম্পূর্ণ ভর্তি করা হয়েছে।',
                          tone: 'gold',
                        });
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Crosshair className="w-4 h-4" />
                    {language === 'en'
                      ? 'Refill All Ammo (৳250)'
                      : 'সকল অ্যামো রিফিল (৳২৫০)'}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-300 mb-2">
                  {language === 'en'
                    ? 'Street Defense Gear & Tools'
                    : 'আত্মরক্ষার সরঞ্জাম'}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => equipTool(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        equippedToolId === t.id
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">
                        {language === 'en' ? t.nameEn : t.nameBn}
                      </p>
                      <div className="flex items-center justify-between text-[10px] mt-0.5">
                        <span className="text-emerald-400">
                          {t.unlocked
                            ? equippedToolId === t.id
                              ? 'Equipped ✓'
                              : 'Click to Equip'
                            : `Buy — ৳${t.price}`}
                        </span>
                        {t.isFirearm && (
                          <span className="font-mono text-amber-400 font-bold">
                            {t.currentClip ?? 0}/{t.reserveAmmo ?? 0}
                          </span>
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

        {/* TAB 5: CHARACTER SELECTION & MODERN STREETWEAR WARDROBE */}
        {pauseTab === 'character' && (
          <div className="space-y-6">
            {/* 1. Playable Character Selection (৫ জন চরিত্র নির্বাচন) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    {language === 'en'
                      ? 'SELECT PLAYABLE CHARACTER'
                      : 'খেলার চরিত্র নির্বাচন করুন'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'en'
                      ? 'Switch seamlessly between 5 unique Dhaka heroes with customized skills, stats, and authentic 3D skeletal animations.'
                      : 'ঢাকার ৫ জন অনন্য চরিত্রের মধ্য থেকে বেছে নিন। প্রত্যেকের নিজস্ব ড্রাইভিং ও অ্যাকশন দক্ষতা রয়েছে।'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  {PLAYABLE_CHARACTERS.length} Characters Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {PLAYABLE_CHARACTERS.map((char) => {
                  const isSelected = selectedCharacterId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => selectCharacter(char.id)}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xl scale-[1.01]'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={resolveAssetUrl(char.avatar)}
                          alt={char.nameEn}
                          className={`w-14 h-14 rounded-xl object-cover object-top border-2 shrink-0 ${
                            isSelected ? 'border-emerald-400 shadow-md ring-2 ring-emerald-500/40' : 'border-slate-700'
                          }`}
                          onError={(e) => {
                            const el = e.currentTarget;
                            if (!el.src.includes('arif_portrait.jpg')) {
                              el.src = resolveAssetUrl('/textures/arif_portrait.jpg');
                            }
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-black text-white truncate">
                              {language === 'en' ? char.nameEn : char.nameBn}
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                              {char.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {language === 'en' ? char.taglineEn : char.taglineBn}
                          </p>
                          <div className="mt-2 text-[10px] text-emerald-300 font-semibold bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
                            ⚡ {language === 'en' ? char.specialAbilityEn : char.specialAbilityBn}
                          </div>
                        </div>
                      </div>

                      {/* Stat Bars */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Speed</span>
                            <span className="font-mono text-white">{char.stats.speed}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${char.stats.speed}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Driving</span>
                            <span className="font-mono text-white">{char.stats.driving}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${char.stats.driving}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Stamina</span>
                            <span className="font-mono text-white">{char.stats.stamina}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${char.stats.stamina}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Combat</span>
                            <span className="font-mono text-white">{char.stats.combat}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${char.stats.combat}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectCharacter(char.id);
                          }}
                          className={`w-full py-1.5 rounded-lg text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isSelected
                            ? language === 'en'
                              ? 'ACTIVE HERO ✓'
                              : 'সক্রিয় চরিত্র ✓'
                            : language === 'en'
                            ? `SELECT ${char.nameEn.toUpperCase()}`
                            : `${char.nameBn} নির্বাচন`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Modern Streetwear & Dhaka Wardrobe (আধুনিক পোশাক ও ড্রেস) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  {language === 'en'
                    ? 'MODERN STREETWEAR & DHAKA WARDROBE'
                    : 'আধুনিক পোশাক ও ওয়ার্ডরোব'}
                </h3>
                <span className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'Authentic modern jackets, denim & sneakers'
                    : 'আধুনিক জ্যাকেট, ডেনিম ও স্নিকার্স'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outfits.map((o) => {
                  const isEq = equippedOutfitId === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        isEq
                          ? 'bg-emerald-950/30 border-emerald-400 shadow-md'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-lg border border-white/30 shrink-0 shadow-sm"
                          style={{ backgroundColor: o.shirtColor }}
                        />
                        <div>
                          <p className="text-xs font-extrabold text-white">
                            {language === 'en' ? o.nameEn : o.nameBn}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {o.unlocked ? 'Owned' : `Price: ৳ ${o.price}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => equipOutfit(o.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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
                ['W, A, S, D / Arrow Keys', 'Walk, Swim, Steer & Drive Vehicle'],
                ['Left Shift (Hold)', 'Sprint on Foot / Fast Crawl Stroke in Water'],
                ['F or E', 'Board / Bail Out Vehicle, Refuel at CNG/Pier, Buy Food, Use ATM & Shop'],
                ['H', 'Honk Horn (Parts Traffic) or Ring Rickshaw Bell'],
                ['L', 'Toggle Vehicle Headlights (Auto / On / Off)'],
                ['G', 'Start / Cancel Passenger Taxi/CNG Fare Job'],
                ['Spacebar', 'Jump (On Foot) / Handbrake Drift (In Vehicle)'],
                ['C', 'Toggle Crouch (On Foot)'],
                ['T', 'Talk to Nearby Dhaka Citizens & Contacts'],
                ['1-9, 0, - / Q', 'Equip or Cycle Firearms & Deshi Weapons'],
                ['Right-Click or Z', 'Toggle Tactical Aim Down Sights (ADS)'],
                ['J, K, X / Left-Click', 'Melee Strike / Fire Weapon'],
                ['R', 'Reload Firearm (On Foot) / Switch FM Radio (In Vehicle)'],
                ['Mouse Drag', 'Orbit 360° Third-Person Camera'],
                ['V', 'Cycle Camera Distance (Close, Standard, Far Chase)'],
                ['M, Tab, or ESC', 'Open Interactive Dhaka GPS Map & Pause Menu'],
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
