import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    // No authentication required for C++ client uploads
    // WARNING: This endpoint is less secure - consider adding API key authentication
    
    const formData = await request.formData();
    const file = formData.get('zipfile') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { success: false, message: 'Only ZIP files are allowed' },
        { status: 400 }
      );
    }

    // Validate filename to prevent path traversal
    const filename = file.name;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, message: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Generate secure random filename
    const randomName = `${crypto.randomBytes(8).toString('hex')}_${Date.now()}.zip`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(uploadsDir, randomName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: randomName,
        originalName: file.name,
        size: file.size,
        uploadTime: new Date().toISOString(),
        url: `/uploads/${randomName}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};