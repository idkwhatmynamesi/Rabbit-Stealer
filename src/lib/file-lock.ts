import fs from 'fs';
import path from 'path';

interface LockOptions {
  timeout?: number; // milliseconds
  retryInterval?: number; // milliseconds
  maxRetries?: number;
}

class FileLock {
  private lockFile: string;
  private locked: boolean = false;
  private lockStartTime?: number;

  constructor(private filePath: string) {
    this.lockFile = `${filePath}.lock`;
  }

  async acquire(options: LockOptions = {}): Promise<boolean> {
    const {
      timeout = 30000, // 30 seconds default timeout
      retryInterval = 100, // 100ms retry interval
      maxRetries = Math.floor(timeout / retryInterval)
    } = options;

    this.lockStartTime = Date.now();
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Try to create lock file exclusively
        fs.writeFileSync(this.lockFile, JSON.stringify({
          pid: process.pid,
          timestamp: Date.now(),
          filePath: this.filePath
        }), { flag: 'wx' });
        
        this.locked = true;
        return true;
        
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, check if it's stale
          if (await this.isLockStale()) {
            await this.forceRelease();
            continue; // Try again
          }
          
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          retries++;
        } else {
          // Other error, can't acquire lock
          throw error;
        }
      }
    }

    return false; // Timeout reached
  }

  async release(): Promise<void> {
    if (!this.locked) return;

    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      console.error('Error releasing file lock:', error);
    } finally {
      this.locked = false;
      this.lockStartTime = undefined;
    }
  }

  private async isLockStale(staleTimeout: number = 60000): Promise<boolean> {
    try {
      if (!fs.existsSync(this.lockFile)) return true;

      const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf-8'));
      const lockAge = Date.now() - lockData.timestamp;

      // Check if lock is older than stale timeout
      if (lockAge > staleTimeout) {
        return true;
      }

      // Check if the process that created the lock is still running
      try {
        process.kill(lockData.pid, 0); // Signal 0 checks if process exists
        return false; // Process exists, lock is not stale
      } catch {
        return true; // Process doesn't exist, lock is stale
      }
    } catch {
      return true; // Can't read lock file, consider it stale
    }
  }

  private async forceRelease(): Promise<void> {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
    } catch (error) {
      console.error('Error force-releasing stale lock:', error);
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  getLockDuration(): number {
    return this.lockStartTime ? Date.now() - this.lockStartTime : 0;
  }
}

// Global lock registry to prevent multiple locks on same file
const lockRegistry = new Map<string, FileLock>();

export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const normalizedPath = path.resolve(filePath);
  
  // Get or create lock for this file
  let lock = lockRegistry.get(normalizedPath);
  if (!lock) {
    lock = new FileLock(normalizedPath);
    lockRegistry.set(normalizedPath, lock);
  }

  // Acquire lock
  const acquired = await lock.acquire(options);
  if (!acquired) {
    throw new Error(`Failed to acquire lock for ${filePath} after ${options.timeout || 30000}ms`);
  }

  try {
    // Execute operation with lock held
    return await operation();
  } finally {
    // Always release lock
    await lock.release();
    
    // Clean up registry if no longer locked
    if (!lock.isLocked()) {
      lockRegistry.delete(normalizedPath);
    }
  }
}

export { FileLock };
