import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  DISTRICTS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  STORY_MISSIONS,
} from '../data/dhakaWorldData';
import { Compass, Map as MapIcon } from 'lucide-react';

export const MinimapHUD: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    playerX,
    playerZ,
    playerRotation,
    currentDistrict,
    activeMissionId,
    activeMissionStepIndex,
    customWaypoint,
    wantedLevel,
    health,
    maxHealth,
    armor,
    maxArmor,
    stamina,
    language,
    setGamePhase,
    isInsideMall,
    mallFloor,
    activeFareJob,
  } = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size / 2;

    ctx.clearRect(0, 0, size, size);

    if (isInsideMall) {
      // JAMUNA FUTURE PARK — INDOOR FLOOR PLAN RADAR
      const scale = 1.45;
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.translate(half, half);

      const toM = (wx: number, wz: number) => ({
        rx: (wx - playerX) * scale,
        rz: (wz - playerZ) * scale,
      });

      // Mall floor slab (520±56, -385±36)
      const mallTL = toM(464, -421);
      ctx.fillStyle = '#312e81';
      ctx.fillRect(mallTL.rx, mallTL.rz, 112 * scale, 72 * scale);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(mallTL.rx, mallTL.rz, 112 * scale, 72 * scale);

      // Open Atrium Void (506..534, -396..-374)
      const atrTL = toM(506, -396);
      ctx.fillStyle = mallFloor === 0 ? '#1e293b' : '#0f172a';
      ctx.fillRect(atrTL.rx, atrTL.rz, 28 * scale, 22 * scale);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(atrTL.rx, atrTL.rz, 28 * scale, 22 * scale);

      // Central Atrium Fountain
      const fnt = toM(520, -385);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(fnt.rx, fnt.rz, 4.4 * scale, 0, Math.PI * 2);
      ctx.fill();

      // West & East Escalators
      const escW = toM(495, -394);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(escW.rx, escW.rz, 5 * scale, 18 * scale);
      const escE = toM(540, -394);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(escE.rx, escE.rz, 5 * scale, 18 * scale);

      // Glass Capsule Elevator (520, -398)
      const elv = toM(520, -397);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(elv.rx - 3, elv.rz - 3, 6, 6);

      // Shop units per floor
      const shops =
        mallFloor === 0
          ? [
              { x: 478, z: -413, l: 'Aarong' },
              { x: 499, z: -413, l: 'Samsung' },
              { x: 541, z: -413, l: 'Yellow' },
              { x: 562, z: -413, l: 'Apex' },
              { x: 478, z: -357, l: 'Ecstasy' },
              { x: 499, z: -357, l: 'Bata' },
              { x: 541, z: -357, l: 'iStore' },
              { x: 562, z: -357, l: 'ATM' },
            ]
          : mallFloor === 1
          ? [
              { x: 478, z: -413, l: 'StarTech' },
              { x: 499, z: -413, l: 'Xiaomi' },
              { x: 541, z: -413, l: 'TimeZone' },
              { x: 562, z: -413, l: 'Batighar' },
              { x: 478, z: -357, l: 'Walton' },
              { x: 499, z: -357, l: 'Diamond' },
              { x: 541, z: -357, l: 'Shajgoj' },
              { x: 562, z: -357, l: 'Infinity' },
            ]
          : [
              { x: 488, z: -413, l: 'CINEMA' },
              { x: 552, z: -413, l: 'ARCADE' },
              { x: 478, z: -357, l: 'KFC' },
              { x: 499, z: -357, l: 'PizzaHut' },
              { x: 541, z: -357, l: 'Coffee' },
              { x: 562, z: -357, l: 'Kacchi' },
            ];

      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      shops.forEach((s) => {
        const sp = toM(s.x, s.z);
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(sp.rx - 10, sp.rz - 6, 20, 12);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(s.l, sp.rx, sp.rz + 2.5);
      });

      // South Exit Door Marker
      const ex = toM(520, -349);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(ex.rx - 8, ex.rz - 2, 16, 4);

      // Player Arrow
      ctx.save();
      ctx.rotate(-playerRotation + Math.PI);
      ctx.fillStyle = '#22d3ee';
      ctx.strokeStyle = '#083344';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      return;
    }

    const scale = 0.62; // World meters to radar pixels

    // Radar dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(half, half);

    const worldToRadar = (wx: number, wz: number) => ({
      rx: (wx - playerX) * scale,
      rz: (wz - playerZ) * scale,
    });

    // Draw Water Bodies (exact match to DhakaCityEngine.isPositionInWater)
    ctx.fillStyle = '#0e7490';
    const buri = worldToRadar(-950, 303.5);
    ctx.fillRect(buri.rx, buri.rz, 1900 * scale, 143.5 * scale);
    const hatir = worldToRadar(165, -80);
    ctx.fillRect(hatir.rx, hatir.rz, 110 * scale, 150 * scale);
    const dhan = worldToRadar(-265, -35);
    ctx.fillRect(dhan.rx, dhan.rz, 82 * scale, 120 * scale);
    const gulshan = worldToRadar(280, -290);
    ctx.fillRect(gulshan.rx, gulshan.rz, 100 * scale, 160 * scale);
    const uttaraLake = worldToRadar(-220, -600);
    ctx.fillRect(uttaraLake.rx, uttaraLake.rz, 80 * scale, 120 * scale);

    // Draw Dhaka Green Parks (Ramna Park, Suhrawardy Udyan, Chandrima Udyan)
    ctx.fillStyle = '#065f46';
    [
      { x: -149, z: -73, w: 68, d: 56 },
      { x: -102, z: 96, w: 54, d: 48 },
      { x: 86, z: 19, w: 58, d: 52 },
    ].forEach((pk) => {
      const p = worldToRadar(pk.x, pk.z);
      ctx.fillRect(p.rx, p.rz, pk.w * scale, pk.d * scale);
    });

    // Jamuna Future Park footprint highlight
    const jfpR = worldToRadar(464, -421);
    ctx.fillStyle = '#6b21a8';
    ctx.fillRect(jfpR.rx, jfpR.rz, 112 * scale, 72 * scale);

    // Draw Exact Dhaka Metropolitan Road Grid (matching DhakaCityEngine.NS_ROADS & EW_ROADS)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;

    const nsRoads = [-950, -780, -580, -480, -380, -170, 0, 220, 440, 640, 840, 950];
    nsRoads.forEach((rx) => {
      const p1 = worldToRadar(rx, -1400);
      const p2 = worldToRadar(rx, 800);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });

    // Draw MRT Line-6 (North-South: Uttara Diabari - Mirpur - Farmgate - Kamalapur)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.0;
    ctx.setLineDash([5, 3]);
    const m1 = worldToRadar(-12.2, -1250);
    const m2 = worldToRadar(-12.2, 460);
    ctx.beginPath();
    ctx.moveTo(m1.rx, m1.rz);
    ctx.lineTo(m2.rx, m2.rz);
    ctx.stroke();

    // Draw MRT Line-5 Northern Route (East-West: Mirpur West - Mirpur-10 - Gulshan-2 - Purbachal)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.0;
    ctx.setLineDash([5, 3]);
    const m5_1 = worldToRadar(-480, -175);
    const m5_2 = worldToRadar(640, -175);
    ctx.beginPath();
    ctx.moveTo(m5_1.rx, m5_1.rz);
    ctx.lineTo(m5_2.rx, m5_2.rz);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Metro Station Dots & Mirpur-10 Grand Interchange on Radar
    const radarStations = [
      { x: -12.2, z: -1150, color: '#10b981' },
      { x: -12.2, z: -850, color: '#10b981' },
      { x: -12.2, z: -520, color: '#10b981' },
      { x: -12.2, z: -15, color: '#10b981' },
      { x: -12.2, z: 160, color: '#10b981' },
      { x: -12.2, z: 330, color: '#10b981' },
      { x: -12.2, z: 450, color: '#10b981' },
      { x: -380, z: -175, color: '#f43f5e' },
      { x: 95, z: -175, color: '#f43f5e' },
      { x: 260, z: -175, color: '#f43f5e' },
      { x: 460, z: -175, color: '#f43f5e' },
    ];
    radarStations.forEach((st) => {
      const sp = worldToRadar(st.x, st.z);
      if (Math.hypot(sp.rx, sp.rz) < half - 6) {
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.arc(sp.rx, sp.rz, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Mirpur-10 Grand Interchange Hub (Line-6 & Line-5 cross point)
    const hubP = worldToRadar(-12.2, -175);
    if (Math.hypot(hubP.rx, hubP.rz) < half - 6) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(hubP.rx, hubP.rz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw District Labels on Radar
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    DISTRICTS.forEach((d) => {
      const dp = worldToRadar(d.center.x, d.center.z);
      if (Math.abs(dp.rx) < half - 10 && Math.abs(dp.rz) < half - 10) {
        ctx.fillText(language === 'en' ? d.nameEn : d.nameBn, dp.rx, dp.rz);
      }
    });

    // Old Dhaka Alleyways & Purbachal Expressway
    ctx.lineWidth = 4.5;
    const od1 = worldToRadar(-70, 85);
    const od2 = worldToRadar(-70, 290);
    ctx.beginPath();
    ctx.moveTo(od1.rx, od1.rz);
    ctx.lineTo(od2.rx, od2.rz);
    ctx.stroke();

    ctx.lineWidth = 6;
    const ewRoads = [-1400, -1100, -850, -620, -460, -315, -175, 0, 175, 240, 285, 460];
    ewRoads.forEach((rz) => {
      const p1 = worldToRadar(-950, rz);
      const p2 = worldToRadar(950, rz);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });

    // Draw Points of Interest dots
    POINTS_OF_INTEREST.forEach((poi) => {
      const pt = worldToRadar(poi.x, poi.z);
      ctx.fillStyle =
        poi.type === 'safe_house'
          ? '#10b981'
          : poi.type === 'garage'
          ? '#38bdf8'
          : '#f59e0b';
      ctx.beginPath();
      ctx.arc(pt.rx, pt.rz, 3.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw GPS Route Line & Target Marker for Active Mission or Custom Waypoint
    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const mission = allMissions.find((m) => m.id === activeMissionId);
    const step = mission ? mission.steps[activeMissionStepIndex] : null;

    const target = activeFareJob
      ? { x: activeFareJob.dropX, z: activeFareJob.dropZ, color: '#22c55e' }
      : step
      ? { x: step.targetX, z: step.targetZ, color: '#facc15' }
      : customWaypoint
      ? { x: customWaypoint.x, z: customWaypoint.z, color: '#ec4899' }
      : null;

    if (target) {
      const tp = worldToRadar(target.x, target.z);

      // L-shaped road-hugging GPS line from center (0,0) to target
      ctx.strokeStyle = target.color;
      ctx.lineWidth = 3.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tp.rx, 0);
      ctx.lineTo(tp.rx, tp.rz);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clamp pulsing target blip to radar edge if far away
      const clampedX = Math.max(-half + 14, Math.min(half - 14, tp.rx));
      const clampedZ = Math.max(-half + 14, Math.min(half - 14, tp.rz));

      ctx.fillStyle = target.color;
      ctx.beginPath();
      ctx.arc(clampedX, clampedZ, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Directional GPS Chevron Needle at Radar Edge
      const targetDist = Math.hypot(tp.rx, tp.rz);
      if (targetDist > half - 20) {
        const angle = Math.atan2(tp.rz, tp.rx);
        const edgeX = Math.cos(angle) * (half - 10);
        const edgeZ = Math.sin(angle) * (half - 10);

        ctx.save();
        ctx.translate(edgeX, edgeZ);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = target.color;
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(5, 4.5);
        ctx.lineTo(0, 1.5);
        ctx.lineTo(-5, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw Player Directional Arrow at Center
    ctx.save();
    ctx.rotate(-playerRotation + Math.PI);
    ctx.fillStyle = '#22d3ee';
    ctx.strokeStyle = '#083344';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [
    playerX,
    playerZ,
    playerRotation,
    activeMissionId,
    activeMissionStepIndex,
    customWaypoint,
    isInsideMall,
    mallFloor,
    activeFareJob,
  ]);

  const districtObj =
    DISTRICTS.find((d) => d.id === currentDistrict) || DISTRICTS[0];

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div
        onClick={() => setGamePhase('paused', 'map')}
        title="Click or press [M] to open full Dhaka GPS Map"
        className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-2 cursor-pointer shadow-2xl transition-all group ${
          wantedLevel > 0
            ? 'border-red-500 shadow-red-900/50 animate-pulse'
            : 'border-emerald-500/80 shadow-black/80 hover:border-amber-400'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={192}
          height={192}
          className="w-full h-full block"
        />

        {/* North Badge */}
        <div className="absolute top-2 left-2 bg-slate-950/85 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
          <Compass className="w-3 h-3" /> N
        </div>

        {/* Shortcuts: [M] Missions & [Tab] Map */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGamePhase('paused', 'missions');
            }}
            title="Open Mission Menu [M]"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 transition-colors"
          >
            📜 [M]
          </button>
          <div className="bg-slate-950/85 group-hover:bg-emerald-600 group-hover:text-white text-slate-200 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-0.5 transition-colors">
            <MapIcon className="w-2.5 h-2.5" /> [Tab]
          </div>
        </div>

        {/* District Footer Strip */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-2.5 py-1.5 flex items-center justify-between">
          <div className="truncate">
            <p className="text-[11px] font-bold text-white leading-tight truncate">
              {language === 'en' ? districtObj.nameEn : districtObj.nameBn}
            </p>
            <p className="text-[9px] text-emerald-400 font-medium truncate">
              {language === 'en' ? districtObj.vibeEn : districtObj.vibeBn}
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 ml-1">
            {Math.round(playerX)},{Math.round(playerZ)}
          </span>
        </div>
      </div>

      {/* GTA V-Style Integrated Vitals Bars (Health, Armor, Stamina) */}
      <div className="flex flex-col gap-1 w-full px-0.5">
        <div className="flex items-center gap-1.5 w-full">
          {/* Health Bar (Emerald Green) */}
          <div className="flex-1 bg-slate-950/90 h-1.5 rounded-full overflow-hidden border border-slate-800 shadow-sm">
            <div
              className="bg-emerald-400 h-full transition-all duration-150"
              style={{
                width: `${Math.max(0, Math.min(100, (health / maxHealth) * 100))}%`,
              }}
            />
          </div>
          {/* Armor Bar (Cyan Blue - only visible when armor exists) */}
          {armor > 0 && (
            <div className="flex-1 bg-slate-950/90 h-1.5 rounded-full overflow-hidden border border-slate-800 shadow-sm">
              <div
                className="bg-cyan-400 h-full transition-all duration-150"
                style={{
                  width: `${Math.max(0, Math.min(100, (armor / maxArmor) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>
        {/* Stamina Bar (Amber - only displays when sprinting or recovering) */}
        {stamina < 98 && (
          <div className="w-full bg-slate-950/90 h-1 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-amber-400 h-full transition-all duration-150"
              style={{
                width: `${Math.max(0, Math.min(100, stamina))}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
