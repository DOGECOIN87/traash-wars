// The game entry point. Declaring `use client` here allows us to use
// React state and hooks in this component when imported from a Next.js page.
'use client';

import React, { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { GameConfig, GameState } from './types';
import { useAudio } from './hooks/useAudio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [lastScore, setLastScore] = useState(0);
  const audio = useAudio();

  const handleStart = (cfg: GameConfig) => {
      setConfig(cfg);
      setGameState(GameState.PLAYING);
  };

  const handleGameOver = (score: number) => {
      setLastScore(score);
      setGameState(GameState.GAME_OVER);
  };

  const handleCashOut = (score: number) => {
      setLastScore(score);
      setGameState(GameState.CASHED_OUT);
      audio.playCashOut();
  };

  const resetGame = () => {
      setGameState(GameState.MENU);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white relative scanlines">
        
        {gameState === GameState.MENU && (
            <MainMenu onStart={handleStart} audio={audio} />
        )}

        {gameState === GameState.PLAYING && config && (
            <GameCanvas 
                config={config} 
                onGameOver={handleGameOver} 
                onCashOut={handleCashOut}
                audio={audio}
            />
        )}

        {(gameState === GameState.GAME_OVER || gameState === GameState.CASHED_OUT) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="glass-panel p-10 rounded-2xl text-center max-w-lg w-full border-t-4 border-b-4 border-transparent" style={{ borderColor: gameState === GameState.CASHED_OUT ? '#4ade80' : '#ef4444' }}>
                    <h1 className={`text-5xl font-black mb-4 ${gameState === GameState.CASHED_OUT ? 'text-green-400' : 'text-red-500'}`}>
                        {gameState === GameState.CASHED_OUT ? 'EXTRACTION SUCCESS' : 'ELIMINATED'}
                    </h1>
                    
                    <div className="my-8 space-y-4">
                        <div className="bg-white/5 p-4 rounded text-left">
                            <div className="text-xs text-gray-400">FINAL MASS</div>
                            <div className="text-3xl font-mono">{lastScore}</div>
                        </div>
                        
                        <div className="bg-white/5 p-4 rounded text-left">
                            <div className="text-xs text-gray-400">ESTIMATED EARNINGS</div>
                            <div className={`text-3xl font-mono ${gameState === GameState.CASHED_OUT ? 'text-yellow-400' : 'text-gray-600 line-through'}`}>
                                {config ? (lastScore / 100 * config.wager / 10).toFixed(2) : 0} SOL
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={resetGame}
                        className="w-full py-4 bg-white text-black font-bold hover:scale-105 transition-transform"
                    >
                        RETURN TO HUB
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}