import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Sora, Syne } from 'next/font/google';

/**
 * Font Configuration - Pixel-Perfect Parity
 * 
 * Super Admin: Syne (architectural, wide display font)
 * User/Vendor: Sora (modern, geometric display font)
 * All Dashboards: DM Sans (body), JetBrains Mono (code/metrics)
 */

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['300', '400', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'TradeMatch Dashboard',
  description: 'Next.js component-based dashboard architecture with Pixel-Perfect Parity',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <body
        suppressHydrationWarning
        className={[
          syne.variable,
          sora.variable, 
          dmSans.variable, 
          jetBrainsMono.variable
        ].join(' ')}
      >
        {children}
      </body>
    </html>
  );
}
