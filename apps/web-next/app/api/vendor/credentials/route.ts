/**
 * Credentials API
 * Real-time document verification and vault score
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateVaultScore } from '@/lib/utils/scores';

// GET /api/vendor/credentials?vendorId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    
    if (!vendorId) {
      return NextResponse.json(
        { success: false, error: 'Missing vendorId', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }
    
    const credentials = await fetchCredentials(vendorId);
    const vaultScore = await calculateVaultScore(vendorId);
    
    return NextResponse.json({
      success: true,
      data: credentials,
      meta: { vaultScore },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credentials', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// POST /api/vendor/credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, credentialId, action } = body;
    
    if (action === 'quickRenew') {
      const result = await initiateQuickRenew(vendorId, credentialId);
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action', timestamp: new Date().toISOString() },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Request failed', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

async function fetchCredentials(vendorId: string) {
  // Replace with actual DB query
  return [
    {
      id: 'niceic',
      name: 'NICEIC Approved Contractor',
      type: 'mandatory' as const,
      status: 'active' as const,
      regNumber: 'EL-7842-22A',
      expiryDate: '2027-01-15',
      apiSource: 'NICEIC API',
      category: 'electrical',
    },
    {
      id: 'partp',
      name: 'Part P Competent Person Scheme',
      type: 'mandatory' as const,
      status: 'active' as const,
      regNumber: 'PP-00234-2024',
      expiryDate: '2027-12-01',
      apiSource: 'NICEIC API',
      category: 'electrical',
    },
    {
      id: 'pli',
      name: 'Public Liability Insurance — £2M Cover',
      type: 'mandatory' as const,
      status: 'expiring' as const,
      regNumber: 'AXA-PLI-887234',
      expiryDate: '2026-03-30',
      daysUntilExpiry: 28,
      category: 'insurance',
    },
    {
      id: 'employer',
      name: "Employer's Liability Insurance",
      type: 'optional' as const,
      status: 'pending' as const,
      category: 'insurance',
      impact: { scoreDelta: 0.4, tier: 'Elite' },
    },
  ];
}

async function initiateQuickRenew(vendorId: string, credentialId: string) {
  // Return TradeMatch partner renewal URL
  return {
    redirectUrl: `https://partners.tradematch.io/renew?credential=${credentialId}&vendor=${vendorId}`,
  };
}
