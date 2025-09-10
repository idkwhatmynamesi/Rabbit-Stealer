import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const FEATURES_FILE = path.join(process.cwd(), 'data', 'features.json');

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureDataDir();

    if (fs.existsSync(FEATURES_FILE)) {
      const data = fs.readFileSync(FEATURES_FILE, 'utf-8');
      return NextResponse.json({
        success: true,
        features: JSON.parse(data)
      });
    }

    return NextResponse.json({
      success: true,
      features: {}
    });
  } catch (error) {
    console.error('Error getting features:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get features' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { features } = await request.json();

    ensureDataDir();
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Features saved successfully'
    });
  } catch (error) {
    console.error('Error saving features:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save features' },
      { status: 500 }
    );
  }
}
