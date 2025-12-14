'use client';

import { FC, useMemo, useState } from 'react';
import { usePvpGame, MatchData, TREASURY_PUBLIC_KEY } from '@/hooks/usePvpGame';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

interface MatchCardProps {
  match: MatchData;
  onActionComplete?: () => void;
}

/**
 * Match card UI for open/active matches. It handles join/cancel/claim
 * flows and defers treasury handling to the hook (which supplies a
 * default). Status detection is defensive to accommodate different
 * IDL enum shapes.
 */
export const MatchCard: FC<MatchCardProps> = ({ match, onActionComplete }) => {
  const { publicKey } = useWallet();
  const { joinMatch, cancelMatch, claimWinnings } = usePvpGame();
  const [busy, setBusy] = useState(false);

  const normalizedStatus = useMemo(() => {
    const state = (match as any).state ?? match.status;
    if (typeof state === 'number') {
      return state;
    }
    if (typeof state === 'string') {
      const parsed = Number(state);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (state && typeof state === 'object') {
      if ('open' in state) return 0;
      if ('inProgress' in state) return 1;
      if ('finished' in state) return 2;
    }
    return 0;
  }, [match]);

  const player1 = (match as any).player1 ?? match.player1;
  const player2 = (match as any).player2 ?? match.player2;
  const winner = (match as any).winner ?? match.winner;
  const stakeAmount = (match as any).stakeAmount ?? (match as any).stake ?? 0;
  const stakeLamports =
    typeof stakeAmount === 'number' ? stakeAmount : 'toNumber' in stakeAmount ? stakeAmount.toNumber() : 0;

  const isPlayer1 = publicKey && player1 && publicKey.equals(player1 as PublicKey);
  const isPlayer2 = publicKey && player2 && publicKey.equals(player2 as PublicKey);
  const isOpen = normalizedStatus === 0;
  const isFinished = normalizedStatus === 2;

  const canJoin = isOpen && !isPlayer1 && !isPlayer2;
  const canCancel = isOpen && isPlayer1 && !isPlayer2;
  const canClaim = isFinished && winner && publicKey && (winner as PublicKey).equals(publicKey);

  const handleAction = async (action: 'join' | 'cancel' | 'claim') => {
    if (!match.publicKey) return;
    setBusy(true);
    try {
      if (action === 'join') await joinMatch(match.publicKey);
      if (action === 'cancel') await cancelMatch(match.publicKey);
      if (action === 'claim') await claimWinnings(match.publicKey, TREASURY_PUBLIC_KEY);
      onActionComplete?.();
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = () => {
    if (normalizedStatus === 0) return <span className="text-green-400">Open</span>;
    if (normalizedStatus === 1) return <span className="text-yellow-400">In Progress</span>;
    if (normalizedStatus === 2) return <span className="text-red-400">Finished</span>;
    return <span className="text-gray-500">Unknown</span>;
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between hover:border-[var(--primary-color)] transition-colors duration-300">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-[var(--subtext-color)]">Match Stake</p>
            <p className="text-2xl font-bold text-[var(--primary-color)]">
              {stakeLamports / LAMPORTS_PER_SOL} SOL
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--subtext-color)]">Status</p>
            <p className="font-bold">{statusLabel()}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold text-[var(--subtext-color)]">Player 1:</span>{' '}
            {player1 ? (player1 as PublicKey).toBase58().slice(0, 8) + '...' : '–'}
          </p>
          <p>
            <span className="font-semibold text-[var(--subtext-color)]">Player 2:</span>{' '}
            {player2 ? (player2 as PublicKey).toBase58().slice(0, 8) + '...' : 'Waiting...'}
          </p>
          {winner && (
            <p>
              <span className="font-semibold text-[var(--subtext-color)]">Winner:</span>{' '}
              {(winner as PublicKey).toBase58().slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 space-y-2">
        {canJoin && (
          <button
            onClick={() => handleAction('join')}
            className="btn-primary w-full disabled:opacity-60"
            disabled={busy}
          >
            Join Match
          </button>
        )}
        {canClaim && (
          <button
            onClick={() => handleAction('claim')}
            className="btn-primary w-full disabled:opacity-60"
            disabled={busy}
          >
            Claim Winnings
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => handleAction('cancel')}
            className="btn-secondary w-full disabled:opacity-60"
            disabled={busy}
          >
            Cancel Match
          </button>
        )}
        {!canJoin && !canClaim && !canCancel && (
          <p className="text-center text-[var(--subtext-color)] text-xs">No actions available</p>
        )}
      </div>
    </div>
  );
};
