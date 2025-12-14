import type { BN } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';

export interface GameMatch {
  matchId: number[];
  player1: PublicKey;
  player2: PublicKey | null;
  stakeAmount: BN;
  status: number;
  winner: PublicKey | null;
  createdAt: BN;
  startedAt: BN;
  endedAt: BN;
  feeAmount: BN;
  prizeAmount: BN;
}

export interface PlatformConfig {
  totalMatches: BN;
  matchesCompleted: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  feeBps: number;
  paused: boolean;
}

export enum MatchState {
  Open = 0,
  InProgress = 1,
  Finished = 2,
}

// Minimal placeholder type so consumers can type Program<PvpGame>.
export type PvpGame = {
  address: string;
};
