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
  } = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size / 2;
    const scale = 0.62; // World meters to radar pixels

    ctx.clearRect(0, 0, size, size);

    // Radar dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(half, half);

    const worldToRadar = (wx: number, wz: number) => ({
      rx: (wx - playerX) * scale,
      rz: (wz - playerZ) * scale,
    });

    // Draw Water Bodies (Buriganga, Hatirjheel, Dhanmondi Lake)
    ctx.fillStyle = '#0e7490';
    // Buriganga River
    const buri = worldToRadar(-450, 300);
    ctx.fillRect(buri.rx, buri.rz, 900 * scale, 140 * scale);
    // Hatirjheel
    const hatir = worldToRadar(165, -80);
    ctx.fillRect(hatir.rx, hatir.rz, 110 * scale, 155 * scale);
    // Dhanmondi Lake
    const dhan = worldToRadar(-265, -35);
    ctx.fillRect(dhan.rx, dhan.rz, 85 * scale, 125 * scale);

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

    // Draw Main Dhaka Road Grid
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 7;

    const nsRoads = [-170, 0, 220];
    nsRoads.forEach((rx) => {
      const p1 = worldToRadar(rx, -350);
      const p2 = worldToRadar(rx, 295);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });

    // Draw MRT Line-6 Dhaka Metro Rail Viaduct Line (Agargaon - Farmgate - Motijheel)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    const m1 = worldToRadar(-12, -260);
    const m2 = worldToRadar(-12, 240);
    ctx.beginPath();
    ctx.moveTo(m1.rx, m1.rz);
    ctx.lineTo(m2.rx, m2.rz);
    ctx.stroke();
    ctx.setLineDash([]);

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

    // Old Dhaka Alley
    ctx.lineWidth = 4.5;
    const od1 = worldToRadar(-70, 85);
    const od2 = worldToRadar(-70, 290);
    ctx.beginPath();
    ctx.moveTo(od1.rx, od1.rz);
    ctx.lineTo(od2.rx, od2.rz);
    ctx.stroke();

    ctx.lineWidth = 7;
    const ewRoads = [-315, -175, 0, 175, 285];
    ewRoads.forEach((rz) => {
      const p1 = worldToRadar(-350, rz);
      const p2 = worldToRadar(350, rz);
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

    const target = step
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

        {/* Full Map Shortcut Badge */}
        <div className="absolute top-2 right-2 bg-slate-950/85 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 transition-colors">
          <MapIcon className="w-3 h-3" /> [M]
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
