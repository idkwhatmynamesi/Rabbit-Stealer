import { NextRequest, NextResponse } from 'next/server';
import { unlink, access } from 'fs/promises';
import path from 'path';
import { ActivityLogger } from '@/lib/activity-logger';
import { retryFileOperation } from '@/lib/retry-utils';


export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  let filename: string | undefined;
  
  try {
    const body = await request.json();
    filename = body.filename;

    if (!filename) {
      await ActivityLogger.systemError('Delete API called without filename', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json(
        { success: false, message: 'No filename provided' },
        { status: 400 }
      );
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      await ActivityLogger.systemError('Path traversal attempt detected', {
        filename,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid filename' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    // Check if file exists using async method with retry
    try {
      await retryFileOperation(async () => {
        await access(filePath);
      }, `File access check for ${filename}`);
    } catch {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    // Delete the file with enhanced retry mechanism
    await retryFileOperation(async () => {
      await unlink(filePath);
    }, `File deletion for ${filename}`);

    // Log successful deletion
    await ActivityLogger.fileDeleted(filename);

    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      duration: `${duration}ms`
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Error deleting file:', error);
    
    // Log the error with context
    await ActivityLogger.systemError(`Failed to delete file: ${filename || 'unknown'}`, {
      error: errorMessage,
      duration: `${duration}ms`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete file',
        error: errorMessage,
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}