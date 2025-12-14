// The game uses many shared type definitions to describe the state of
// objects within the world. Adding `use client` ensures Next.js treats
// this module as a client module when it is imported by client components.
'use client';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  CASHED_OUT = 'CASHED_OUT',
}

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector;
  radius: number;
  color: string;
  rotation: number;
  mass: number;
  z?: number;
}

export interface LootItem {
  id: string;
  type: 'trashcoin' | 'trashcoin_x5' | 'trashcoin_x20';
  name: string;
  icon: string;
  value: number;
  timestamp: number;
}

export interface Player extends Entity {
  name: string;
  velocity: Vector;
  ownerId: string; // 'hero' or bot ID
  isBot: boolean;
  skin: string; // Emoji or data URI

  // Mechanics
  creationTime: number;
  mergeTimestamp: number;
  invincibleUntil?: number;
  dashVector?: Vector;
  trashTalk?: string;
  trashTalkTimer?: number;
  impactScale?: number;

  loot: LootItem[];
}

export interface TrashItem extends Entity {
  type: 'trashcoin' | 'trashcoin_x5' | 'trashcoin_x20';
  value: number;
  pulseOffset: number;
}

export interface Virus extends Entity {
  spikes: number;
  fedMass: number;
}

export interface EjectedMass extends Entity {
  velocity: Vector;
  ownerId: string;
  creationTime: number;
}

export interface Portal extends Entity {
  state: 'SPAWNING' | 'OPEN' | 'CLOSING';
  timer: number;
  maxTimer: number;
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  velocity: Vector;
  color: string;
}

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface GameConfig {
  nickname: string;
  color: string;
  avatar: string;
  wager: number;
}