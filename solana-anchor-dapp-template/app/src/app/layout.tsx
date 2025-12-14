import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
});

export const metadata: Metadata = {
  title: 'Gorbagana: Trash Wars',
  description:
    'Skill-based Solana PVP arena with wallet-native matchmaking and a neon-infused Trash Wars mini-game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} bg-[var(--secondary-color)] text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
