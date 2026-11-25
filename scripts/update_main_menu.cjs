const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'MainMenuScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add PLAYABLE_CHARACTERS import
if (!content.includes('PLAYABLE_CHARACTERS')) {
  content = content.replace(
    "DISTRICTS\n} from '../data/dhakaWorldData';",
    "DISTRICTS,\n  PLAYABLE_CHARACTERS,\n} from '../data/dhakaWorldData';"
  );
}

// 2. Add User icon import
if (!content.includes('User,')) {
  content = content.replace('Sparkles,\n  Volume2,', 'Sparkles,\n  User,\n  Volume2,');
}

// 3. Extract selectedCharacterId and selectCharacter from useGameStore
if (!content.includes('selectedCharacterId,')) {
  content = content.replace(
    'setGamePhase,\n  } = useGameStore();',
    'setGamePhase,\n    selectedCharacterId,\n    selectCharacter,\n  } = useGameStore();'
  );
}

// 4. Update subPanel type
content = content.replace(
  "'none' | 'settings' | 'controls' | 'credits'",
  "'none' | 'settings' | 'controls' | 'credits' | 'characters'"
);

// 5. Add currentChar definition
if (!content.includes('const currentChar =')) {
  const heroTop = 'const savedExists = hasSavedGame();';
  const heroWithChar = `const savedExists = hasSavedGame();
  const currentChar =
    PLAYABLE_CHARACTERS.find((c) => c.id === selectedCharacterId) ||
    PLAYABLE_CHARACTERS[0];`;
  content = content.replace(heroTop, heroWithChar);
}

// 6. Update hero avatar and name
content = content.replace(
  `            <img
              src={CHARACTER_PORTRAITS.arif}
              alt="Arif Rahman"`,
  `            <img
              src={currentChar.avatar}
              alt={currentChar.nameEn}`
);

content = content.replace(
  `              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-200 to-emerald-400 drop-shadow-2xl">
                DHAKA CITY
              </h1>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                ঢাকা সিটি : রাজপথের গল্প
              </p>`,
  `              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-amber-200 to-emerald-400 drop-shadow-2xl">
                DHAKA CITY
              </h1>
              <p className="text-lg sm:text-xl font-black text-amber-400 mt-1">
                {language === 'en' ? currentChar.nameEn : currentChar.nameBn} • {currentChar.badge}
              </p>`
);

// 7. Add Select Character button in Secondary Menu Buttons
if (!content.includes("subPanel === 'characters'")) {
  const secBtns = `<div className="flex flex-wrap items-center gap-2.5">`;
  const secBtnsWithChar = `<div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                setSubPanel(subPanel === 'characters' ? 'none' : 'characters')
              }
              className={\`px-4 py-2.5 rounded-xl text-xs font-black border flex items-center gap-2 transition-all \${
                subPanel === 'characters'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/50'
              }\`}
            >
              <User className="w-4 h-4" />
              {language === 'en'
                ? \`Hero: \${currentChar.nameEn.split(' ')[0]}\`
                : \`চরিত্র: \${currentChar.nameBn.split(' ')[0]}\`}
            </button>`;

  content = content.replace(secBtns, secBtnsWithChar);
}

// 8. Add characters subPanel rendering before settings
if (!content.includes("subPanel === 'characters' && (")) {
  const subPanelMarker = `{/* SUB PANELS */}`;
  const charPanel = `{/* SUB PANELS */}
      {subPanel === 'characters' && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                  <User className="w-6 h-6 text-emerald-400" />
                  {language === 'en'
                    ? 'CHOOSE YOUR DHAKA HERO'
                    : 'আপনার চরিত্র নির্বাচন করুন'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'en'
                    ? 'Select from 5 unique characters with distinct abilities, driving styles, and 3D rigs.'
                    : 'ঢাকার ৫ জন চরিত্রের যে কোনো একজনকে বেছে নিয়ে গেমে প্রবেশ করুন।'}
                </p>
              </div>
              <button
                onClick={() => setSubPanel('none')}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLAYABLE_CHARACTERS.map((char) => {
                const isSelected = selectedCharacterId === char.id;
                return (
                  <div
                    key={char.id}
                    onClick={() => selectCharacter(char.id)}
                    className={\`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between \${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl scale-[1.02]'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }\`}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <img
                          src={char.avatar}
                          alt={char.nameEn}
                          className={\`w-14 h-14 rounded-xl object-cover border-2 \${
                            isSelected ? 'border-emerald-400' : 'border-slate-700'
                          }\`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black text-white">
                              {language === 'en' ? char.nameEn : char.nameBn}
                            </h4>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                              {char.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {language === 'en' ? char.taglineEn : char.taglineBn}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-3 leading-relaxed">
                        {language === 'en' ? char.bioEn : char.bioBn}
                      </p>

                      <div className="mt-3 text-[10px] text-emerald-300 font-semibold bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                        ⚡ {language === 'en' ? char.specialAbilityEn : char.specialAbilityBn}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Speed</span>
                            <span className="font-mono text-white">{char.stats.speed}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 rounded-full" style={{ width: \`\${char.stats.speed}%\` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Driving</span>
                            <span className="font-mono text-white">{char.stats.driving}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: \`\${char.stats.driving}%\` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCharacter(char.id);
                      }}
                      className={\`w-full mt-4 py-2 rounded-xl text-xs font-black transition-all \${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }\`}
                    >
                      {isSelected
                        ? language === 'en'
                          ? 'SELECTED HERO ✓'
                          : 'নির্বাচিত চরিত্র ✓'
                        : language === 'en'
                        ? \`PLAY AS \${char.nameEn.toUpperCase()}\`
                        : \`\${char.nameBn} নির্বাচন করুন\`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}`;

  content = content.replace(subPanelMarker, charPanel);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated MainMenuScreen.tsx via script!');
