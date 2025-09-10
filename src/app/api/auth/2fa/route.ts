import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getUserById, updateUser } from '@/lib/auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function GET() {
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

    const user = getUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a new secret for 2FA
    const secret = speakeasy.generateSecret({
      name: `Rabbit Panel (${user.email})`,
      issuer: 'Rabbit Panel',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate 2FA setup' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { action, secret, code, backupCodes } = await request.json();

    if (action === 'enable') {
      // Verify the code before enabling
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Update user with 2FA settings
      updateUser(payload.userId, {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes
      });

      return NextResponse.json({
        success: true,
        message: '2FA has been enabled successfully'
      });
    } else if (action === 'disable') {
      // Update user to disable 2FA
      updateUser(payload.userId, {
        twoFactorSecret: undefined,
        twoFactorEnabled: false,
        twoFactorBackupCodes: []
      });

      return NextResponse.json({
        success: true,
        message: '2FA has been disabled'
      });
    } else if (action === 'verify') {
      const user = getUserById(payload.userId);
      if (!user || !user.twoFactorSecret) {
        return NextResponse.json(
          { success: false, message: '2FA not enabled' },
          { status: 400 }
        );
      }

      // Check if it's a backup code
      if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.includes(code)) {
        // Remove used backup code
        const newBackupCodes = user.twoFactorBackupCodes.filter((c: string) => c !== code);
        updateUser(payload.userId, { twoFactorBackupCodes: newBackupCodes });
        
        return NextResponse.json({
          success: true,
          message: 'Backup code verified',
          isBackupCode: true
        });
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '2FA code verified'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('2FA operation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process 2FA request' },
      { status: 500 }
    );
  }
}