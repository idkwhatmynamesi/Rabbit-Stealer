import fs from 'fs';
import path from 'path';
import { withFileLock } from './file-lock';

const ACTIVITY_LOG_FILE = path.join(process.cwd(), 'data', 'activity-log.json');
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries
const BATCH_SIZE = 50; // Process logs in batches
const BATCH_TIMEOUT = 2000; // 2 seconds

export interface ActivityLog {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'success';
}

// Batching system for high-performance logging
let logBatch: ActivityLog[] = [];
let batchTimer: NodeJS.Timeout | null = null;
let isProcessingBatch = false;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadActivityLogs(): ActivityLog[] {
  ensureDataDir();
  if (fs.existsSync(ACTIVITY_LOG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

async function saveActivityLogs(logs: ActivityLog[]) {
  ensureDataDir();
  // Keep only the last MAX_LOG_ENTRIES
  const logsToSave = logs.slice(-MAX_LOG_ENTRIES);
  
  // Use file locking to prevent concurrent writes
  await withFileLock(ACTIVITY_LOG_FILE, async () => {
    fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(logsToSave, null, 2));
  }, { timeout: 5000 }); // 5 second timeout for log writes
}

// Process batch of logs asynchronously
async function processBatch() {
  if (isProcessingBatch || logBatch.length === 0) return;
  
  isProcessingBatch = true;
  const currentBatch = [...logBatch];
  logBatch = [];
  
  try {
    // Load existing logs
    const existingLogs = loadActivityLogs();
    
    // Add new logs
    existingLogs.push(...currentBatch);
    
    // Save all logs
    await saveActivityLogs(existingLogs);
    
    // Trigger webhooks for batch (if needed)
    for (const log of currentBatch) {
      try {
        const { triggerWebhooks } = await import('@/app/api/webhooks/route');
        await triggerWebhooks(`activity.${log.event}`, log);
      } catch (error) {
        console.error('Failed to trigger webhook for activity:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process log batch:', error);
    // Re-add failed logs to batch for retry
    logBatch.unshift(...currentBatch);
  } finally {
    isProcessingBatch = false;
    
    // Process any logs that accumulated during processing
    if (logBatch.length > 0) {
      setTimeout(processBatch, 100);
    }
  }
}

// Schedule batch processing
function scheduleBatchProcessing() {
  if (batchTimer) {
    clearTimeout(batchTimer);
  }
  
  batchTimer = setTimeout(async () => {
    await processBatch();
    batchTimer = null;
  }, BATCH_TIMEOUT);
}

export async function logActivity(
  event: string,
  description: string,
  options: {
    userId?: string;
    userEmail?: string;
    ip?: string;
    metadata?: Record<string, any>;
    severity?: 'info' | 'warning' | 'error' | 'success';
    triggerWebhook?: boolean;
    immediate?: boolean; // Force immediate processing (for critical events)
  } = {}
) {
  const log: ActivityLog = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    timestamp: new Date().toISOString(),
    event,
    description,
    userId: options.userId,
    userEmail: options.userEmail,
    ip: options.ip,
    metadata: options.metadata,
    severity: options.severity || 'info'
  };

  // For immediate processing (critical events like errors)
  if (options.immediate) {
    try {
      const logs = loadActivityLogs();
      logs.push(log);
      await saveActivityLogs(logs);
      
      if (options.triggerWebhook !== false) {
        const { triggerWebhooks } = await import('@/app/api/webhooks/route');
        await triggerWebhooks(`activity.${event}`, log);
      }
    } catch (error) {
      console.error('Failed to immediately process log:', error);
    }
    return log;
  }

  // Add to batch for async processing
  logBatch.push(log);
  
  // Process immediately if batch is full
  if (logBatch.length >= BATCH_SIZE) {
    setImmediate(processBatch);
  } else {
    // Schedule batch processing
    scheduleBatchProcessing();
  }

  return log;
}

export function getActivityLogs(
  filters?: {
    event?: string;
    userId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): ActivityLog[] {
  let logs = loadActivityLogs();

  if (filters) {
    if (filters.event) {
      logs = logs.filter(log => log.event === filters.event);
    }
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate!);
    }
    if (filters.limit) {
      logs = logs.slice(-filters.limit);
    }
  }

  // Return in reverse chronological order
  return logs.reverse();
}

export async function clearActivityLogs(before?: Date): Promise<number> {
  let logs = loadActivityLogs();
  const originalCount = logs.length;

  if (before) {
    logs = logs.filter(log => new Date(log.timestamp) >= before);
  } else {
    logs = [];
  }

  await saveActivityLogs(logs);
  return originalCount - logs.length;
}

// Predefined activity loggers for common events
export const ActivityLogger = {
  fileUploaded: (filename: string, size: number, userId?: string, userEmail?: string) =>
    logActivity('file.uploaded', `File uploaded: ${filename}`, {
      userId,
      userEmail,
      metadata: { filename, size },
      severity: 'success'
    }),

  fileDeleted: (filename: string, userId?: string, userEmail?: string) =>
    logActivity('file.deleted', `File deleted: ${filename}`, {
      userId,
      userEmail,
      metadata: { filename },
      severity: 'warning'
    }),

  bulkFileDeleted: (filenames: string[], userId?: string, userEmail?: string) =>
    logActivity('file.bulk_deleted', `Bulk deleted ${filenames.length} files`, {
      userId,
      userEmail,
      metadata: { filenames, count: filenames.length },
      severity: 'warning'
    }),

  fileAnalyzed: (filename: string, result: any, userId?: string) =>
    logActivity('file.analyzed', `File analyzed: ${filename}`, {
      userId,
      metadata: { filename, result },
      severity: 'info'
    }),

  userLogin: (email: string, ip: string, userId: string) =>
    logActivity('user.login', `User logged in: ${email}`, {
      userId,
      userEmail: email,
      ip,
      severity: 'info'
    }),

  userLogout: (email: string, userId: string) =>
    logActivity('user.logout', `User logged out: ${email}`, {
      userId,
      userEmail: email,
      severity: 'info'
    }),

  userRegistered: (email: string, userId: string) =>
    logActivity('user.registered', `New user registered: ${email}`, {
      userId,
      userEmail: email,
      severity: 'success'
    }),

  webhookCreated: (name: string, url: string, userId: string) =>
    logActivity('webhook.created', `Webhook created: ${name}`, {
      userId,
      metadata: { name, url },
      severity: 'success'
    }),

  webhookTriggered: (name: string, event: string, success: boolean) =>
    logActivity('webhook.triggered', `Webhook ${name} triggered for ${event}`, {
      metadata: { name, event, success },
      severity: success ? 'success' : 'error'
    }),

  apiKeyCreated: (name: string, userId: string) =>
    logActivity('api_key.created', `API key created: ${name}`, {
      userId,
      metadata: { name },
      severity: 'success'
    }),

  apiKeyRevoked: (name: string, userId: string) =>
    logActivity('api_key.revoked', `API key revoked: ${name}`, {
      userId,
      metadata: { name },
      severity: 'warning'
    }),

  securityAlert: (type: string, description: string, metadata?: any) =>
    logActivity('security.alert', description, {
      metadata: { type, ...metadata },
      severity: 'error'
    }),

  systemError: (error: string, context?: any) =>
    logActivity('system.error', `System error: ${error}`, {
      metadata: { error, context },
      severity: 'error',
      immediate: true // Process errors immediately
    }),

  // Force immediate processing of all pending logs
  flush: async () => {
    if (logBatch.length > 0) {
      await processBatch();
    }
  }
};