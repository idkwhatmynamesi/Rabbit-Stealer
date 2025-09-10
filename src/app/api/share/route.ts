import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SHARES_FILE = path.join(process.cwd(), 'data', 'shares.json');

interface Share {
  id: string;
  filename: string;
  originalName: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  password?: string;
  downloadCount: number;
  maxDownloads?: number;
  isPublic: boolean;
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadShares(): Map<string, Share> {
  ensureDataDir();
  if (fs.existsSync(SHARES_FILE)) {
    try {
      const data = fs.readFileSync(SHARES_FILE, 'utf-8');
      const sharesArray = JSON.parse(data);
      const sharesMap = new Map<string, Share>();
      sharesArray.forEach((share: Share) => {
        sharesMap.set(share.id, share);
      });
      return sharesMap;
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveShares(shares: Map<string, Share>) {
  ensureDataDir();
  const sharesArray = Array.from(shares.values());
  fs.writeFileSync(SHARES_FILE, JSON.stringify(sharesArray, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
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

    const {
      filename,
      expiresIn,
      password,
      maxDownloads,
      isPublic
    } = await request.json();

    // Generate unique share ID
    const shareId = crypto.randomBytes(16).toString('hex');

    // Calculate expiration
    let expiresAt;
    if (expiresIn) {
      const hours = parseInt(expiresIn);
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    // Create share object
    const share: Share = {
      id: shareId,
      filename,
      originalName: filename,
      createdBy: payload.userId,
      createdAt: new Date().toISOString(),
      expiresAt,
      password: password ? crypto.createHash('sha256').update(password).digest('hex') : undefined,
      downloadCount: 0,
      maxDownloads: maxDownloads ? parseInt(maxDownloads) : undefined,
      isPublic: isPublic || false
    };

    // Save share
    const shares = loadShares();
    shares.set(shareId, share);
    saveShares(shares);

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://same-6v7wl5km5vd-latest.netlify.app';
    const shareUrl = `${baseUrl}/s/${shareId}`;

    return NextResponse.json({
      success: true,
      share: {
        id: shareId,
        url: shareUrl,
        expiresAt: share.expiresAt,
        hasPassword: !!password,
        maxDownloads: share.maxDownloads
      }
    });
  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create share' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('id');

    if (!shareId) {
      // Get all public shares
      const shares = loadShares();
      const publicShares = Array.from(shares.values())
        .filter(s => s.isPublic)
        .map(s => ({
          id: s.id,
          originalName: s.originalName,
          createdAt: s.createdAt,
          downloadCount: s.downloadCount
        }));

      return NextResponse.json({
        success: true,
        shares: publicShares
      });
    }

    // Get specific share
    const shares = loadShares();
    const share = shares.get(shareId);

    if (!share) {
      return NextResponse.json(
        { success: false, message: 'Share not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Share has expired' },
        { status: 410 }
      );
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return NextResponse.json(
        { success: false, message: 'Download limit reached' },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        originalName: share.originalName,
        hasPassword: !!share.password,
        downloadCount: share.downloadCount,
        maxDownloads: share.maxDownloads,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt
      }
    });
  } catch (error) {
    console.error('Share retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve share' },
      { status: 500 }
    );
  }
}
