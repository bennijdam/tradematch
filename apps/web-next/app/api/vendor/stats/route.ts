/**
 * Vendor Stats API
 * Proxies requests to the backend API
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, buildQueryString } from '@/lib/api-proxy';

// GET /api/vendor/stats?vendorId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId') || 'demo-vendor';

    // Proxy to backend API
    const queryString = buildQueryString({ vendorId });
    const result = await proxyToBackend(`/api/vendor/stats${queryString}`);

    if (!result.success) {
      // Fallback to mock data if backend is unavailable
      return NextResponse.json(
        {
          success: true,
          data: getMockVendorStats(),
          timestamp: new Date().toISOString(),
          source: 'mock-fallback'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        source: 'backend-api'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Vendor Stats API Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: getMockVendorStats(),
        timestamp: new Date().toISOString(),
        source: 'mock-error-fallback'
      },
      { status: 200 }
    );
  }
}

function getMockVendorStats() {
  return {
    activeJobs: 5,
    pendingMilestones: 2,
    newLeads: 12,
    expiringToday: 3,
    escrowBalance: 8450,
    availableToWithdraw: 8450,
    reliabilityScore: 94.2,
    scoreTrend: 1.2,
    vaultScore: 8.7,
    documentsVerified: 4,
    documentsTotal: 6,
    nextExpiryDays: 28,
    nextExpiryLabel: 'PLI',
    escrowStatus: 'ready',
    leadTier: '£8k max',
    eliteProgress: 74,
    lastUpdated: new Date().toISOString(),
  };
}
