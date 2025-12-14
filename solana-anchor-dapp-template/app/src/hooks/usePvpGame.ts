'use client';

import { useMemo, useCallback } from 'react';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import idl from '@/idl/pvp_game.json';

/**
 * Default treasury public key for the platform. This constant represents
 * the on-chain account where platform fees are collected. If you want
 * to change the treasury address for your own deployment, update this
 * value to the desired `Pubkey.toBase58()` string. See the README for
 * details on how the treasury works.
 */
export const TREASURY_PUBLIC_KEY = new PublicKey(
  '4iK193yb5zu1BczkSM1mHDv6awt25vwNowPnCczKJfCC'
);

// Program ID - update after deploying (env takes precedence)
const resolveProgramId = () => {
  const programIdFromEnv = process.env.NEXT_PUBLIC_PROGRAM_ID;
  const candidate = programIdFromEnv || (idl as { address?: string }).address || '';
  try {
    return new PublicKey(candidate);
  } catch (error) {
    console.warn(
      'Invalid or missing program id. Set NEXT_PUBLIC_PROGRAM_ID or update src/idl/pvp_game.json'
    );
    return PublicKey.default;
  }
};

const PROGRAM_ID = resolveProgramId();

// Seeds used for PDA derivation
const PLATFORM_CONFIG_SEED = 'platform_config';
const MATCH_SEED = 'match';
const ESCROW_SEED = 'escrow';

export interface MatchData {
  publicKey: PublicKey;
  matchId: number[];
  player1: PublicKey;
  player2?: PublicKey | null;
  stakeAmount: BN | number;
  status: any;
  winner?: PublicKey | null;
  createdAt?: BN;
  startedAt?: BN;
  endedAt?: BN;
  feeAmount?: BN;
  prizeAmount?: BN;
}

export interface PlatformStats {
  totalMatches: BN;
  matchesCompleted: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  feeBps: number;
  paused: boolean;
}

/**
 * Custom React hook that exposes convenient helpers for interacting with
 * the PVP game on Solana. It wraps the Anchor program client and
 * provides methods for creating and joining matches, submitting results
 * and claiming winnings. The hook is intentionally scoped to the
 * browser (client-side) via the `use client` directive.
 */
