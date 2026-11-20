import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { DISTRICTS } from '../data/dhakaWorldData';
import { CHARACTER_PORTRAITS } from '../data/sketchfabGtaCatalog';
import { resolveAssetUrl } from '../utils/assets';
import {
  Award,
  Box,
  Car,
  Compass,
  Gamepad2,
  Languages,
  MapPin,
  Play,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Volume2,
} from 'lucide-react';

export const MainMenuScreen: React.FC = () => {
  const {
    startNewGame,
    continueGame,
    hasSavedGame,
    language,
    toggleLanguage,
    graphicsQuality,
    setGraphicsQuality,
    musicVolume,
    sfxVolume,
    ambienceVolume,
    setVolumes,
    setGamePhase,
    requestTeleport,
    requestSpawnVehicle,
    equipTool,
    showBanner,
  } = useGameStore();

  const [subPanel, setSubPanel] = useState<
    'none' | 'settings' | 'controls' | 'credits'
  >('none');

  const savedExists = hasSavedGame();

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-10 text-white select-none overflow-y-auto"
      style={{
        background: `linear-gradient(to right, rgba(11, 14, 19, 0.96) 0%, rgba(16, 20, 24, 0.90) 55%, rgba(11, 14, 19, 0.72) 100%), url('${resolveAssetUrl('/dhaka_locations/dhaka_rooftop_twilight.png')}') center/cover no-repeat fixed`,
      }}
    >
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1 rounded-full bg-emerald-600/30 border border-emerald-400/50 text-emerald-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Real-Time 3D GLTF & Sketchfab Asset Engine
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
            Three.js • Skeletal Rigged Characters • PBR Textures • 10 Districts
          </span>
        </div>

        <button
          onClick={toggleLanguage}
          className="bg-slate-900/90 hover:bg-slate-800 border border-amber-400/50 text-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition-colors"
        >
          <Languages className="w-4 h-4" />
          {language === 'en' ? 'বাংলা সংস্করণ (Bangla)' : 'English Version'}
        </button>
      </div>

      {/* CENTER HERO CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-4">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-4">
            <img
              src={CHARACTER_PORTRAITS.arif}
              alt="Arif Rahman"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-2xl shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {language === 'en'
                  ? 'Dhaka, Bangladesh • ওপেন ওয়ার্ল্ড অ্যাকশন'
                  : 'ঢাকা, বাংলাদেশ • ওপেন ওয়ার্ল্ড অ্যাকশন গেম'}
              </div>
              <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-200 to-emerald-400 drop-shadow-2xl">
                DHAKA CITY
              </h1>
              <p className="text-xl sm:text-2xl font-black font-display text-emerald-400 tracking-wider mt-1 uppercase">
                MONSOON UNDERWORLD • <span className="font-sans text-amber-300">মনসুন আন্ডারওয়ার্ল্ড</span>
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-medium">
            {language === 'en'
              ? 'Step into the shoes of Arif Rahman across a rain-slicked AAA open-world Dhaka. Experience 16 cinematic landmark locations, tuned turbo CNG baby taxis, DMP riot interceptors, and underground street rallies amidst monsoon haze.'
              : 'আরিফ রহমানের চরিত্রে নামুন বৃষ্টিভেজা ঢাকা শহরের রোমাঞ্চকর জগতে। ১৬টি দর্শনীয় স্থান, টিউনড সিএনজি অটোরিকশা, ডিএমপি রায়ট ভ্যান এবং গভীর রাতের স্ট্রিট রেসিংয়ের গল্প।'}
          </p>

          {/* Primary Menu Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
            <button
              onClick={startNewGame}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base px-7 py-4 rounded-2xl shadow-2xl shadow-emerald-950/80 border-2 border-emerald-200 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              {language === 'en'
                ? 'NEW GAME — ENTER DHAKA'
                : 'নতুন গেম শুরু করুন'}
            </button>

            <button
              onClick={continueGame}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm px-6 py-4 rounded-2xl shadow-xl border-2 border-amber-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              {savedExists
                ? language === 'en'
                  ? 'CONTINUE SAVED GAME'
                  : 'সেভ করা গেম চালু করুন'
                : language === 'en'
                ? 'QUICK START PROTOTYPE'
                : 'দ্রুত শুরু করুন'}
            </button>
          </div>

          {/* Secondary Menu Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setGamePhase('paused', 'sketchfab')}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold border bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/50 flex items-center gap-2 transition-all"
            >
              <Box className="w-4 h-4" />
              {language === 'en'
                ? 'Sketchfab GTA 3D Catalog'
                : 'স্কেচফ্যাব থ্রিডি ক্যাটালগ'}
            </button>

            <button
              onClick={() =>
                setSubPanel(subPanel === 'settings' ? 'none' : 'settings')
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition-all ${
                subPanel === 'settings'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              {language === 'en' ? 'Settings' : 'সেটিংস'}
            </button>

            <button
              onClick={() =>
                setSubPanel(subPanel === 'controls' ? 'none' : 'controls')
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition-all ${
                subPanel === 'controls'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              {language === 'en' ? 'Controls' : 'কন্ট্রোল গাইড'}
            </button>

            <button
              onClick={() =>
                setSubPanel(subPanel === 'credits' ? 'none' : 'credits')
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition-all ${
                subPanel === 'credits'
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Award className="w-4 h-4" />
              {language === 'en' ? 'World & Credits' : 'গেম পরিচিতি'}
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-6">
          {subPanel === 'settings' && (
            <div className="bg-slate-950/92 border border-amber-400/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {language === 'en' ? 'Game Settings' : 'গেম সেটিংস'}
              </h3>

              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm font-bold">Graphics Quality</span>
                <div className="flex gap-2">
                  {(['high', 'low'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setGraphicsQuality(q)}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase ${
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
                  <label className="text-xs font-bold flex justify-between mb-1">
                    <span>Bangla FM Radio & Music Volume</span>
                    <span>{Math.round(musicVolume * 100)}%</span>
                  </label>
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
                  <label className="text-xs font-bold flex justify-between mb-1">
                    <span>CNG Engine, Horns & Rickshaw Bells</span>
                    <span>{Math.round(sfxVolume * 100)}%</span>
                  </label>
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
              </div>
            </div>
          )}

          {subPanel === 'controls' && (
            <div className="bg-slate-950/92 border border-amber-400/50 rounded-2xl p-6 shadow-2xl space-y-3">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                {language === 'en'
                  ? 'Controls Overview'
                  : 'খেলার নিয়ম ও কন্ট্রোল'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  ['WASD / Arrows', 'Walk, Run & Drive Vehicles'],
                  ['Left Click / J / K', 'Fire Gun / Melee Strike (Ramda, Bat)'],
                  ['Right Click / Z', 'Aim Down Sights (ADS Precision Mode)'],
                  ['1 – 0', 'Direct Weapon Select (AK, Katta, TT, Ramda)'],
                  ['Spacebar', 'Jump / Evade Roll (in ADS) / Drift (Car)'],
                  ['Shift', 'Sprint on Foot / Nitro Boost (in Vehicle)'],
                  ['Q / X / Wheel', 'Cycle Equipped Weapons'],
                  ['R', 'Reload Firearm (On Foot) / Radio (In Car)'],
                  ['F or E', 'Enter/Exit CNG, Car, Rickshaw & Stalls'],
                  ['H', 'Honk Horn / Ring Rickshaw Bell'],
                  ['C', 'Toggle Crouch / Stealth Mode'],
                  ['T', 'Talk to Street NPCs / Story Contacts'],
                  ['V', 'Cycle Camera (Third, Far Chase, Cockpit)'],
                  ['M / ESC', 'Full Dhaka GPS Map & Armory'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-amber-400">
                      {k}
                    </span>
                    <span className="text-slate-300 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subPanel === 'credits' && (
            <div className="bg-slate-950/92 border border-amber-400/50 rounded-2xl p-6 shadow-2xl space-y-3">
              <h3 className="text-lg font-black text-amber-400">
                DHAKA CITY — Original Open-World Production
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                An original browser-based 3D action-adventure set in modern-day
                Dhaka, featuring 10 interconnected districts, rigged 3D GLTF
                human characters, Sketchfab GTA asset integration, authentic
                Bangladeshi transport, and a 5-chapter branching crime narrative
                starring Arif Rahman.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {DISTRICTS.map((d) => (
                  <span
                    key={d.id}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300"
                  >
                    {d.nameEn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {subPanel === 'none' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/88 border border-emerald-500/40 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start tactical-chamfer">
                  <img
                    src={resolveAssetUrl('/dhaka_locations/tuned_cng_auto_rickshaw.png')}
                    alt="Tuned Green CNG Auto-Rickshaw"
                    className="w-20 h-16 rounded-xl object-cover border border-emerald-400/60 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black font-display text-white">
                      Tuned Green CNG Auto-Rickshaw
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      Dholaikhal custom-fabricated roll cage, nitrous injection, and high-performance engine for agile Dhaka alley escapes.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-rose-500/40 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start tactical-chamfer">
                  <img
                    src={resolveAssetUrl('/dhaka_locations/dmp_riot_interceptor.png')}
                    alt="DMP Riot Interceptor"
                    className="w-20 h-16 rounded-xl object-cover border border-rose-400/60 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black font-display text-white">
                      DMP Tactical Riot Interceptor
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      Heavy armored police pickup with reinforced bull bars, emergency strobe lights, and tactical ramming power.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-amber-500/40 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start tactical-chamfer">
                  <img
                    src={resolveAssetUrl('/dhaka_locations/chawkbazar.png')}
                    alt="Chawkbazar Mughal Alleys"
                    className="w-20 h-16 rounded-xl object-cover border border-amber-400/60 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black font-display text-white">
                      Historic Mughal Spice Alleys
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      Chawkbazar, Lalbagh Fort & Shankharia Bazar artisan quarters rendered in atmospheric nocturnal detail.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-cyan-500/40 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start tactical-chamfer">
                  <img
                    src={resolveAssetUrl('/dhaka_locations/hatirjheel.png')}
                    alt="Hatirjheel Rainbow Expressway"
                    className="w-20 h-16 rounded-xl object-cover border border-cyan-400/60 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black font-display text-white">
                      Hatirjheel & Sadarghat Ports
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      LED-illuminated parabolic rainbow arch bridges, Buriganga ferry steamers, and midnight racing circuits.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Real Dhaka Location Fast Deployer Strip */}
              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl glow-cng">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-mono font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {language === 'en'
                        ? 'CLICK ANY DHAKA LANDMARK TO SPAWN INSTANTLY'
                        : 'যেকোনো লোকেশনে ক্লিক করে সরাসরি খেলা শুরু করুন'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {language === 'en'
                        ? '16 Real Dhaka Location Concept Skins • Instant Teleport & Action'
                        : 'ঢাকার ১৬টি বাস্তব লোকেশন স্কিন • সরাসরি অবতরণ'}
                    </p>
                  </div>
                  <span className="bg-emerald-950/90 text-emerald-400 border border-emerald-500/50 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-md">
                    MONSOON UNDERWORLD
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {[
                    {
                      nameEn: 'Ahsan Manzil',
                      nameBn: 'আহসান মঞ্জিল',
                      src: '/dhaka_locations/ahsan_manzil.png',
                      x: -65,
                      z: 120,
                      vibe: 'Puran Dhaka Pink Palace',
                    },
                    {
                      nameEn: 'Chawkbazar',
                      nameBn: 'চকবাজার',
                      src: '/dhaka_locations/chawkbazar.png',
                      x: -25,
                      z: 24,
                      vibe: 'Iftar Alleys & Street Food',
                    },
                    {
                      nameEn: 'Hatirjheel',
                      nameBn: 'হাতিরঝিল',
                      src: '/dhaka_locations/hatirjheel.png',
                      x: 202,
                      z: -40,
                      vibe: 'Rainbow Arch Lake Drive',
                    },
                    {
                      nameEn: 'Curzon Hall',
                      nameBn: 'কার্জন হল',
                      src: '/dhaka_locations/curzon_hall.png',
                      x: -180,
                      z: 25,
                      vibe: 'Red Brick Mughal Campus',
                    },
                    {
                      nameEn: 'Motijheel',
                      nameBn: 'মতিঝিল',
                      src: '/dhaka_locations/motijheel.png',
                      x: 202,
                      z: 158,
                      vibe: 'Shapla Chattar Financial Hub',
                    },
                    {
                      nameEn: 'Sadarghat',
                      nameBn: 'সদরঘাট',
                      src: '/dhaka_locations/sadarghat.png',
                      x: 12,
                      z: 275,
                      vibe: 'Buriganga Riverfront Launch',
                    },
                    {
                      nameEn: 'Gulshan 2',
                      nameBn: 'গুলশান-২',
                      src: '/dhaka_locations/gulshan_2.png',
                      x: 202,
                      z: -158,
                      vibe: 'Diplomatic Highrises',
                    },
                    {
                      nameEn: 'Lalbagh Fort',
                      nameBn: 'লালবাগ কেল্লা',
                      src: '/dhaka_locations/lalbagh_fort.png',
                      x: -95,
                      z: 195,
                      vibe: '17th-Century Mughal Fort',
                    },
                    {
                      nameEn: 'Kawran Bazar',
                      nameBn: 'কাওরান বাজার',
                      src: '/dhaka_locations/kawran_bazar.png',
                      x: 24,
                      z: -22,
                      vibe: 'Wholesale Trade & Tong Cha',
                    },
                    {
                      nameEn: 'Shakhari Bazar',
                      nameBn: 'শাঁখারীবাজার',
                      src: '/dhaka_locations/shakhari_bazar.png',
                      x: -45,
                      z: 245,
                      vibe: 'Historic Conch Artisans Lane',
                    },
                    {
                      nameEn: 'Gabtoli Terminal',
                      nameBn: 'গাবতলী টার্মিনাল',
                      src: '/dhaka_locations/gabtoli.png',
                      x: -245,
                      z: -220,
                      vibe: 'Highway Bus Express',
                    },
                    {
                      nameEn: 'Tejgaon Industrial',
                      nameBn: 'তেজগাঁও',
                      src: '/dhaka_locations/tejgaon.png',
                      x: 85,
                      z: -160,
                      vibe: 'Speed Corridor & Garages',
                    },
                  ].map((loc) => (
                    <button
                      key={loc.src}
                      onClick={() => {
                        requestTeleport(loc.x, loc.z);
                        showBanner({
                          titleEn: `DEPLOYED TO ${loc.nameEn.toUpperCase()}`,
                          titleBn: `${loc.nameBn}-এ সফলভাবে অবতরণ করেছেন!`,
                          subtitleEn: loc.vibe,
                          subtitleBn: 'ঢাকা শহরের বাস্তব মানচিত্রে স্বাগতম।',
                          tone: 'gold',
                        });
                      }}
                      className="relative group overflow-hidden rounded-xl border border-slate-700/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/50 h-24 transition-all text-left flex flex-col justify-end p-2 cursor-pointer active:scale-95"
                      title={`Spawn in ${loc.nameEn} (${loc.nameBn})`}
                    >
                      <img
                        src={resolveAssetUrl(loc.src)}
                        alt={loc.nameEn}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      <div className="relative z-10">
                        <span className="block text-[11px] font-black text-white font-display uppercase tracking-wide truncate group-hover:text-amber-300">
                          {language === 'en' ? loc.nameEn : loc.nameBn}
                        </span>
                        <span className="block text-[8px] font-mono text-emerald-400 font-semibold truncate">
                          {loc.vibe}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick Vehicle / Loadout Spawn Shortcuts */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-300 font-bold">
                    {language === 'en'
                      ? '⚡ QUICK VEHICLE DEPLOY:'
                      : '⚡ দ্রুত গাড়ি নিয়ে নামুন:'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        requestSpawnVehicle('cng');
                        equipTool('type56_ak');
                        showBanner({
                          titleEn: 'TUNED BAJAJ CNG & TYPE-56 AK READY',
                          titleBn: 'টিউনড সিএনজি ও টাইপ-৫৬ একে প্রস্তুত!',
                          subtitleEn: 'Vehicle delivered directly to Arif.',
                          subtitleBn: 'আপনার সামনে গাড়ি প্রস্তুত করা হয়েছে।',
                          tone: 'green',
                        });
                      }}
                      className="bg-emerald-700/80 hover:bg-emerald-600 text-white text-[10px] font-black font-mono px-2.5 py-1 rounded-md border border-emerald-400/60 shadow transition-transform active:scale-95"
                    >
                      🛺 TUNED CNG + AK-47
                    </button>
                    <button
                      onClick={() => {
                        requestSpawnVehicle('police');
                        equipTool('katta');
                        showBanner({
                          titleEn: 'DMP RIOT INTERCEPTOR & KATTA READY',
                          titleBn: 'ডিএমপি পুলিশ কার ও দেশি কাট্টা প্রস্তুত!',
                          subtitleEn: 'Police cruiser commandeered.',
                          subtitleBn: 'পুলিশ গাড়ি দখল করা হয়েছে।',
                          tone: 'blue',
                        });
                      }}
                      className="bg-blue-700/80 hover:bg-blue-600 text-white text-[10px] font-black font-mono px-2.5 py-1 rounded-md border border-blue-400/60 shadow transition-transform active:scale-95"
                    >
                      🚓 DMP POLICE CRUISER
                    </button>
                    <button
                      onClick={() => {
                        requestSpawnVehicle('motorcycle');
                        equipTool('shutter_pistol');
                        showBanner({
                          titleEn: 'SPORTS MOTORCYCLE & REVOLVER READY',
                          titleBn: 'স্পোর্টস মোটরবাইক ও রিভলভার প্রস্তুত!',
                          subtitleEn: 'Midnight street racer ready.',
                          subtitleBn: 'রেসিং বাইক প্রস্তুত।',
                          tone: 'gold',
                        });
                      }}
                      className="bg-amber-600/80 hover:bg-amber-500 text-white text-[10px] font-black font-mono px-2.5 py-1 rounded-md border border-amber-400/60 shadow transition-transform active:scale-95"
                    >
                      🏍️ SPORTS BIKE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
        <span className="flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          Procedural Web Audio: Dhaka Horns, Rickshaw Bells, CNG Engine & Bangla
          FM Radio
        </span>
        <span>Currency: Bangladeshi Taka (৳) • Target: 60 FPS WebGL</span>
      </div>
    </div>
  );
};
