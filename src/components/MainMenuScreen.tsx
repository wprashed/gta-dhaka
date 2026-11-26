import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { DISTRICTS, PLAYABLE_CHARACTERS } from '../data/dhakaWorldData';
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
  User,
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
    selectedCharacterId,
    selectCharacter,
  } = useGameStore();

  const [subPanel, setSubPanel] = useState<
    'none' | 'settings' | 'controls' | 'credits' | 'characters'
  >('none');

  const savedExists = hasSavedGame();
  const currentChar =
    PLAYABLE_CHARACTERS.find((c) => c.id === selectedCharacterId) ||
    PLAYABLE_CHARACTERS[0];

  return (
    <div className="fixed inset-0 z-30 bg-gradient-to-r from-slate-950/95 via-slate-950/82 to-slate-950/45 backdrop-blur-[3px] flex flex-col justify-between p-5 sm:p-10 text-white select-none overflow-y-auto">
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
              src={resolveAssetUrl(currentChar.avatar)}
              alt={currentChar.nameEn}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-2xl shrink-0"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes('arif_portrait.jpg')) {
                  el.src = resolveAssetUrl('/textures/arif_portrait.jpg');
                }
              }}
            />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {language === 'en'
                  ? 'Dhaka, Bangladesh • ওপেন ওয়ার্ল্ড অ্যাকশন'
                  : 'ঢাকা, বাংলাদেশ • ওপেন ওয়ার্ল্ড অ্যাকশন গেম'}
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-200 to-emerald-400 drop-shadow-2xl">
                DHAKA CITY
              </h1>
              <p className="text-lg sm:text-xl font-black text-amber-400 mt-1">
                {language === 'en' ? currentChar.nameEn : currentChar.nameBn} • {currentChar.badge}
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-medium">
            {language === 'en'
              ? 'Step into the shoes of Arif Rahman in a realistic 3D open-world Dhaka powered by skeletal GLTF characters, photographic PBR textures, and Sketchfab GTA 3D assets. Drive caged green CNG auto-rickshaws, hand-painted cycle rickshaws, and local buses across 10 interconnected districts.'
              : 'আরিফ রহমানের চরিত্রে রিয়েলিস্টিক থ্রিডি ঢাকা শহরে নামুন। সবুজ খাঁচার সিএনজি অটোরিকশা, রঙিন রিকশা এবং লোকাল বাস চালিয়ে পুরান ঢাকা ও সদরঘাট থেকে ফার্মগেট, হাতিরঝিল ও গুলশান জুড়ে রোমাঞ্চকর মিশন সম্পন্ন করুন।'}
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
              onClick={() =>
                setSubPanel(subPanel === 'characters' ? 'none' : 'characters')
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-black border flex items-center gap-2 transition-all ${
                subPanel === 'characters'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
              }`}
            >
              <User className="w-4 h-4" />
              {language === 'en'
                ? `Hero: ${currentChar.nameEn.split(' ')[0]}`
                : `চরিত্র: ${currentChar.nameBn.split(' ')[0]}`}
            </button>
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
                  ['F or E', 'Enter/Exit CNG, Rickshaw, Bus & Stalls'],
                  ['H', 'Honk Horn / Ring Rickshaw Bell'],
                  ['Shift / Space', 'Sprint / Jump / Drift Brake'],
                  ['T / J', 'Talk to NPCs / Melee Attack'],
                  ['M / ESC', 'Full Dhaka GPS Map & Missions'],
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

          {subPanel === 'characters' && (
            <div className="bg-slate-950/92 border border-emerald-400/50 rounded-2xl p-5 shadow-2xl space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {language === 'en' ? 'Select Playable Character' : 'খেলার চরিত্র নির্বাচন করুন'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'en'
                      ? 'Choose your protagonist. Each hero has customized stats & 3D abilities.'
                      : 'আপনার মূল চরিত্র বেছে নিন। প্রত্যেকের নিজস্ব ড্রাইভিং ও অ্যাকশন দক্ষতা রয়েছে।'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                  {PLAYABLE_CHARACTERS.length} Heroes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLAYABLE_CHARACTERS.map((char) => {
                  const isSelected = selectedCharacterId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => selectCharacter(char.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg scale-[1.01]'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <img
                          src={resolveAssetUrl(char.avatar)}
                          alt={char.nameEn}
                          className={`w-12 h-12 rounded-xl object-cover object-top border-2 shrink-0 ${
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
                            <h4 className="text-xs font-black text-white truncate">
                              {language === 'en' ? char.nameEn : char.nameBn}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                              {char.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {language === 'en' ? char.taglineEn : char.taglineBn}
                          </p>
                          <div className="mt-1.5 text-[9px] text-emerald-300 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate">
                            ⚡ {language === 'en' ? char.specialAbilityEn : char.specialAbilityBn}
                          </div>
                        </div>
                      </div>

                      {/* Stat Bars */}
                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 mt-2 pt-2 border-t border-slate-800/80 text-[9px]">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {subPanel === 'none' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950/88 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start">
                  <img
                    src="/dhaka_photos/cng_real.jpg"
                    alt="Real Dhaka Green CNG"
                    className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Actual Dhaka Photo-Textured Vehicles
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Real Dhaka green caged CNG auto-rickshaws, Old Dhaka
                      painted cycle rickshaws, local buses & GLTF 3D trucks.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start">
                  <img
                    src="/sketchfab/gta_model_0.jpg"
                    alt="Sketchfab GTA 3D Assets"
                    className="w-16 h-16 rounded-xl object-cover border border-amber-500/40 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Sketchfab GTA 3D Assets & .GLB
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Synced with top-liked Sketchfab GTA models—spawn Asian
                      shops, billboards, cash stacks & custom .GLB models!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start">
                  <img
                    src={CHARACTER_PORTRAITS.nadia}
                    alt="Nadia Hasan"
                    className="w-16 h-16 rounded-xl object-cover object-top border border-pink-500/40 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Rigged 3D Characters & Portraits
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Skeletal-animated 3D GLTF humans (`Idle`, `Walk`, `Run`) +
                      photorealistic character portraits in dialogues.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/88 border border-slate-800/90 rounded-2xl p-3.5 shadow-xl flex gap-3 items-start">
                  <img
                    src="/dhaka_photos/sadarghat_real.jpg"
                    alt="Sadarghat Buriganga River"
                    className="w-16 h-16 rounded-xl object-cover border border-cyan-500/40 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Real Dhaka Landmarks & Districts
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Real photographs of Sadarghat, Hatirjheel Bridge,
                      Motijheel Shapla Chattar, Farmgate & Gulshan Avenue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Real Dhaka Photo Strip */}
              <div className="bg-slate-950/88 border border-slate-800/90 rounded-2xl p-3 shadow-xl">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 mb-2">
                  Actual Dhaka Photographs Integrated Across 10 Districts & 3D
                  Subjects
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    ['/dhaka_photos/old_dhaka_real.jpg', 'Old Dhaka'],
                    ['/dhaka_photos/hatirjheel_real.jpg', 'Hatirjheel'],
                    ['/dhaka_photos/motijheel_real.jpg', 'Motijheel'],
                    ['/dhaka_photos/farmgate_real.jpg', 'Farmgate'],
                    ['/dhaka_photos/gulshan_real.jpg', 'Gulshan'],
                    ['/dhaka_photos/bus_real.jpg', 'Dhaka Bus'],
                  ].map(([src, label]) => (
                    <div key={src} className="relative group overflow-hidden rounded-lg border border-slate-700 h-14">
                      <img
                        src={src}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/85 text-[9px] font-bold text-center text-slate-200 py-0.5 truncate">
                        {label}
                      </span>
                    </div>
                  ))}
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
