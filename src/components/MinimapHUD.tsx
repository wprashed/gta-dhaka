import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
  DHAKA_GAME_LOCATIONS,
  DISTRICTS,
  POINTS_OF_INTEREST,
  SIDE_MISSIONS,
  STORY_MISSIONS,
} from '../data/dhakaWorldData';
import { Compass, Crosshair, Map as MapIcon, ShieldAlert } from 'lucide-react';

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
    discoveredLocations,
    wantedLevel,
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

    // Monsoon Underworld Pitch Bitumen Asphalt Base
    ctx.fillStyle = '#0b0e13';
    ctx.fillRect(0, 0, size, size);

    // Subtle tactical grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let g = 16; g < size; g += 32) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(size, g);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(half, half);

    const worldToRadar = (wx: number, wz: number) => ({
      rx: (wx - playerX) * scale,
      rz: (wz - playerZ) * scale,
    });

    // Draw Water Bodies (Buriganga, Hatirjheel, Dhanmondi Lake) in Electric Neon Blue
    ctx.fillStyle = '#00363d';
    // Buriganga River
    const buri = worldToRadar(-450, 300);
    ctx.fillRect(buri.rx, buri.rz, 900 * scale, 140 * scale);
    // Hatirjheel
    const hatir = worldToRadar(165, -80);
    ctx.fillRect(hatir.rx, hatir.rz, 110 * scale, 155 * scale);
    // Dhanmondi Lake
    const dhan = worldToRadar(-265, -35);
    ctx.fillRect(dhan.rx, dhan.rz, 85 * scale, 125 * scale);

    // Draw Main Dhaka Road Grid (Wet Bitumen Slate)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;

    const nsRoads = [-170, 0, 220];
    nsRoads.forEach((rx) => {
      const p1 = worldToRadar(rx, -350);
      const p2 = worldToRadar(rx, 295);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });

    // Old Dhaka Alleyway
    ctx.lineWidth = 5;
    const od1 = worldToRadar(-70, 85);
    const od2 = worldToRadar(-70, 290);
    ctx.beginPath();
    ctx.moveTo(od1.rx, od1.rz);
    ctx.lineTo(od2.rx, od2.rz);
    ctx.stroke();

    ctx.lineWidth = 8;
    const ewRoads = [-315, -175, 0, 175, 285];
    ewRoads.forEach((rz) => {
      const p1 = worldToRadar(-350, rz);
      const p2 = worldToRadar(350, rz);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });

    // Road Centerlines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    nsRoads.forEach((rx) => {
      const p1 = worldToRadar(rx, -350);
      const p2 = worldToRadar(rx, 295);
      ctx.beginPath();
      ctx.moveTo(p1.rx, p1.rz);
      ctx.lineTo(p2.rx, p2.rz);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw Points of Interest dots with tactical glows
    POINTS_OF_INTEREST.forEach((poi) => {
      const pt = worldToRadar(poi.x, poi.z);
      ctx.fillStyle =
        poi.type === 'safe_house'
          ? '#00ff66'
          : poi.type === 'garage'
          ? '#ffb703'
          : poi.type === 'biriyani_shop'
          ? '#f43f5e'
          : poi.type === 'clothing_shop'
          ? '#a855f7'
          : '#38bdf8';
      ctx.beginPath();
      ctx.arc(pt.rx, pt.rz, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw 16 Authentic Dhaka Landmark Blips (Gold Diamonds)
    DHAKA_GAME_LOCATIONS.forEach((loc) => {
      const pt = worldToRadar(loc.x, loc.z);
      const isDiscovered = discoveredLocations.includes(loc.id);
      ctx.fillStyle = isDiscovered ? '#f59e0b' : 'rgba(148, 163, 184, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pt.rx, pt.rz - 3.8);
      ctx.lineTo(pt.rx + 3.8, pt.rz);
      ctx.lineTo(pt.rx, pt.rz + 3.8);
      ctx.lineTo(pt.rx - 3.8, pt.rz);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isDiscovered ? '#fef08a' : '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw Active Mission Objective or Custom Waypoint
    let target: { x: number; z: number; color: string } | null = null;
    const allMissions = [...STORY_MISSIONS, ...SIDE_MISSIONS];
    const mission = allMissions.find((m) => m.id === activeMissionId);
    if (mission && mission.steps[activeMissionStepIndex]) {
      const step = mission.steps[activeMissionStepIndex];
      target = { x: step.targetX, z: step.targetZ, color: '#ffb703' };
    } else if (customWaypoint) {
      target = { x: customWaypoint.x, z: customWaypoint.z, color: '#00e5ff' };
    }

    if (target) {
      const tp = worldToRadar(target.x, target.z);

      // Tactical GPS line from player to target
      ctx.strokeStyle = target.color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tp.rx, 0);
      ctx.lineTo(tp.rx, tp.rz);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target blip
      const clampedX = Math.max(-half + 14, Math.min(half - 14, tp.rx));
      const clampedZ = Math.max(-half + 14, Math.min(half - 14, tp.rz));

      ctx.fillStyle = target.color;
      ctx.beginPath();
      ctx.arc(clampedX, clampedZ, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Concentric Tactical Range Rings
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Player Directional Arrow (CNG Green & Electric Blue)
    ctx.save();
    ctx.rotate(-playerRotation + Math.PI);
    ctx.fillStyle = '#00ff66';
    ctx.strokeStyle = '#0b0e13';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 7.5);
    ctx.lineTo(0, 3.8);
    ctx.lineTo(-7, 7.5);
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
    <div className="flex flex-col gap-1.5 select-none font-sans">
      <div
        onClick={() => setGamePhase('paused', 'map')}
        title="Click or press [M] to open full Dhaka Locations & GPS Map"
        className={`relative w-44 h-44 sm:w-48 sm:h-48 overflow-hidden cursor-pointer transition-all group tactical-chamfer border ${
          wantedLevel > 0
            ? 'border-red-500 glow-blood animate-pulse'
            : 'border-emerald-500/60 glow-cng hover:border-amber-400'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={192}
          height={192}
          className="w-full h-full block"
        />

        {/* Scanline CRT overlay effect */}
        <div className="absolute inset-0 scanlines pointer-events-none opacity-40" />

        {/* Tactical Corner Crosshairs */}
        <div className="absolute top-1 left-1 pointer-events-none text-emerald-400/60 font-mono text-[8px] flex items-center gap-0.5">
          <Crosshair className="w-2.5 h-2.5 text-emerald-400" />
          <span>RADAR://ACTIVE</span>
        </div>

        {/* North Compass Badge */}
        <div className="absolute top-2 right-12 bg-slate-950/90 text-amber-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-0.5">
          <Compass className="w-3 h-3 text-amber-400" /> N
        </div>

        {/* Full Map Shortcut Badge */}
        <div className="absolute top-2 right-2 bg-slate-950/90 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-0.5 transition-colors">
          <MapIcon className="w-3 h-3" /> [M]
        </div>

        {/* District Footer Telemetry Strip */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-2.5 py-1.5 flex items-center justify-between border-t border-slate-800/80">
          <div className="truncate min-w-0 pr-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <p className="text-[11px] font-display font-bold text-white leading-tight truncate">
                {language === 'en' ? districtObj.nameEn : districtObj.nameBn}
              </p>
            </div>
            <p className="text-[9px] text-amber-400 font-mono tracking-wider truncate">
              {districtObj.tacticalCode?.split('//')[0] || 'SEC-04'} • {language === 'en' ? districtObj.vibeEn : districtObj.vibeBn}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono font-bold text-cyan-300 block leading-tight">
              {Math.round(playerX)},{Math.round(playerZ)}
            </span>
            <span className="text-[8px] font-mono text-slate-400 uppercase">GRID</span>
          </div>
        </div>
      </div>
    </div>
  );
};
