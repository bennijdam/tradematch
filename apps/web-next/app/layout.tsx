import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TradeMatch Dashboard Core',
  description: 'Next.js component-based dashboard architecture for TradeMatch',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
