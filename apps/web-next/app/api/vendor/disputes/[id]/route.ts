/**
 * Dispute Detail API
 * SLA tracking and AI settlement
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateDisputeImpact } from '@/lib/utils/scores';

// GET /api/vendor/disputes/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const disputeId = params.id;
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    
    if (!vendorId) {
      return NextResponse.json(
        { success: false, error: 'Missing vendorId', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }
    
    const dispute = await fetchDispute(disputeId, vendorId);
    const scoreImpact = await calculateDisputeImpact(vendorId, disputeId);
    
    return NextResponse.json({
      success: true,
      data: { ...dispute, scoreImpact },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dispute', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

// POST /api/vendor/disputes/[id]/settle
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const disputeId = params.id;
    const body = await request.json();
    const { vendorId, settlementSplit, action, reason } = body;
    
    if (action === 'accept_ai') {
      const result = await acceptAISettlement(disputeId, vendorId, settlementSplit);
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (action === 'propose_custom') {
      const result = await proposeCustomSettlement(disputeId, vendorId, settlementSplit, reason);
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
      { success: false, error: 'Settlement failed', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

async function fetchDispute(disputeId: string, vendorId: string) {
  // Calculate SLA deadline (48 hours from filing)
  const filedAt = new Date('2026-02-28T14:32:00Z');
  const slaDeadline = new Date(filedAt.getTime() + 48 * 60 * 60 * 1000);
  
  return {
    id: disputeId,
    jobId: 'T48101',
    title: 'Consumer Unit Upgrade — Hackney E8',
    category: 'Escrow Release Dispute',
    status: 'active',
    homeowner: { name: 'Sarah R.', id: 'USR-001' },
    vendor: { name: 'Jake Donovan', id: vendorId, certification: 'NICEIC #EL-7842' },
    amount: 1850,
    escrowFrozen: true,
    filedAt: filedAt.toISOString(),
    slaDeadline: slaDeadline.toISOString(),
    description: 'The consumer unit was installed but a trip fault developed 3 days later causing power loss to the kitchen circuit.',
    aiAssessment: {
      confidence: 87,
      vendorShare: 70,
      homeownerShare: 30,
      vendorAmount: 1295,
      homeownerAmount: 555,
      reasoning: 'GPS logs confirm full-day attendance. Milestone 1 was completed and signed off.',
      suggestedAt: new Date().toISOString(),
    },
    evidence: [],
    auditTrail: [],
  };
}

async function acceptAISettlement(disputeId: string, vendorId: string, split: number) {
  // Process escrow release
  return {
    escrowReleased: true,
    vendorAmount: Math.round(1850 * split / 100),
    homeownerAmount: Math.round(1850 * (100 - split) / 100),
    newScore: 8.4, // Updated after resolution
  };
}

async function proposeCustomSettlement(disputeId: string, vendorId: string, split: number, reason: string) {
  return {
    proposed: true,
    split,
    reason,
    status: 'pending_homeowner_response',
  };
}
