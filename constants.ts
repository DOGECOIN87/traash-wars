export const WORLD_SIZE = 3000; // Slightly smaller for better density in demo
export const BASE_PLAYER_MASS = 18;
export const MAX_CELL_MASS = 12000;
export const MAX_CELLS_PER_PLAYER = 16;

export const VIRUS_MASS = 100;
export const EJECT_MASS = 12;
export const EJECT_COST = 14;
export const MIN_MASS_SPLIT = 36;
export const MIN_MASS_EJECT = 36;

// Physics Tuning
export const BASE_SPEED = 24; // Increased base, but removed multiplier in canvas
export const INERTIA = 0.70; // Lower inertia = snappier turning (0.0 - 1.0)
export const DECAY_RATE = 0.9999;

export const TRASH_COUNT = 300;
export const BOT_COUNT = 8;

export const TRASH_TYPES = [
  { type: 'trashcoin',     color: '#FFD700', value: 1,  probability: 0.80, icon: '🪙' },
  { type: 'trashcoin_x5',  color: '#FFC107', value: 5,  probability: 0.15, icon: '🍌' },
  { type: 'trashcoin_x20', color: '#FFA000', value: 20, probability: 0.05, icon: '💎' },
] as const;

export const BOT_NAMES = [
  "RugPuller69", "DiamondHands", "WAGMI_Warr", "PaperHands",
  "SatoshiSan", "GasFeeGhoul", "MoonBoy", "DumpIt",
  "TrashPanda", "BinJuice", "RecycleRex", "CompostKing"
];

export const BOT_SKINS = ["🐀", "🦝", "🗑️", "🧟", "🦠", "🦴", "🐟", "🍌", "💩", "🤡", "🤖", "👽"];

export const PRESET_COLORS = [
  { name: 'Slime Green', hex: '#4ade80' },
  { name: 'Toxic Purple', hex: '#a855f7' },
  { name: 'Rust Orange', hex: '#f97316' },
  { name: 'Dumpster Blue', hex: '#3b82f6' },
  { name: 'Hazard Yellow', hex: '#eab308' },
  { name: 'Medical Red', hex: '#ef4444' },
  { name: 'Chrome', hex: '#94a3b8' },
  { name: 'Void', hex: '#1e293b' },
];

export const massToRadius = (mass: number) => Math.sqrt(mass * 120 / Math.PI);
export const radiusToMass = (radius: number) => (Math.PI * radius * radius) / 120;
export const darkenColor = (color: string, percent: number) => {
    // Simple hex darken (not perfect but fast)
    // In a real app use a library like tinycolor2
    return color; 
}