/**
 * Vendor Disputes List API
 * Returns list of disputes for vendor dashboard
 */

import { NextRequest, NextResponse } from 'next/server';

// GET /api/vendor/disputes?vendorId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing vendorId parameter',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const disputes = await fetchVendorDisputes(vendorId);

    return NextResponse.json(
      {
        success: true,
        data: disputes,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      }
    );
  } catch (error) {
    console.error('Disputes List API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch disputes',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/vendor/disputes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId, jobId, title, description, category } = body;

    if (!vendorId || !jobId || !title) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: vendorId, jobId, title',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const newDispute = await createDispute({
      vendorId,
      jobId,
      title,
      description,
      category,
    });

    return NextResponse.json(
      {
        success: true,
        data: newDispute,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Dispute API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create dispute',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function fetchVendorDisputes(vendorId: string) {
  // TODO: Replace with actual database query
  // Example with Prisma:
  // return await prisma.dispute.findMany({
  //   where: { vendorId },
  //   orderBy: { filedAt: 'desc' }
  // });

  return [
    {
      id: 'DSP-001',
      jobId: 'JOB-001',
      title: 'Consumer Unit Upgrade — Hackney E8',
      category: 'Escrow Release Dispute',
      status: 'active',
      amount: 1850,
      escrowFrozen: true,
      filedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'DSP-002',
      jobId: 'JOB-045',
      title: 'Socket Installation — Camden NW1',
      category: 'Quality Dispute',
      status: 'under_review',
      amount: 450,
      escrowFrozen: true,
      filedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 43 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'DSP-003',
      jobId: 'JOB-078',
      title: 'Lighting Upgrade — Islington N1',
      category: 'Timeline Dispute',
      status: 'resolved',
      amount: 890,
      escrowFrozen: false,
      filedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      resolution: 'Vendor favored - 80% released',
    },
  ];
}

interface CreateDisputeInput {
  vendorId: string;
  jobId: string;
  title: string;
  description?: string;
  category?: string;
}

async function createDispute(input: CreateDisputeInput) {
  // TODO: Replace with actual database insert
  const filedAt = new Date();
  const slaDeadline = new Date(filedAt.getTime() + 48 * 60 * 60 * 1000);

  return {
    id: `DSP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    ...input,
    status: 'active',
    escrowFrozen: true,
    filedAt: filedAt.toISOString(),
    slaDeadline: slaDeadline.toISOString(),
    createdAt: filedAt.toISOString(),
  };
}
