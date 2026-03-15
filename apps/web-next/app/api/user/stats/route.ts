/**
 * User Stats API
 * Proxies requests to the backend API
 */

import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, buildQueryString } from '@/lib/api-proxy';

// GET /api/user/stats?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    // Proxy to backend API
    const queryString = buildQueryString({ userId });
    const result = await proxyToBackend(`/api/customer/dashboard${queryString}`);

    if (!result.success) {
      // Fallback to mock data if backend is unavailable
      return NextResponse.json(
        {
          success: true,
          data: getMockUserStats(),
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
    console.error('User Stats API Error:', error);
    return NextResponse.json(
      {
        success: true,
        data: getMockUserStats(),
        timestamp: new Date().toISOString(),
        source: 'mock-error-fallback'
      },
      { status: 200 }
    );
  }
}

function getMockUserStats() {
  return {
    activeJobs: 3,
    pendingQuotes: 5,
    completedJobs: 12,
    totalSpent: 15420,
    upcomingAppointments: 2,
    unreadMessages: 4,
    documentUploads: 8,
    verificationStatus: 'verified',
    memberSince: '2025-08-15',
    trustScore: 92,
    lastLogin: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}
