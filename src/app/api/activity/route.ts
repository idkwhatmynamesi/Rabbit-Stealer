import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import readline from 'readline';

const ACTIVITY_LOG_FILE = path.join(process.cwd(), 'data', 'activity.jsonl'); // Using JSONL format
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB max file size
const MAX_LOGS_IN_MEMORY = 100; // Only keep recent 100 in memory for quick access

interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resource?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
}

// In-memory cache for recent logs (circular buffer)
let recentLogsCache: ActivityLog[] = [];
let cacheInitialized = false;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Rotate log file if it gets too large
async function rotateLogIfNeeded() {
  ensureDataDir();
  
  if (fs.existsSync(ACTIVITY_LOG_FILE)) {
    const stats = fs.statSync(ACTIVITY_LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const archiveFile = path.join(
        process.cwd(), 
        'data', 
        `activity_${Date.now()}.jsonl.gz`
      );
      
      // Simple rotation - just rename old file
      fs.renameSync(ACTIVITY_LOG_FILE, archiveFile.replace('.gz', ''));
      
      // Clear cache when rotating
      recentLogsCache = [];
    }
  }
}

// Append single log entry (efficient - doesn't load entire file)
async function appendLog(log: ActivityLog) {
  ensureDataDir();
  await rotateLogIfNeeded();
  
  // Append to file (one line per log entry)
  const logLine = JSON.stringify(log) + '\n';
  fs.appendFileSync(ACTIVITY_LOG_FILE, logLine);
  
  // Update in-memory cache
  recentLogsCache.push(log);
  if (recentLogsCache.length > MAX_LOGS_IN_MEMORY) {
    recentLogsCache.shift(); // Remove oldest
  }
}

// Stream-read logs without loading all into memory
async function* streamLogs(filter?: { userId?: string; action?: string }): AsyncGenerator<ActivityLog> {
  if (!fs.existsSync(ACTIVITY_LOG_FILE)) {
    return;
  }

  const fileStream = createReadStream(ACTIVITY_LOG_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const log = JSON.parse(line) as ActivityLog;
        
        // Apply filters
        if (filter?.userId && log.userId !== filter.userId) continue;
        if (filter?.action && !log.action.toLowerCase().includes(filter.action.toLowerCase())) continue;
        
        yield log;
      } catch {
        // Skip malformed lines
      }
    }
  }
}

// Get recent logs from cache (very fast)
function getRecentLogs(limit: number = 100): ActivityLog[] {
  return recentLogsCache.slice(-limit);
}

export async function logActivity(
  action: string,
  userId: string,
  status: 'success' | 'failure' | 'warning' = 'success',
  details?: any
) {
  const newLog: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    action,
    details: details ? JSON.stringify(details).substring(0, 500) : undefined, // Limit details size
    timestamp: new Date().toISOString(),
    status
  };

  await appendLog(newLog);
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

    const { action, resource, details, status } = await request.json();

    // Get request headers for additional info
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: payload.userId,
      action,
      resource,
      details: details ? JSON.stringify(details).substring(0, 500) : undefined, // Limit size
      ipAddress,
      userAgent: userAgent.substring(0, 200), // Limit user agent size
      timestamp: new Date().toISOString(),
      status: status || 'success'
    };

    await appendLog(newLog);

    return NextResponse.json({
      success: true,
      log: newLog
    });
  } catch (error) {
    console.error('Activity logging error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log activity' },
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Cap at 500
    const offset = parseInt(searchParams.get('offset') || '0');
    const quickMode = searchParams.get('quick') === 'true'; // Fast mode using cache

    // Quick mode - return from cache (very fast, no file I/O)
    if (quickMode && !userId && !action) {
      const cachedLogs = getRecentLogs(limit);
      return NextResponse.json({
        success: true,
        logs: cachedLogs,
        fromCache: true,
        pagination: {
          total: cachedLogs.length,
          limit,
          offset: 0,
          hasMore: false
        }
      });
    }

    // Stream through logs for filtering (memory efficient)
    const logs: ActivityLog[] = [];
    let totalCount = 0;
    let skipped = 0;

    for await (const log of streamLogs({ userId, action })) {
      totalCount++;
      
      if (skipped < offset) {
        skipped++;
        continue;
      }
      
      if (logs.length < limit) {
        logs.push(log);
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      }
    });
  } catch (error) {
    console.error('Activity retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve activity logs' },
      { status: 500 }
    );
  }
}

