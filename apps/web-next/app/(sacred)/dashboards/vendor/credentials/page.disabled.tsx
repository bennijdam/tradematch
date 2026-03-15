/**
 * Credentials Vault Page
 * Sacred implementation with 100% visual parity
 */

import { Suspense } from 'react';
import { SacredCredentialsVaultWrapper } from './SacredCredentialsVaultWrapper';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Credentials Vault | TradeMatch',
  description: 'Your "Verified for Life" digital passport.',
};

export default function CredentialsVaultPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SacredCredentialsVaultWrapper />
    </Suspense>
  );
}