export function usePvpGame() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  // Create provider and program
  const provider = useMemo(() => {
    if (!anchorWallet) return null;
    return new AnchorProvider(connection, anchorWallet, {
      preflightCommitment: 'processed',
      commitment: 'confirmed',
    });
  }, [connection, anchorWallet]);

  const program = useMemo(() => {
    if (!provider || PROGRAM_ID.equals(PublicKey.default)) return null;
    return new Program(idl as Idl, PROGRAM_ID, provider);
  }, [provider]);

  // Derive platform config PDA
  const platformConfigPDA = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PLATFORM_CONFIG_SEED)],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Derive match PDA from match ID
  const getMatchPDA = useCallback((matchId: Uint8Array) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(MATCH_SEED), matchId],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Derive escrow PDA from match PDA
  const getEscrowPDA = useCallback((matchPDA: PublicKey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(ESCROW_SEED), matchPDA.toBuffer()],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Generate random match ID
  const generateMatchId = useCallback(() => {
    return crypto.getRandomValues(new Uint8Array(32));
  }, []);

  // Fetch platform stats
  const fetchPlatformStats = useCallback(async (): Promise<PlatformStats | null> => {
    if (!program) return null;
    try {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      return {
        totalMatches: config.totalMatches,
        matchesCompleted: config.matchesCompleted,
        totalVolume: config.totalVolume,
        totalFeesCollected: config.totalFeesCollected,
        feeBps: config.feeBps,
        paused: config.paused,
      };
    } catch (error) {
      console.log('Platform not initialized:', error);
      return null;
    }
  }, [program, platformConfigPDA]);

  // Fetch all open matches (waiting for opponent)
  const fetchOpenMatches = useCallback(async (): Promise<MatchData[]> => {
    if (!program) return [];
    try {
      const matches = await program.account.gameMatch.all();
      return matches
        .map((m) => ({
          publicKey: m.publicKey,
          ...m.account,
        })) as MatchData[];
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }, [program]);

  // Fetch matches for current user
  const fetchMyMatches = useCallback(async (): Promise<MatchData[]> => {
    if (!program || !publicKey) return [];
    try {
      const allMatches = await program.account.gameMatch.all();
      return allMatches
        .filter(
          (m) =>
            m.account.player1.equals(publicKey) ||
            m.account.player2.equals(publicKey)
        )
        .map((m) => ({
          publicKey: m.publicKey,
          ...m.account,
        })) as MatchData[];
    } catch (error) {
      console.error('Error fetching my matches:', error);
      return [];
    }
  }, [program, publicKey]);

  // Fetch single match by ID
  const fetchMatch = useCallback(
    async (matchPDA: PublicKey): Promise<MatchData | null> => {
      if (!program) return null;
      try {
        const match = await program.account.gameMatch.fetch(matchPDA);
        return {
          publicKey: matchPDA,
          ...match,
        } as MatchData;
      } catch (error) {
        console.error('Error fetching match:', error);
        return null;
      }
    },
    [program]
  );

  // Create a new match
  const createMatch = useCallback(
    async (stakeAmountSol: number): Promise<{ tx: string; matchId: Uint8Array; matchPDA: PublicKey }> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const matchId = generateMatchId();
      const matchPDA = getMatchPDA(matchId);
      const escrowPDA = getEscrowPDA(matchPDA);
      const stakeAmount = new BN(Math.round(stakeAmountSol * LAMPORTS_PER_SOL));

      const tx = await program.methods
        .createMatch(stakeAmount, Array.from(matchId))
        .accounts({
          platformConfig: platformConfigPDA,
          gameMatch: matchPDA,
          escrow: escrowPDA,
          player1: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { tx, matchId, matchPDA };
    },
    [program, publicKey, platformConfigPDA, generateMatchId, getMatchPDA, getEscrowPDA]
  );

  // Join an existing match
  const joinMatch = useCallback(
    async (matchPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const escrowPDA = getEscrowPDA(matchPDA);

      const tx = await program.methods
        .joinMatch()
        .accounts({
          platformConfig: platformConfigPDA,
          gameMatch: matchPDA,
          escrow: escrowPDA,
          player2: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    },
    [program, publicKey, platformConfigPDA, getEscrowPDA]
  );

  // Cancel a match (only if no opponent)
  const cancelMatch = useCallback(
    async (matchPDA: PublicKey): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const escrowPDA = getEscrowPDA(matchPDA);

      const tx = await program.methods
        .cancelMatch()
        .accounts({
          gameMatch: matchPDA,
          escrow: escrowPDA,
          player1: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    },
    [program, publicKey, getEscrowPDA]
  );

  /**
   * Claim winnings for a completed match. If the caller is the winner
   * they receive the prize and the platform fee is sent to the
   * treasury. The `treasuryPubkey` parameter is optional; when not
   * provided the default `TREASURY_PUBLIC_KEY` constant will be used.
   */
  const claimWinnings = useCallback(
    async (
      matchPDA: PublicKey,
      treasuryPubkey?: PublicKey
    ): Promise<string> => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      const escrowPDA = getEscrowPDA(matchPDA);
      const treasuryKey = treasuryPubkey ?? TREASURY_PUBLIC_KEY;

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          platformConfig: platformConfigPDA,
          gameMatch: matchPDA,
          escrow: escrowPDA,
          treasury: treasuryKey,
          winner: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    },
    [program, publicKey, platformConfigPDA, getEscrowPDA]
  );

  return {
    program,
    provider,
    platformConfigPDA,
    getMatchPDA,
    getEscrowPDA,
    generateMatchId,
    fetchPlatformStats,
    fetchOpenMatches,
    fetchMyMatches,
    fetchMatch,
    createMatch,
    joinMatch,
    cancelMatch,
    claimWinnings,
  };
}
