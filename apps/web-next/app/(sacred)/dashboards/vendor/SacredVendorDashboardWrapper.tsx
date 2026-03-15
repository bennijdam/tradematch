'use client';

import SacredVendorDashboard from '@/components/legacy-wrapper/SacredVendorDashboard';
import { useVendorStats } from '@/lib/hooks/useVendorData';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * Sacred Vendor Dashboard Wrapper
 * 
 * This wrapper connects the Sacred Shell to live data.
 * NO LAYOUT WRAPPERS - The Sacred Shell has 100% control over the viewport.
 * Located in (sacred) route group to bypass standard Next.js layout.
 */

export function SacredVendorDashboardWrapper() {
  const { user } = useAuth();
  const vendorId = user?.id || 'demo-vendor-id';
  
  // Fetch live data from API
  const { stats, isLoading, isError } = useVendorStats(vendorId);
  
  // Prepare hydration data - MATCHES EXACTLY the original HTML IDs
  const hydrationData = stats ? {
    // Stats section IDs from vendor-dashboard.html
    activeJobs: stats.activeJobs,
    newLeads: stats.newLeads,
    expiringLeads: stats.expiringToday,
    escrowBalance: stats.escrowBalance,
    reliabilityScore: stats.reliabilityScore,
    
    // Vault section IDs
    vaultScore: stats.vaultScore,
    eliteProgress: stats.eliteProgress,
    documentsVerified: stats.documentsVerified,
    documentsTotal: stats.documentsTotal,
    nextExpiryDays: stats.nextExpiryDays,
    
    // User info IDs from sidebar
    userName: user?.name || 'Jake Donovan',
    userInitials: user?.name?.split(' ').map((n: string) => n[0]).join('') || 'JD',
    userTier: `${user?.trade || 'Electrician'} · ${
      stats.vaultScore >= 9 ? 'Elite' : 
      stats.vaultScore >= 7.5 ? 'Pro' : 'Verified'
    } Plan`,
  } : {};

  return (
    // NO WRAPPERS - SacredVendorDashboard has full viewport control
    <SacredVendorDashboard
      data={hydrationData}
      isLoading={isLoading}
      error={isError}
    />
  );
}
