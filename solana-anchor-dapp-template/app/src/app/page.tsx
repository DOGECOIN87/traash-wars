'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Header } from '@/components/Header';
import { MatchCard } from '@/components/MatchCard';
import { MatchData, PlatformStats, usePvpGame } from '@/hooks/usePvpGame';

const formatLamports = (value?: number) =>
  value ? (value / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const [stakeInput, setStakeInput] = useState(0.1);
  const [openMatches, setOpenMatches] = useState<MatchData[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { fetchPlatformStats, fetchOpenMatches, createMatch } = usePvpGame();

  const loadData = useCallback(async () => {
    if (!connected) return;
    setBusy(true);
    setMessage(null);
    try {
      const [platformStats, matches] = await Promise.all([
        fetchPlatformStats(),
        fetchOpenMatches(),
      ]);
      setStats(platformStats);
      const openOnly = matches.filter((m) => {
        const state = (m as any).state ?? m.status;
        if (typeof state === 'number') return state === 0;
        if (state && typeof state === 'object' && 'open' in state) return true;
        return !m.player2;
      });
      setOpenMatches(openOnly);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load matches. Double-check your RPC and program ID.');
    } finally {
      setBusy(false);
    }
  }, [connected, fetchOpenMatches, fetchPlatformStats]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateMatch = async () => {
    if (!connected) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await createMatch(stakeInput);
      setMessage(`Match created. Tx: ${result.tx}`);
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage('Error creating match. Ensure the program is deployed and wallet funded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--secondary-color)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-radial-grid" aria-hidden />
      <Header />

      <section className="container mx-auto px-4 py-12 space-y-10">
        <div className="glass-card p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-color)]/10 to-transparent pointer-events-none" />
          <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--subtext-color)]">
                Solana PVP Arena
              </p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Stake, battle, and{' '}
                <span className="text-[var(--primary-color)]">extract</span> your winnings.
              </h1>
              <p className="text-[var(--subtext-color)] max-w-xl">
                Create a head-to-head match, invite a challenger, and settle the score. Jump into the
                Trash Wars mini-game for real-time chaos and bragging rights.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/trash-wars" className="btn-secondary text-center">
                  Play Trash Wars
                </Link>
                {connected ? (
                  <button
                    onClick={() => void handleCreateMatch()}
                    className="btn-primary text-lg px-8 py-4 w-full md:w-auto"
                    disabled={busy}
                  >
                    Create Match
                  </button>
                ) : (
                  <p className="text-[var(--subtext-color)]">Connect your wallet to start a match.</p>
                )}
              </div>
              {message && <p className="text-sm text-yellow-300">{message}</p>}
            </div>

            <div className="glass-card p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-[var(--subtext-color)]">Stake Amount</p>
                  <h3 className="text-3xl font-bold text-[var(--primary-color)]">
                    {stakeInput} SOL
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--subtext-color)]">Wallet</p>
                  <p className="font-mono">
                    {publicKey ? `${publicKey.toBase58().slice(0, 4)}...` : 'Not connected'}
                  </p>
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={stakeInput}
                onChange={(e) => setStakeInput(parseFloat(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
              <button
                className="btn-primary w-full mt-4 disabled:opacity-60"
                onClick={handleCreateMatch}
                disabled={!connected || busy}
              >
                Create Match
              </button>
              <p className="text-xs text-[var(--subtext-color)] mt-3">
                Platform fee and treasury routing are handled on-chain via the program configuration.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            label="Total Matches"
            value={stats ? stats.totalMatches.toString() : '—'}
            accent="from-yellow-400 to-orange-500"
          />
          <StatCard
            label="Completed"
            value={stats ? stats.matchesCompleted.toString() : '—'}
            accent="from-emerald-400 to-green-600"
          />
          <StatCard
            label="Total Volume (SOL)"
            value={stats ? formatLamports(stats.totalVolume.toNumber()) : '—'}
            accent="from-sky-400 to-blue-600"
          />
          <StatCard
            label="Fees Collected (SOL)"
            value={stats ? formatLamports(stats.totalFeesCollected.toNumber()) : '—'}
            accent="from-pink-400 to-rose-600"
          />
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--subtext-color)] uppercase tracking-[0.2em]">
                Active Matches
              </p>
              <h2 className="text-2xl font-bold">Open challenges on-chain</h2>
            </div>
            <button
              onClick={() => void loadData()}
              className="btn-secondary px-4 py-2 disabled:opacity-60"
              disabled={busy}
            >
              Refresh
            </button>
          </div>

          {!connected && (
            <p className="text-[var(--subtext-color)]">Connect your wallet to view active matches.</p>
          )}

          {connected && openMatches.length === 0 && (
            <p className="text-[var(--subtext-color)]">No open matches yet. Be the first to create one!</p>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openMatches.map((match) => (
              <MatchCard key={match.publicKey.toBase58()} match={match} onActionComplete={loadData} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--subtext-color)]">{label}</p>
      <p className={`text-3xl font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  );
}
