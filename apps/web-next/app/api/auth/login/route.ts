/**
 * Authentication Login API
 * Handles user login and token generation
 */

import { NextRequest, NextResponse } from 'next/server';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'vendor' | 'user' | 'admin' | 'super_admin';
    tenantId: string;
    trade?: string;
    avatar?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: email and password',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Invalid credentials',
          code: 'AUTH_FAILED',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Generate tokens
    const tokens = await generateTokens(authResult.user!, rememberMe);

    // Set HTTP-only cookies for security
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: authResult.user,
          tokens: {
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

    // Set secure cookies
    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

interface AuthResult {
  success: boolean;
  user?: LoginResponse['user'];
  error?: string;
}

async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  // TODO: Replace with actual database authentication
  // Example with Prisma + bcrypt:
  // const user = await prisma.user.findUnique({ where: { email } });
  // if (!user) return { success: false, error: 'User not found' };
  // const valid = await bcrypt.compare(password, user.passwordHash);
  // if (!valid) return { success: false, error: 'Invalid password' };

  // Mock authentication for demonstration
  const mockUsers: Record<string, LoginResponse['user']> = {
    'vendor@example.com': {
      id: 'vendor-123',
      email: 'vendor@example.com',
      name: 'Jake Donovan',
      role: 'vendor',
      tenantId: 'tenant-abc',
      trade: 'Electrician',
      avatar: '/avatars/vendor-123.jpg',
    },
    'user@example.com': {
      id: 'user-456',
      email: 'user@example.com',
      name: 'Sarah Johnson',
      role: 'user',
      tenantId: 'tenant-abc',
    },
    'admin@example.com': {
      id: 'admin-789',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      tenantId: 'tenant-abc',
    },
    'super@example.com': {
      id: 'super-999',
      email: 'super@example.com',
      name: 'Super Admin',
      role: 'super_admin',
      tenantId: 'system',
    },
  };

  const user = mockUsers[email.toLowerCase()];

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // In production, verify password hash here
  if (password !== 'password123') {
    return { success: false, error: 'Invalid password' };
  }

  return { success: true, user };
}

async function generateTokens(
  user: LoginResponse['user'],
  rememberMe: boolean
): Promise<LoginResponse['tokens']> {
  // TODO: Replace with actual JWT generation using jsonwebtoken
  // Example:
  // const accessToken = jwt.sign(
  //   { userId: user.id, email: user.email, role: user.role },
  //   process.env.JWT_SECRET!,
  //   { expiresIn: '1h' }
  // );

  const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 24 hours

  return {
    accessToken: `mock_access_token_${user.id}_${Date.now()}`,
    refreshToken: `mock_refresh_token_${user.id}_${Date.now()}`,
    expiresIn,
  };
}
