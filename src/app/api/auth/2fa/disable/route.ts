import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, disableTwoFactor } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Disable 2FA for user
    const success = await disableTwoFactor(payload.userId);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}