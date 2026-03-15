'use client';

import SacredVendorDashboard from '@/components/legacy-wrapper/SacredVendorDashboard';
import { useAuth } from '@/hooks/useAuth';

export function SacredVendorDashboardWrapper() {
  const { user } = useAuth();

  // Keep dashboards renderable while live vendor stats hook is being migrated.
  const hydrationData = {
    activeJobs: 12,
    newLeads: 7,
    expiringLeads: 2,
    escrowBalance: 5420,
    reliabilityScore: 4.8,
    vaultScore: 8.6,
    eliteProgress: 72,
    documentsVerified: 9,
    documentsTotal: 11,
    nextExpiryDays: 14,
    userName: user?.name || 'Jake Donovan',
    userInitials: user?.name?.split(' ').map((n: string) => n[0]).join('') || 'JD',
    userTier: `${user?.trade || 'Electrician'} · Pro Plan`,
  };

  return (
    <SacredVendorDashboard
      data={hydrationData}
      isLoading={false}
      error={null}
    />
  );
}
