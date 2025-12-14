// This header component is copied from the original dApp template and
// augmented with a link to the new Trash Wars game. Because it uses
// React hooks from the Solana wallet adapter it must be a client component.
'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const Header: FC = () => {
  const { connected, publicKey } = useWallet();

  return (
    <header className="glass-card sticky top-4 mx-4 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-[var(--accent-color)] flex items-center justify-center">
              <span className="text-xl">🎮</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-[var(--primary-color)]">PVP Arena</h1>
              <p className="text-xs text-[var(--subtext-color)]">Skill-based gaming</p>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Network Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <span className="text-xs text-[var(--subtext-color)]">Devnet</span>
            </div>

            {/* Trash Wars Link */}
            <Link href="/trash-wars" className="btn-secondary hidden md:flex">
              Trash Wars
            </Link>

            {/* Wallet Info */}
            {connected && publicKey && (
              <div className="hidden md:block text-right">
                <p className="text-xs text-[var(--subtext-color)]">Connected</p>
                <p className="text-sm font-mono text-white">
                  {publicKey.toBase58().slice(0, 4)}...
                  {publicKey.toBase58().slice(-4)}
                </p>
              </div>
            )}

            {/* Wallet Button */}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </header>
  );
};