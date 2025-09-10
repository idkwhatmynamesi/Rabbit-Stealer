import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');

interface FileVersion {
  id: string;
  filename: string;
  version: number;
  hash: string;
  size: number;
  createdAt: string;
  createdBy: string;
  comment?: string;
  changes?: string[];
}

function ensureVersionsDir() {
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
}

function getVersionsFile(filename: string): string {
  return path.join(VERSIONS_DIR, `${filename}.versions.json`);
}

function loadVersions(filename: string): FileVersion[] {
  ensureVersionsDir();
  const versionsFile = getVersionsFile(filename);

  if (fs.existsSync(versionsFile)) {
    try {
      return JSON.parse(fs.readFileSync(versionsFile, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

function saveVersions(filename: string, versions: FileVersion[]) {
  ensureVersionsDir();
  const versionsFile = getVersionsFile(filename);
  fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));
}

function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
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

    const { filename, comment } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    // Calculate file hash
    const hash = calculateFileHash(filePath);
    const stats = fs.statSync(filePath);

    // Load existing versions
    const versions = loadVersions(filename);

    // Check if this version already exists
    const lastVersion = versions[versions.length - 1];
    if (lastVersion && lastVersion.hash === hash) {
      return NextResponse.json({
        success: false,
        message: 'No changes detected since last version'
      });
    }

    // Create new version
    const newVersion: FileVersion = {
      id: crypto.randomBytes(8).toString('hex'),
      filename,
      version: versions.length + 1,
      hash,
      size: stats.size,
      createdAt: new Date().toISOString(),
      createdBy: payload.userId,
      comment
    };

    // Copy file to versions directory with version suffix
    const versionedFilename = `${filename}.v${newVersion.version}`;
    const versionedPath = path.join(VERSIONS_DIR, versionedFilename);
    fs.copyFileSync(filePath, versionedPath);

    // Add to versions list
    versions.push(newVersion);
    saveVersions(filename, versions);

    return NextResponse.json({
      success: true,
      version: newVersion,
      totalVersions: versions.length
    });
  } catch (error) {
    console.error('Version creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create version' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      );
    }

    const versions = loadVersions(filename);

    return NextResponse.json({
      success: true,
      versions,
      totalVersions: versions.length
    });
  } catch (error) {
    console.error('Version retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve versions' },
      { status: 500 }
    );
  }
}

// Restore a specific version
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token || !verifyToken(token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { filename, versionId } = await request.json();

    const versions = loadVersions(filename);
    const version = versions.find(v => v.id === versionId);

    if (!version) {
      return NextResponse.json(
        { success: false, message: 'Version not found' },
        { status: 404 }
      );
    }

    // Restore the version
    const versionedFilename = `${filename}.v${version.version}`;
    const versionedPath = path.join(VERSIONS_DIR, versionedFilename);
    const targetPath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!fs.existsSync(versionedPath)) {
      return NextResponse.json(
        { success: false, message: 'Version file not found' },
        { status: 404 }
      );
    }

    fs.copyFileSync(versionedPath, targetPath);

    return NextResponse.json({
      success: true,
      message: `Restored to version ${version.version}`,
      version
    });
  } catch (error) {
    console.error('Version restore error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