// Enhanced cleanup with background processing and better error handling
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
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

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'archive'; // 'archive' or 'purge'
    const beforeDate = searchParams.get('before'); // ISO date string
    
    let archivedCount = 0;
    let remainingCount = 0;

    if (mode === 'purge') {
      // Complete purge - delete all logs
      if (fs.existsSync(ACTIVITY_LOG_FILE)) {
        const stats = fs.statSync(ACTIVITY_LOG_FILE);
        const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB
        
        fs.unlinkSync(ACTIVITY_LOG_FILE);
        recentLogsCache = [];
        
        console.log(`Purged activity log file (${fileSize}MB)`);
      }
      
      return NextResponse.json({
        success: true,
        message: 'All logs purged successfully',
        duration: `${Date.now() - startTime}ms`
      });
    }

    // Archive mode with optional date filtering
    if (fs.existsSync(ACTIVITY_LOG_FILE)) {
      const timestamp = Date.now();
      const archiveFile = path.join(
        process.cwd(), 
        'data', 
        `activity_archive_${timestamp}.jsonl`
      );
      
      // If beforeDate is specified, filter logs
      if (beforeDate) {
        const cutoffDate = new Date(beforeDate);
        const logs: ActivityLog[] = [];
        const archiveLogs: ActivityLog[] = [];
        
        // Read and filter logs
        const fileStream = createReadStream(ACTIVITY_LOG_FILE);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        for await (const line of rl) {
          if (line.trim()) {
            try {
              const log = JSON.parse(line) as ActivityLog;
              const logDate = new Date(log.timestamp);
              
              if (logDate < cutoffDate) {
                archiveLogs.push(log);
              } else {
                logs.push(log);
              }
            } catch {
              // Skip malformed lines
            }
          }
        }

        // Write filtered logs back to main file
        if (logs.length > 0) {
          const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
          fs.writeFileSync(ACTIVITY_LOG_FILE, logLines);
        } else {
          // No remaining logs, remove file
          fs.unlinkSync(ACTIVITY_LOG_FILE);
        }

        // Write archived logs to archive file
        if (archiveLogs.length > 0) {
          const archiveLines = archiveLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
          fs.writeFileSync(archiveFile, archiveLines);
        }

        archivedCount = archiveLogs.length;
        remainingCount = logs.length;
        
        // Update cache with remaining logs
        recentLogsCache = logs.slice(-MAX_LOGS_IN_MEMORY);
        
      } else {
        // Archive entire file
        fs.renameSync(ACTIVITY_LOG_FILE, archiveFile);
        recentLogsCache = [];
        archivedCount = recentLogsCache.length;
      }

      // Compress archived file in background (don't wait for completion)
      setImmediate(async () => {
        try {
          const zlib = await import('zlib');
          const { promisify } = await import('util');
          const gzip = promisify(zlib.gzip);
          
          if (fs.existsSync(archiveFile)) {
            const data = fs.readFileSync(archiveFile);
            const compressed = await gzip(data);
            fs.writeFileSync(`${archiveFile}.gz`, compressed);
            fs.unlinkSync(archiveFile); // Remove uncompressed version
            
            console.log(`Compressed archive: ${archiveFile}.gz`);
          }
        } catch (error) {
          console.error('Failed to compress archive:', error);
        }
      });
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Logs archived successfully',
      details: {
        archivedCount,
        remainingCount,
        mode,
        beforeDate: beforeDate || null
      },
      duration: `${duration}ms`
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Log cleanup error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to clean logs',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      },
      { status: 500 }
    );
  }
}