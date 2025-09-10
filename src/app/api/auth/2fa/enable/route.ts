import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, generateTwoFactorSecret, generateBackupCodes, enableTwoFactor } from '@/lib/auth';

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

    // Generate secret and backup codes
    const secret = generateTwoFactorSecret();
    const backupCodes = generateBackupCodes();

    // Enable 2FA for user
    const success = await enableTwoFactor(payload.userId, secret, backupCodes);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      secret,
      backupCodes,
      qrCodeUrl: `otpauth://totp/ZIP%20Manager:${payload.email}?secret=${secret}&issuer=ZIP%20Manager`
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}