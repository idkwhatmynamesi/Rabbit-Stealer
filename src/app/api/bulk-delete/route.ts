import { NextRequest, NextResponse } from 'next/server';
import { unlink, access } from 'fs/promises';
import path from 'path';
import { ActivityLogger } from '@/lib/activity-logger';
import { retryFileOperation, retryBatch } from '@/lib/retry-utils';
import { fileOperationTracker, measureApiEndpoint } from '@/lib/performance-monitor';


interface BulkDeleteResult {
  filename: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export async function DELETE(request: NextRequest) {
  return measureApiEndpoint('bulk-delete')(async () => {
    const startTime = Date.now();
    
    try {
    const { filenames } = await request.json();

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      await ActivityLogger.systemError('Bulk delete API called with invalid filenames', {
        filenames: filenames || 'undefined',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid filenames provided' },
        { status: 400 }
      );
    }

    // Validate all filenames first
    const invalidFiles = filenames.filter((filename: string) => 
      !filename || 
      filename.includes('..') || 
      filename.includes('/') || 
      filename.includes('\\')
    );

    if (invalidFiles.length > 0) {
      await ActivityLogger.systemError('Path traversal attempt detected in bulk delete', {
        invalidFiles,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid filenames detected' },
        { status: 400 }
      );
    }

    // Start tracking bulk operation
    const operationId = fileOperationTracker.startBulkOperation('delete', filenames.length, {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    });

    // Use the enhanced retry batch utility for better performance and reliability
    const results = await retryBatch(
      filenames,
      async (filename: string): Promise<BulkDeleteResult> => {
        const fileStartTime = Date.now();
        const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

        // Check if file exists with retry
        await retryFileOperation(async () => {
          await access(filePath);
        }, `File access check for ${filename}`);

        // Delete the file with retry mechanism
        await retryFileOperation(async () => {
          await unlink(filePath);
        }, `File deletion for ${filename}`);

        return {
          filename,
          success: true,
          duration: Date.now() - fileStartTime
        };
      },
      {
        batchSize: 5,
        maxConcurrency: 3,
        retryOptions: {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 2000,
          onRetry: (error, attempt) => {
            console.warn(`Bulk delete retry (attempt ${attempt}):`, error.message);
          }
        },
        onProgress: (completed, total, failed) => {
          if (completed % 10 === 0 || completed === total) {
            console.log(`Bulk delete progress: ${completed}/${total} (${failed} failed)`);
          }
        }
      }
    );

    // Transform results to match expected format
    const transformedResults: BulkDeleteResult[] = results.map(r => ({
      filename: r.item,
      success: r.success,
      error: r.error?.message,
      duration: r.success ? (r.result as BulkDeleteResult).duration : 0
    }));

    // Count successes and failures
    const successful = transformedResults.filter(r => r.success);
    const failed = transformedResults.filter(r => !r.success);
    const totalDuration = Date.now() - startTime;

    // End tracking bulk operation
    fileOperationTracker.endBulkOperation(operationId, {
      successful: successful.length,
      failed: failed.length,
      errors: failed.map(f => f.error).filter(Boolean) as string[]
    });

    // Log bulk deletion
    if (successful.length > 0) {
      await ActivityLogger.bulkFileDeleted(
        successful.map(r => r.filename),
        undefined,
        undefined
      );
    }

    // Log any errors
    if (failed.length > 0) {
      await ActivityLogger.systemError(`Bulk delete failed for ${failed.length} files`, {
        failedFiles: failed.map(f => ({ filename: f.filename, error: f.error })),
        totalDuration: `${totalDuration}ms`,
        operationId
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${filenames.length} files`,
        results: {
          successful: successful.length,
          failed: failed.length,
          details: transformedResults
        },
      duration: `${totalDuration}ms`,
      operationId,
      throughput: `${(filenames.length / (totalDuration / 1000)).toFixed(2)} files/sec`
    });
    
    } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Bulk delete error:', error);
    
    await ActivityLogger.systemError('Bulk delete operation failed', {
      error: errorMessage,
      duration: `${duration}ms`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(
      { 
        success: false, 
        message: 'Bulk delete operation failed',
        error: errorMessage,
        duration: `${duration}ms`
      },
      { status: 500 }
    );
    }
  });
}
