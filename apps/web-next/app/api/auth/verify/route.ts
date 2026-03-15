/**
 * Authentication Verification API
 * Verifies JWT tokens and returns user session info
 */

import { NextRequest, NextResponse } from 'next/server';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  vendorId?: string;
  customerId?: string;
  iat: number;
  exp: number;
}

interface VerifyResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'vendor' | 'user' | 'admin' | 'super_admin';
    tenantId: string;
    trade?: string;
    avatar?: string;
  };
  expiresAt?: string;
}

// GET /api/auth/verify
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;
    const tokenFromCookie = request.cookies.get('accessToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No token provided',
          code: 'NO_TOKEN',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Verify token
    const verification = await verifyToken(token);

    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: verification.user,
          expiresAt: verification.expiresAt,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Token Verification API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Token verification failed',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/auth/verify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required in request body',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const verification = await verifyToken(token);

    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: verification.user,
          expiresAt: verification.expiresAt,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token Verification API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Token verification failed',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function verifyToken(token: string): Promise<VerifyResponse> {
  // TODO: Replace with actual JWT verification using jsonwebtoken
  // Example:
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  //   const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  //   return { valid: true, user, expiresAt: new Date(decoded.exp * 1000).toISOString() };
  // } catch (error) {
  //   return { valid: false };
  // }

  // Mock token verification
  if (!token.startsWith('mock_access_token_')) {
    return { valid: false };
  }

  // Extract user ID from mock token
  const parts = token.split('_');
  const userId = parts[3];

  const mockUsers: Record<string, VerifyResponse['user']> = {
    'vendor-123': {
      id: 'vendor-123',
      email: 'vendor@example.com',
      name: 'Jake Donovan',
      role: 'vendor',
      tenantId: 'tenant-abc',
      trade: 'Electrician',
      avatar: '/avatars/vendor-123.jpg',
    },
    'user-456': {
      id: 'user-456',
      email: 'user@example.com',
      name: 'Sarah Johnson',
      role: 'user',
      tenantId: 'tenant-abc',
    },
    'admin-789': {
      id: 'admin-789',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      tenantId: 'tenant-abc',
    },
    'super-999': {
      id: 'super-999',
      email: 'super@example.com',
      name: 'Super Admin',
      role: 'super_admin',
      tenantId: 'system',
    },
  };

  const user = mockUsers[userId];

  if (!user) {
    return { valid: false };
  }

  // Calculate expiration (24 hours from now for mock)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    valid: true,
    user,
    expiresAt,
  };
}
