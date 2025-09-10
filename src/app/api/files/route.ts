import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    // Check authentication
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
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    // Check if uploads directory exists
    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ success: true, files: [] });
    }

    // Read all files in uploads directory
    const fileNames = await readdir(uploadsDir);

    // Filter only ZIP files and get their details
    const files = await Promise.all(
      fileNames
        .filter(name => name.endsWith('.zip'))
        .map(async (name) => {
          const filePath = path.join(uploadsDir, name);
          const stats = await stat(filePath);

          return {
            id: name.split('_')[0],
            filename: name,
            size: stats.size,
            uploadTime: stats.birthtime.toISOString(),
            modifiedTime: stats.mtime.toISOString(),
            url: `/uploads/${name}`
          };
        })
    );

    // Sort by upload time (newest first)
    files.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());

    return NextResponse.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to list files' },
      { status: 500 }
    );
  }
}
