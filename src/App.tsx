import React, { useEffect, useRef } from 'react';
import { DhakaCityEngine } from './engine/DhakaCityEngine';
import { useGameStore } from './store/useGameStore';
import { MainMenuScreen } from './components/MainMenuScreen';
import { GameHUD } from './components/GameHUD';
import { PauseMenuModal } from './components/PauseMenuModal';

export const App: React.FC = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DhakaCityEngine | null>(null);
  const gamePhase = useGameStore((s) => s.gamePhase);

  useEffect(() => {
    if (!viewportRef.current) return;
    const engine = new DhakaCityEngine(viewportRef.current);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleTriggerAction = (
    action: 'interact' | 'horn' | 'attack' | 'jump' | 'camera' | 'aim'
  ) => {
    engineRef.current?.triggerTouchAction(action);
  };

  const handleVirtualMove = (forward: number, right: number, sprint = false) => {
    engineRef.current?.setVirtualMove(forward, right, sprint);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Real-time 3D WebGL Dhaka City Canvas */}
      <div
        ref={viewportRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* UI Overlays based on Game Phase */}
      {gamePhase === 'main_menu' && <MainMenuScreen />}
      {gamePhase === 'playing' && (
        <GameHUD
          onTriggerAction={handleTriggerAction}
          onVirtualMove={handleVirtualMove}
        />
      )}
      {gamePhase === 'paused' && <PauseMenuModal />}
    </div>
  );
};

export default App;
