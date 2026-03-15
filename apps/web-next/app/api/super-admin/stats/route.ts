/**
 * Super Admin Stats API
 * Proxies requests to the backend API
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, buildQueryString } from '@/lib/api-proxy';

// GET /api/super-admin/stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    // Proxy to backend API
    const queryString = buildQueryString({ period });
    const result = await proxyToBackend(`/api/admin/stats${queryString}`);

    if (!result.success) {
      // Fallback to mock data if backend is unavailable
      return NextResponse.json(
        {
          success: true,
          data: getMockAdminStats(period),
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
    console.error('Super Admin Stats API Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: getMockAdminStats('24h'),
        timestamp: new Date().toISOString(),
        source: 'mock-error-fallback'
      },
      { status: 200 }
    );
  }
}

function getMockAdminStats(period: string) {
  return {
    overview: {
      totalUsers: 15234,
      totalVendors: 3421,
      activeJobs: 892,
      completedJobsThisMonth: 1247,
      totalRevenue: 2847500,
      platformFees: 85425,
    },
    realTime: {
      usersOnline: 456,
      activeSessions: 342,
      jobsInProgress: 156,
      pendingDisputes: 23,
    },
    trends: {
      userGrowth: 12.5,
      vendorGrowth: 8.3,
      jobGrowth: 15.2,
      revenueGrowth: 18.7,
    },
    byCategory: [
      { category: 'Electrical', jobs: 456, revenue: 890000 },
      { category: 'Plumbing', jobs: 312, revenue: 620000 },
      { category: 'Carpentry', jobs: 234, revenue: 480000 },
      { category: 'HVAC', jobs: 178, revenue: 520000 },
      { category: 'Other', jobs: 67, revenue: 337500 },
    ],
    systemHealth: {
      apiResponseTime: 45,
      uptime: 99.97,
      errorRate: 0.02,
      lastIncident: '2026-02-15T10:30:00Z',
    },
    disputes: {
      open: 23,
      resolvedToday: 8,
      avgResolutionTime: 36,
      escalated: 3,
    },
    period,
    generatedAt: new Date().toISOString(),
  };
}
