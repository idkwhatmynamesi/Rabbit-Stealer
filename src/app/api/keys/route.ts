import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const API_KEYS_FILE = path.join(process.cwd(), 'data', 'api-keys.json');

interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  userId: string;
  permissions: string[];
  rateLimit: number;
  expiresAt?: string;
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  status: 'active' | 'revoked' | 'expired';
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadApiKeys(): Map<string, ApiKey> {
  ensureDataDir();
  if (fs.existsSync(API_KEYS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
      const keysMap = new Map<string, ApiKey>();
      data.forEach((key: ApiKey) => {
        keysMap.set(key.id, key);
      });
      return keysMap;
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveApiKeys(keys: Map<string, ApiKey>) {
  ensureDataDir();
  const keysArray = Array.from(keys.values());
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keysArray, null, 2));
}

function generateApiKey(): string {
  const prefix = 'zfm'; // ZIP File Manager
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${randomBytes}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
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
      name,
      permissions = ['read'],
      rateLimit = 100,
      expiresIn
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'API key name is required' },
        { status: 400 }
      );
    }

    const keys = loadApiKeys();

    // Check if user already has too many keys
    const userKeys = Array.from(keys.values()).filter(k => k.userId === payload.userId);
    if (userKeys.length >= 5) {
      return NextResponse.json(
        { success: false, message: 'Maximum API keys limit reached (5)' },
        { status: 400 }
      );
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    // Calculate expiration
    let expiresAt;
    if (expiresIn) {
      const days = parseInt(expiresIn);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const newKey: ApiKey = {
      id: crypto.randomBytes(8).toString('hex'),
      name,
      key: apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4), // Store partial key for display
      hashedKey,
      userId: payload.userId,
      permissions,
      rateLimit,
      expiresAt,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    keys.set(newKey.id, newKey);
    saveApiKeys(keys);

    return NextResponse.json({
      success: true,
      apiKey: {
        ...newKey,
        key: apiKey // Return full key only on creation
      },
      message: 'Save this API key securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const keys = loadApiKeys();
    const userKeys = Array.from(keys.values())
      .filter(k => k.userId === payload.userId)
      .map(k => ({
        id: k.id,
        name: k.name,
        key: k.key, // Partial key
        permissions: k.permissions,
        rateLimit: k.rateLimit,
        expiresAt: k.expiresAt,
        lastUsed: k.lastUsed,
        usageCount: k.usageCount,
        createdAt: k.createdAt,
        status: k.status
      }));

    return NextResponse.json({
      success: true,
      keys: userKeys
    });
  } catch (error) {
    console.error('API key retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve API keys' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const { keyId } = await request.json();

    if (!keyId) {
      return NextResponse.json(
        { success: false, message: 'Key ID is required' },
        { status: 400 }
      );
    }

    const keys = loadApiKeys();
    const key = keys.get(keyId);

    if (!key || key.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, message: 'API key not found' },
        { status: 404 }
      );
    }

    // Mark as revoked instead of deleting
    key.status = 'revoked';
    keys.set(keyId, key);
    saveApiKeys(keys);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    console.error('API key deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}

// Validate API key for external requests
export async function validateApiKey(apiKey: string): Promise<ApiKey | null> {
  const hashedKey = hashApiKey(apiKey);
  const keys = loadApiKeys();

  for (const key of keys.values()) {
    if (key.hashedKey === hashedKey && key.status === 'active') {
      // Check expiration
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
        key.status = 'expired';
        keys.set(key.id, key);
        saveApiKeys(keys);
        return null;
      }

      // Update usage
      key.lastUsed = new Date().toISOString();
      key.usageCount++;
      keys.set(key.id, key);
      saveApiKeys(keys);

      return key;
    }
  }

  return null;
}
