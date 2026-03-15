/**
 * Vendor Dashboard - Hybrid Shell Implementation
 * 
 * Uses LegacyWrapper to render original HTML while hydrating with live data.
 * This preserves 100% visual parity while adding 2026 functionality.
 */

import { Suspense } from 'react';
import { VendorDashboardShell } from './VendorDashboardShell';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';

export const metadata = {
  title: 'Vendor Dashboard | TradeMatch',
  description: 'Manage your jobs, leads, and payments in one place.',
};

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <VendorDashboardShell />
    </Suspense>
  );
}
