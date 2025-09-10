interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];

  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata
    });
  }

  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' was not started`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...additionalMetadata }
    };

    this.completedMetrics.push(completedMetric);
    this.metrics.delete(name);

    return duration;
  }

  async measure<T>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await operation();
      this.end(name, { success: true });
      return result;
    } catch (error) {
      this.end(name, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  getMetrics(filter?: { name?: string; minDuration?: number; maxDuration?: number }): PerformanceMetric[] {
    let filtered = this.completedMetrics;

    if (filter) {
      if (filter.name) {
        filtered = filtered.filter(m => m.name.includes(filter.name!));
      }
      if (filter.minDuration !== undefined) {
        filtered = filtered.filter(m => (m.duration || 0) >= filter.minDuration!);
      }
      if (filter.maxDuration !== undefined) {
        filtered = filtered.filter(m => (m.duration || 0) <= filter.maxDuration!);
      }
    }

    return filtered.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  }

  getStats(name?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    successRate: number;
  } {
    const metrics = name 
      ? this.completedMetrics.filter(m => m.name === name)
      : this.completedMetrics;

    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        successRate: 0
      };
    }

    const durations = metrics.map(m => m.duration || 0);
    const successful = metrics.filter(m => m.metadata?.success !== false).length;

    return {
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((a, b) => a + b, 0),
      successRate: (successful / metrics.length) * 100
    };
  }

  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  logStats(name?: string): void {
    const stats = this.getStats(name);
    const prefix = name ? `[${name}]` : '[All Operations]';
    
    console.log(`${prefix} Performance Stats:`, {
      count: stats.count,
      avgDuration: `${stats.avgDuration.toFixed(2)}ms`,
      minDuration: `${stats.minDuration}ms`,
      maxDuration: `${stats.maxDuration}ms`,
      totalDuration: `${stats.totalDuration}ms`,
      successRate: `${stats.successRate.toFixed(1)}%`
    });
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring function performance
export function measurePerformance(name?: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    } as T;

    return descriptor;
  };
}

// Utility for measuring API endpoint performance
export function measureApiEndpoint(endpointName: string) {
  return async function <T>(operation: () => Promise<T>): Promise<T> {
    return performanceMonitor.measure(`API:${endpointName}`, operation);
  };
}

// High-level performance tracking for file operations
export class FileOperationTracker {
  private static instance: FileOperationTracker;
  private operations: Map<string, { startTime: number; metadata: any }> = new Map();

  static getInstance(): FileOperationTracker {
    if (!FileOperationTracker.instance) {
      FileOperationTracker.instance = new FileOperationTracker();
    }
    return FileOperationTracker.instance;
  }

  startBulkOperation(operationType: 'delete' | 'upload' | 'download', fileCount: number, metadata?: any): string {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.operations.set(operationId, {
      startTime: Date.now(),
      metadata: { operationType, fileCount, ...metadata }
    });

    performanceMonitor.start(`bulk-${operationType}`, { fileCount, operationId, ...metadata });
    
    return operationId;
  }

  endBulkOperation(operationId: string, results: { successful: number; failed: number; errors?: string[] }): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    const duration = Date.now() - operation.startTime;
    const { operationType, fileCount } = operation.metadata;

    performanceMonitor.end(`bulk-${operationType}`, {
      duration,
      fileCount,
      successful: results.successful,
      failed: results.failed,
      successRate: (results.successful / fileCount) * 100,
      throughput: fileCount / (duration / 1000), // files per second
      errors: results.errors
    });

    this.operations.delete(operationId);

    // Log performance summary
    console.log(`Bulk ${operationType} completed:`, {
      operationId,
      duration: `${duration}ms`,
      fileCount,
      successful: results.successful,
      failed: results.failed,
      throughput: `${(fileCount / (duration / 1000)).toFixed(2)} files/sec`
    });
  }

  getActiveOperations(): Array<{ id: string; type: string; duration: number; fileCount: number }> {
    const now = Date.now();
    return Array.from(this.operations.entries()).map(([id, op]) => ({
      id,
      type: op.metadata.operationType,
      duration: now - op.startTime,
      fileCount: op.metadata.fileCount
    }));
  }
}

export const fileOperationTracker = FileOperationTracker.getInstance();
