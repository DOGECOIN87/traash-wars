// Use client directive is required for Next.js pages that rely on React hooks
'use client';

/*
 * Game constants for Gorbagana: Trash Wars
 * These values control the behaviour of players, trash, viruses and other
 * entities within the game world. They mirror the constants from the
 * original Vite project so that the game plays identically when embedded
 * inside the Next.js PVP dApp.
 */

export const WORLD_SIZE = 5000;
export const BASE_PLAYER_MASS = 30;
export const MAX_CELLS_PER_PLAYER = 16;
export const VIRUS_MASS = 150;
export const EJECT_MASS = 10;
export const EJECT_COST = 5;
export const MIN_MASS_SPLIT = 40;
export const MIN_MASS_EJECT = 35;
export const TRASH_COUNT = 250;
export const BOT_COUNT = 15;
export const INERTIA = 0.85;
export const DECAY_RATE = 0.002;
export const BASE_SPEED = 4;

// List of preset player colours. These were designed to be neon‑like and
// contrast nicely against the dark game board. Each entry has a human
// friendly name as well as its hex value.
export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Amber', hex: '#f59e0b' },
];

// Bot names and skins give life to the AI controlled opponents. Skins can
// either be emojis or data URIs pointing at images. Feel free to extend
// this array to introduce additional bots.
export const BOT_NAMES = [
  'DegenZero',
  'TrashLord',
  'MoonChild',
  'RektRaccoon',
  'FomoFiend',
  'WagmiWolf',
  'PaperHands',
  'DiamondPaws',
  'ApeEscrow',
  'SlurpJuice',
  'GigaRat',
  'PumpPapa',
  'DumpDaddy',
  'RuggedRich',
  'HodlHomer',
];

export const BOT_SKINS = [
  '🦝',
  '🐀',
  '🦄',
  '🐉',
  '👾',
  '🤖',
  '👽',
  '🐲',
  '🕹️',
  '🐍',
  '🦂',
  '🐉',
  '🦕',
  '🦎',
  '🐢',
];

// Trash types define the different pieces of rubbish floating in space.
// Each type has a probability of spawning, a colour for the particle, a
// type label and value (which translates directly into mass when consumed).
export const TRASH_TYPES = [
  { type: 'banana', value: 20, color: '#facc15', probability: 0.05 },
  { type: 'bone', value: 10, color: '#ffffff', probability: 0.1 },
  { type: 'can', value: 5, color: '#3b82f6', probability: 0.2 },
  { type: 'spoon', value: 2, color: '#a3a3a3', probability: 0.2 },
  { type: 'dust', value: 1, color: '#6b7280', probability: 0.45 },
];

/*
 * Convert between mass and radius. Agar‑like games use mass and radius
 * interchangeably depending on the context. We maintain these helpers here
 * rather than recomputing the square roots everywhere in the game loop.
 */
export const massToRadius = (mass: number) => Math.sqrt(mass / Math.PI) * 10;
export const radiusToMass = (radius: number) => Math.PI * Math.pow(radius / 10, 2);