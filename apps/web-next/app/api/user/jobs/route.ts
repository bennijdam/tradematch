/**
 * User Jobs API
 * Manage user job postings and quotes
 */

import { NextRequest, NextResponse } from 'next/server';

// GET /api/user/jobs?userId=xxx&status=active
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId parameter',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const jobs = await fetchUserJobs(userId, status || undefined);

    return NextResponse.json(
      {
        success: true,
        data: jobs,
        meta: {
          total: jobs.length,
          status: status || 'all',
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=10',
        },
      }
    );
  } catch (error) {
    console.error('User Jobs API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch jobs',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/user/jobs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, description, category, budget, location, urgency } = body;

    if (!userId || !title || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, title, category',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const newJob = await createJob({
      userId,
      title,
      description,
      category,
      budget,
      location,
      urgency,
    });

    return NextResponse.json(
      {
        success: true,
        data: newJob,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Job API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create job',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function fetchUserJobs(userId: string, status?: string) {
  // TODO: Replace with actual database query
  // Example with Prisma:
  // const where = { userId };
  // if (status) where.status = status;
  // return await prisma.job.findMany({ where });

  const allJobs = [
    {
      id: 'JOB-001',
      title: 'Consumer Unit Replacement',
      category: 'Electrical',
      status: 'active',
      budget: 1500,
      location: 'Hackney, London',
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      quotesReceived: 3,
      shortlisted: 1,
      description: 'Need to replace old fuse box with modern consumer unit',
      urgency: 'normal',
    },
    {
      id: 'JOB-002',
      title: 'Garden Lighting Installation',
      category: 'Electrical',
      status: 'quoted',
      budget: 800,
      location: 'Camden, London',
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      quotesReceived: 2,
      shortlisted: 0,
      description: 'Install outdoor LED lighting in garden',
      urgency: 'low',
    },
    {
      id: 'JOB-003',
      title: 'Socket Installation',
      category: 'Electrical',
      status: 'completed',
      budget: 450,
      location: 'Islington, London',
      postedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      quotesReceived: 4,
      shortlisted: 1,
      description: 'Add 3 new double sockets in living room',
      urgency: 'normal',
      vendorName: 'Elite Electrics Ltd',
      rating: 5,
    },
  ];

  if (status && status !== 'all') {
    return allJobs.filter((job) => job.status === status);
  }

  return allJobs;
}

interface CreateJobInput {
  userId: string;
  title: string;
  description?: string;
  category: string;
  budget?: number;
  location?: string;
  urgency?: string;
}

async function createJob(input: CreateJobInput) {
  // TODO: Replace with actual database insert
  return {
    id: `JOB-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
    ...input,
    status: 'draft',
    quotesReceived: 0,
    shortlisted: 0,
    postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}
