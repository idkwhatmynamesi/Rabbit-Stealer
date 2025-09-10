import { NextRequest, NextResponse } from 'next/server';
import { validateUser, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logActivity } from '@/app/api/activity/route';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await validateUser(email, password);

    if (!user) {
      // Log failed login attempt
      await logActivity('Login Failed', email, 'failure', { email, reason: 'Invalid credentials' });
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Log successful login
    await logActivity('User Login', user.id, 'success', { 
      email: user.email, 
      name: user.name,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to login' },
      { status: 500 }
    );
  }
}
