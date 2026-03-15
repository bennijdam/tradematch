/**
 * Dispute Centre Page
 * Sacred implementation with 100% visual parity
 */

import { Suspense } from 'react';
import { SacredDisputeCentreWrapper } from './SacredDisputeCentreWrapper';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dispute Centre | TradeMatch',
  description: '48-hour resolution guarantee. Trust & Safety.',
};

export default function DisputeCentrePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SacredDisputeCentreWrapper />
    </Suspense>
  );
}
