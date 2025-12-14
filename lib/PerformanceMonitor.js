/**
 * Performance Monitor - Tracks timing and memory usage for 2table operations
 */
export class PerformanceMonitor {
  constructor() {
    this.timers = new Map();
    this.measurements = new Map();

    // Automatically disable in test environments
    const isTestEnvironment = process.env.NODE_ENV === 'test' ||
                               process.env.JEST_WORKER_ID !== undefined ||
                               typeof global.jest !== 'undefined' ||
                               typeof global.test !== 'undefined' ||
                               typeof global.it !== 'undefined';

    this.enabled = process.env.PERF_MONITOR === 'true' && !isTestEnvironment;
    this.results = [];
  }

  /**
   * Enable or disable performance monitoring
   */
  enable(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * Start timing a specific operation
   */
  start(label) {
    if (!this.enabled) return;

    const timestamp = performance.now();
    const memory = this.getMemoryUsage();

    this.timers.set(label, {
      startTime: timestamp,
      startMemory: memory
    });
  }

  /**
   * End timing for an operation and record results
   */
  end(label, metadata = {}) {
    if (!this.enabled) return;

    const timer = this.timers.get(label);
    if (!timer) {
      console.warn(`Performance timer '${label}' was not started`);
      return;
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - timer.startTime;
    const memoryDelta = endMemory.used - timer.startMemory.used;

    const measurement = {
      label,
      duration,
      memoryDelta,
      startMemory: timer.startMemory,
      endMemory,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.measurements.set(label, measurement);
    this.results.push(measurement);
    this.timers.delete(label);

    return measurement;
  }

  /**
   * Time a function execution
   */
  async time(label, fn, metadata = {}) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label, metadata);
      return result;
    } catch (error) {
      this.end(label, { ...metadata, error: error.message });
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync(label, fn, metadata = {}) {
    this.start(label);
    try {
      const result = fn();
      this.end(label, metadata);
      return result;
    } catch (error) {
      this.end(label, { ...metadata, error: error.message });
      throw error;
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }

    // Fallback for browser environments
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }

    return { used: 0, total: 0 };
  }

  /**
   * Get measurement results
   */
  getResults() {
    return [...this.results];
  }

  /**
   * Get latest measurement for a specific label
   */
  getMeasurement(label) {
    return this.measurements.get(label);
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.timers.clear();
    this.measurements.clear();
    this.results = [];
  }

  /**
   * Generate performance report
   */
  generateReport() {
    if (!this.enabled || this.results.length === 0) {
      return 'Performance monitoring is disabled or no measurements available.';
    }

    const report = [];
    report.push('=== Performance Report ===');
    report.push('');

    // Sort results by duration (slowest first)
    const sortedResults = [...this.results].sort((a, b) => b.duration - a.duration);

    report.push('Performance by Duration (slowest first):');
    sortedResults.forEach(result => {
      const memoryMB = (result.memoryDelta / (1024 * 1024)).toFixed(2);
      report.push(`  ${result.label}: ${result.duration.toFixed(2)}ms (${memoryMB}MB memory delta)`);

      if (result.metadata && Object.keys(result.metadata).length > 0) {
        report.push(`    Metadata: ${JSON.stringify(result.metadata)}`);
      }
    });

    report.push('');

    // Summary statistics
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgTime = totalTime / this.results.length;
    const totalMemory = this.results.reduce((sum, r) => sum + Math.abs(r.memoryDelta), 0);

    report.push('Summary:');
    report.push(`  Total operations: ${this.results.length}`);
    report.push(`  Total time: ${totalTime.toFixed(2)}ms`);
    report.push(`  Average time: ${avgTime.toFixed(2)}ms`);
    report.push(`  Total memory impact: ${(totalMemory / (1024 * 1024)).toFixed(2)}MB`);

    return report.join('\n');
  }

  /**
   * Export results as JSON
   */
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      enabled: this.enabled,
      measurements: this.results,
      summary: {
        totalOperations: this.results.length,
        totalTime: this.results.reduce((sum, r) => sum + r.duration, 0),
        avgTime: this.results.length > 0 ? this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length : 0,
        totalMemoryDelta: this.results.reduce((sum, r) => sum + Math.abs(r.memoryDelta), 0)
      }
    };
  }

  /**
   * Create a performance decorator for timing method calls
   */
  createDecorator(prefix = '') {
    return (target, propertyName, descriptor) => {
      const method = descriptor.value;

      descriptor.value = function(...args) {
        const label = prefix ? `${prefix}.${propertyName}` : propertyName;
        const monitor = this.performanceMonitor || PerformanceMonitor.getInstance();

        return monitor.timeSync(label, () => method.apply(this, args), {
          className: target.constructor.name,
          methodName: propertyName,
          argsCount: args.length
        });
      };

      return descriptor;
    };
  }

  /**
   * Singleton instance for global access
   */
  static getInstance() {
    if (!PerformanceMonitor._instance) {
      PerformanceMonitor._instance = new PerformanceMonitor();
    }
    return PerformanceMonitor._instance;
  }

  /**
   * Enable performance monitoring globally
   */
  static enable(enabled = true) {
    PerformanceMonitor.getInstance().enable(enabled);
  }

  /**
   * Global timing functions
   */
  static start(label) {
    return PerformanceMonitor.getInstance().start(label);
  }

  static end(label, metadata) {
    return PerformanceMonitor.getInstance().end(label, metadata);
  }

  static time(label, fn, metadata) {
    return PerformanceMonitor.getInstance().time(label, fn, metadata);
  }

  static timeSync(label, fn, metadata) {
    return PerformanceMonitor.getInstance().timeSync(label, fn, metadata);
  }

  static getResults() {
    return PerformanceMonitor.getInstance().getResults();
  }

  static generateReport() {
    return PerformanceMonitor.getInstance().generateReport();
  }

  static clear() {
    return PerformanceMonitor.getInstance().clear();
  }
}