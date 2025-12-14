import React, { useState, useEffect, useRef } from 'react';
import { GameConfig, GameState } from '../types';
import { PRESET_COLORS, BOT_SKINS } from '../constants';
import { useAudio } from '../hooks/useAudio';

interface MainMenuProps {
  onStart: (config: GameConfig) => void;
  audio: ReturnType<typeof useAudio>;
}

enum MenuStage {
  CONNECT = 'CONNECT',
  SETUP = 'SETUP',
  HUB = 'HUB'
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart, audio }) => {
  const [stage, setStage] = useState<MenuStage>(MenuStage.CONNECT);
  const [config, setConfig] = useState<GameConfig>({
    nickname: 'TrashPanda',
    color: PRESET_COLORS[0].hex,
    avatar: '🦝',
    wager: 10
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [bgElements, setBgElements] = useState<{id: number, text: string, x: number, y: number, speed: number, color: string, fontSize: number}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Background: Floating Trash/Crypto debris
  useEffect(() => {
    const phrases = ["HODL", "RUG", "GEM", "APE", "MOON", "DUMP", "PUMP", "GAS", "WAGMI", "NGMI", "REKT", "ROI", "FUD", "FOMO", "DAO", "MINT"];
    const icons = ["🍌", "🦴", "🥫", "💎", "Ξ", "🐀", "🗑️", "💊", "🚀", "💀"];
    
    const elements = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      text: Math.random() > 0.5 ? phrases[Math.floor(Math.random() * phrases.length)] : icons[Math.floor(Math.random() * icons.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      speed: (Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
      color: ['#ef4444', '#22c55e', '#eab308', '#ec4899', '#a855f7', '#3b82f6'][Math.floor(Math.random() * 6)],
      fontSize: Math.random() * 20 + 10
    }));
    setBgElements(elements);

    const interval = setInterval(() => {
        setBgElements(prev => prev.map(el => ({
            ...el,
            y: el.y - el.speed,
            x: el.x + Math.sin(el.y / 10) * 0.2 // Wiggle
        })).map(el => {
            if (el.y < -10) return { ...el, y: 110, x: Math.random() * 100 };
            if (el.y > 110) return { ...el, y: -10, x: Math.random() * 100 };
            return el;
        }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    audio.playClick();
    audio.initAudio();
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setStage(MenuStage.SETUP);
      audio.playCashOut(); 
    }, 1200);
  };

  const handleToHub = () => {
    audio.playClick();
    if (config.nickname.length > 0) {
        setStage(MenuStage.HUB);
    }
  };

  const handleStartGame = () => {
    audio.playClick();
    onStart(config);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setConfig({ ...config, avatar: reader.result });
          audio.playHover();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isImage = (avatar: string) => avatar.startsWith('data:') || avatar.startsWith('http');

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0a0a0f] text-white">
      
      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        {bgElements.map(el => (
            <div 
                key={el.id}
                className="absolute font-bold font-mono transition-transform duration-75"
                style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    color: el.color,
                    fontSize: `${el.fontSize}px`,
                    transform: `rotate(${el.y * 2}deg)`,
                    textShadow: `0 0 5px ${el.color}`
                }}
            >
                {el.text}
            </div>
        ))}
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6">
        
        {/* LOGO SECTION */}
        <div className="mb-8 text-center relative group">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
             
             <h1 className="relative text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform -skew-x-6 hover:scale-105 transition-transform cursor-default">
                GORBAGANA
             </h1>
             <div className="flex items-center justify-center gap-4 mt-2">
                 <div className="h-1 flex-1 bg-gradient-to-r from-transparent to-green-500" />
                 <h2 className="font-pixel text-xl md:text-2xl text-green-400 tracking-widest uppercase animate-pulse">
                    TRASH WARS
                 </h2>
                 <div className="h-1 flex-1 bg-gradient-to-l from-transparent to-green-500" />
             </div>
        </div>

        {/* CONNECT STAGE - Cyberpunk Wallet Style */}
        {stage === MenuStage.CONNECT && (
           <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.1)] overflow-hidden animate-[fadeIn_0.5s_ease-out] flex flex-col items-center max-w-xl mx-auto">
             {/* Decorative Corners */}
             <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500" />
             <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500" />
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500" />
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500" />

             {/* Mascot Image Removed Here */}
             
             <h3 className="text-2xl font-bold text-white mb-1">CONNECT WALLET</h3>
             <p className="font-mono text-[10px] tracking-widest text-green-400 mb-4 uppercase">
                by degen, for degen
             </p>
             <p className="font-mono text-gray-400 text-center text-sm mb-8 max-w-md uppercase">
                REAL PVP - PLATFORM 5% FEE
             </p>
             
             <button 
               onClick={handleConnect}
               disabled={isConnecting}
               className="relative group w-full max-w-sm px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
             >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                    {isConnecting ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            INITIALIZING...
                        </>
                    ) : "LINK WALLET"}
                </span>
             </button>
           </div>
        )}

        {/* SETUP STAGE - Arcade Character Select */}
        {stage === MenuStage.SETUP && (
            <div className="relative bg-black/60 backdrop-blur-2xl border-t-4 border-purple-500 border-l border-r border-b border-white/5 p-8 rounded-xl shadow-2xl animate-[slideUp_0.5s_ease-out]">
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <h3 className="font-pixel text-xl text-purple-400">IDENTITY CONFIG</h3>
                    <div className="text-xs font-mono text-gray-500">ID: {Math.floor(Math.random()*999999)}</div>
                </div>
                
                <div className="grid md:grid-cols-12 gap-8">
                    {/* Left Col: Preview Card */}
                    <div className="md:col-span-4 flex flex-col items-center justify-start bg-white/5 rounded-xl p-6 border border-white/5 backdrop-blur-md h-full relative overflow-hidden">
                        {/* Holographic effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/10 to-transparent pointer-events-none" />
                        
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div 
                                className="w-40 h-40 rounded-full border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:border-purple-400"
                                style={{ 
                                    backgroundColor: config.color,
                                    boxShadow: `0 0 40px ${config.color}40`
                                }}
                            >
                                {isImage(config.avatar) ? (
                                    <img src={config.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-7xl select-none">{config.avatar}</span>
                                )}
                                
                                {/* Overlay Edit Icon */}
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-sm font-bold uppercase tracking-wider">Change Img</span>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-2 right-2 bg-purple-600 rounded-full p-2 border border-white shadow-lg pointer-events-none">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </div>
                        </div>

                        <div className="mt-6 text-center w-full">
                            <div className="text-gray-400 text-xs font-mono mb-1">OPERATIVE ALIAS</div>
                            <div className="text-2xl font-bold uppercase tracking-wider text-white truncate px-2">{config.nickname || "UNKNOWN"}</div>
                            <div className="mt-2 text-xs font-mono text-green-400 bg-green-900/30 py-1 px-3 rounded-full inline-block border border-green-500/30">READY FOR DEPLOYMENT</div>
                        </div>

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>

                    {/* Right Col: Controls */}
                    <div className="md:col-span-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">Operative Name</label>
                            <input 
                                type="text" 
                                value={config.nickname}
                                onChange={(e) => setConfig({...config, nickname: e.target.value.slice(0, 14)})}
                                className="w-full bg-black/40 border border-purple-500/30 p-4 rounded-lg text-purple-200 font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all uppercase placeholder-purple-900/50 backdrop-blur-sm text-lg"
                                placeholder="ENTER ALIAS..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-pink-400 uppercase tracking-wider flex justify-between">
                                <span>Signal Signature (Color)</span>
                                <span className="text-gray-500 font-mono">HEX: {config.color}</span>
                            </label>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                {PRESET_COLORS.map(c => (
                                    <button 
                                        key={c.hex}
                                        onClick={() => {
                                            audio.playHover();
                                            setConfig({...config, color: c.hex});
                                        }}
                                        className={`h-10 rounded-lg border-2 transition-all hover:scale-110 active:scale-95 ${config.color === c.hex ? 'border-white ring-2 ring-white/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex justify-between items-center">
                                <span>Avatar Preset</span>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors text-white"
                                >
                                    UPLOAD CUSTOM IMAGE
                                </button>
                            </label>
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                                {BOT_SKINS.map(s => (
                                     <button 
                                        key={s}
                                        onClick={() => {
                                            audio.playHover();
                                            setConfig({...config, avatar: s});
                                        }}
                                        className={`aspect-square flex items-center justify-center rounded bg-white/5 border border-white/10 text-lg transition-all hover:bg-white/20 hover:scale-110 ${config.avatar === s ? 'border-yellow-400 bg-yellow-900/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : ''}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                         <button 
                            onClick={handleToHub}
                            className="mt-4 w-full py-4 bg-white/90 text-black font-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all rounded-lg uppercase tracking-widest text-lg flex items-center justify-center gap-2 group"
                        >
                            <span>Initialize Hub Link</span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* HUB STAGE - Trading Terminal */}
        {stage === MenuStage.HUB && (
            <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 p-1 rounded-xl shadow-2xl animate-[zoomIn_0.3s_ease-out] max-w-2xl mx-auto">
                {/* Terminal Header */}
                <div className="bg-black/50 px-4 py-2 rounded-t-lg flex justify-between items-center border-b border-white/5">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="text-xs font-mono text-gray-500">trash_wars_hub.exe</div>
                </div>

                <div className="p-8 space-y-8">
                    {/* User Summary */}
                    <div className="flex items-center gap-6 bg-white/5 p-4 rounded-lg border border-white/5 backdrop-blur-sm">
                         <div 
                            className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl shadow-lg border-2 border-white/10 overflow-hidden"
                            style={{ backgroundColor: config.color }}
                        >
                            {isImage(config.avatar) ? (
                                <img src={config.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                config.avatar
                            )}
                        </div>
                        <div className="flex-1">
                             <h3 className="text-2xl font-black uppercase tracking-wide text-white">{config.nickname}</h3>
                             <div className="flex gap-4 mt-1">
                                 <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30">ONLINE</span>
                                 <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">WAGER MODE</span>
                             </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400">BALANCE</div>
                            <div className="text-xl font-mono text-yellow-400">1,337.00 SOL</div>
                        </div>
                    </div>

                    {/* Wager Slider - Improved */}
                    <div className="space-y-4">
                         <div className="flex justify-between items-end border-b border-white/10 pb-2">
                            <label className="text-sm font-bold text-gray-300">WAGER ENTRY FEE</label>
                            <span className="text-3xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">{config.wager} SOL</span>
                        </div>
                        
                        <div className="relative h-12 flex items-center">
                            <input 
                                type="range" 
                                min="10" 
                                max="5000" 
                                step="10"
                                value={config.wager}
                                onChange={(e) => setConfig({...config, wager: parseInt(e.target.value)})}
                                className="w-full h-4 bg-gray-800/50 rounded-full appearance-none cursor-pointer accent-yellow-400 z-10 backdrop-blur-sm"
                            />
                            {/* Tick marks visual */}
                            <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                                {Array.from({length: 11}).map((_, i) => (
                                    <div key={i} className="w-0.5 h-2 bg-gray-700/50 mt-5" />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between text-xs font-mono">
                             <span className="text-green-500">SAFE (10)</span>
                             <span className="text-yellow-500">DEGEN (1000+)</span>
                             <span className="text-red-500">REKT (5000)</span>
                        </div>
                    </div>

                    {/* Big Launch Button */}
                    <button 
                       onClick={handleStartGame}
                       className="group relative w-full py-8 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-3xl tracking-widest uppercase transition-all overflow-hidden rounded-xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-[0.98]"
                    >
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] opacity-30" />
                        <span className="relative z-10 flex items-center justify-center gap-4 group-hover:scale-110 transition-transform">
                            <span>💀</span> DROP IN <span>💀</span>
                        </span>
                        {/* Shine effect */}
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out" />
                    </button>

                    <div className="text-center text-[10px] text-gray-600 font-mono">
                        WARNING: PROTOCOL ALPHA // ASSETS AT RISK // NO REFUNDS
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};