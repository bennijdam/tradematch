import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TradeMatch Dashboard Core',
  description: 'Next.js component-based dashboard architecture for TradeMatch',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={[sora.variable, dmSans.variable, jetBrainsMono.variable].join(' ')}>{children}</body>
    </html>
  );
}
