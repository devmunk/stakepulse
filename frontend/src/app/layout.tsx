import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StakePulse — Predict. Stake. Win.',
  description: 'A decentralized prediction market on Stellar Soroban',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
