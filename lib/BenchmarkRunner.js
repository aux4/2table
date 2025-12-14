/**
 * Benchmark Runner - Automated performance testing and comparison
 */
import { PerformanceMonitor } from './PerformanceMonitor.js';

export class BenchmarkRunner {
  constructor() {
    this.benchmarks = new Map();
    this.results = new Map();
  }

  /**
   * Register a benchmark
   */
  register(name, config) {
    this.benchmarks.set(name, {
      name,
      ...config,
      runs: config.runs || 10,
      warmup: config.warmup || 3
    });
  }

  /**
   * Generate test data of specified size and complexity
   */
  generateTestData(size, complexity = 'simple') {
    const data = [];

    for (let i = 0; i < size; i++) {
      let item;

      switch (complexity) {
        case 'simple':
          item = {
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.floor(Math.random() * 1000),
            category: ['A', 'B', 'C'][i % 3]
          };
          break;

        case 'nested':
          item = {
            id: i + 1,
            user: {
              name: `User ${i + 1}`,
              contact: {
                email: `user${i + 1}@example.com`,
                phone: `555-${String(i + 1).padStart(4, '0')}`
              }
            },
            metrics: {
              score: Math.floor(Math.random() * 100),
              level: Math.floor(Math.random() * 10) + 1
            }
          };
          break;

        case 'complex':
          item = {
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            service: ['api', 'web', 'db', 'cache'][i % 4],
            metrics: {
              cpu: Math.random() * 100,
              memory: Math.floor(Math.random() * 4096),
              requests: {
                total: Math.floor(Math.random() * 10000),
                errors: Math.floor(Math.random() * 100)
              }
            },
            details: {
              version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
              region: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'][i % 4]
            },
            tags: [`tag${i % 5}`, `category-${i % 3}`]
          };
          break;

        case 'wide':
          item = {};
          for (let j = 1; j <= 20; j++) {
            item[`col${j}`] = `Value${j}-${i + 1}`;
          }
          break;

        default:
          item = { id: i + 1, value: i + 1 };
      }

      data.push(item);
    }

    return data;
  }

  /**
   * Get structure string for complexity level
   */
  getStructureForComplexity(complexity) {
    switch (complexity) {
      case 'simple':
        return 'id,name,value,category';
      case 'nested':
        return 'id,user[name,contact[email,phone]],metrics[score,level]';
      case 'complex':
        return 'timestamp,service,metrics[cpu,memory,requests[total,errors]],details[version,region],tags';
      case 'wide':
        return Array.from({ length: 20 }, (_, i) => `col${i + 1}`).join(',');
      default:
        return 'id,value';
    }
  }

  /**
   * Run a single benchmark iteration
   */
  async runIteration(benchmark, testData, structure) {
    const monitor = new PerformanceMonitor();
    monitor.enable(true);

    // Import the main functionality
    const { TableParser } = await import('./TableParser.js');
    const { AsciiRenderer } = await import('./AsciiRenderer.js');
    const { Table } = await import('./Table.js');

    const table = new Table();

    // Time the complete operation
    const result = await monitor.time('complete_operation', async () => {
      // Parse data into table
      await monitor.time('parse_into_table', async () => {
        await TableParser.parseIntoTable(table, testData, structure);
      });

      // Render to ASCII
      return monitor.timeSync('ascii_render', () => {
        const renderer = new AsciiRenderer(table);
        return renderer.print();
      });
    }, {
      dataSize: testData.length,
      complexity: benchmark.complexity,
      structure: structure
    });

    return {
      measurements: monitor.getResults(),
      outputSize: result.length,
      monitor
    };
  }

  /**
   * Run a complete benchmark
   */
  async runBenchmark(name) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark '${name}' not found`);
    }

    console.log(`Running benchmark: ${name}`);
    console.log(`Data size: ${benchmark.dataSize}, Complexity: ${benchmark.complexity}`);
    console.log(`Runs: ${benchmark.runs}, Warmup: ${benchmark.warmup}\n`);

    const testData = this.generateTestData(benchmark.dataSize, benchmark.complexity);
    const structure = benchmark.structure || this.getStructureForComplexity(benchmark.complexity);

    const results = {
      name,
      config: benchmark,
      measurements: [],
      summary: {}
    };

    // Warmup runs
    console.log('Warming up...');
    for (let i = 0; i < benchmark.warmup; i++) {
      await this.runIteration(benchmark, testData, structure);
      process.stdout.write('.');
    }
    console.log(' done\n');

    // Actual benchmark runs
    console.log('Running benchmark...');
    for (let i = 0; i < benchmark.runs; i++) {
      const iteration = await this.runIteration(benchmark, testData, structure);
      results.measurements.push(iteration);
      process.stdout.write('.');

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    console.log(' done\n');

    // Calculate statistics
    results.summary = this.calculateSummary(results.measurements);
    this.results.set(name, results);

    return results;
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(measurements) {
    const completeTimes = measurements.map(m =>
      m.measurements.find(measure => measure.label === 'complete_operation')?.duration || 0
    );

    const parseTimes = measurements.map(m =>
      m.measurements.find(measure => measure.label === 'parse_into_table')?.duration || 0
    );

    const renderTimes = measurements.map(m =>
      m.measurements.find(measure => measure.label === 'ascii_render')?.duration || 0
    );

    const memoryUsages = measurements.map(m =>
      m.measurements.find(measure => measure.label === 'complete_operation')?.memoryDelta || 0
    );

    const outputSizes = measurements.map(m => m.outputSize);

    return {
      complete: this.getStats(completeTimes),
      parse: this.getStats(parseTimes),
      render: this.getStats(renderTimes),
      memory: this.getStats(memoryUsages),
      outputSize: this.getStats(outputSizes)
    };
  }

  /**
   * Calculate statistical measures
   */
  getStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    // Calculate variance and std dev
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev,
      values: sorted
    };
  }

  /**
   * Run all registered benchmarks
   */
  async runAll() {
    const results = new Map();

    for (const [name] of this.benchmarks) {
      const result = await this.runBenchmark(name);
      results.set(name, result);
    }

    return results;
  }

  /**
   * Generate performance report
   */
  generateReport(results = this.results) {
    const report = [];
    report.push('=== 2table Performance Benchmark Report ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    for (const [name, result] of results) {
      report.push(`## ${name}`);
      report.push(`Data Size: ${result.config.dataSize} rows`);
      report.push(`Complexity: ${result.config.complexity}`);
      report.push(`Runs: ${result.config.runs} (${result.config.warmup} warmup)`);
      report.push('');

      const { summary } = result;

      report.push('### Complete Operation Performance');
      report.push(`  Mean: ${summary.complete.mean.toFixed(2)}ms`);
      report.push(`  Median: ${summary.complete.median.toFixed(2)}ms`);
      report.push(`  P90: ${summary.complete.p90.toFixed(2)}ms`);
      report.push(`  P95: ${summary.complete.p95.toFixed(2)}ms`);
      report.push(`  Range: ${summary.complete.min.toFixed(2)}ms - ${summary.complete.max.toFixed(2)}ms`);
      report.push(`  Std Dev: ${summary.complete.stdDev.toFixed(2)}ms`);
      report.push('');

      report.push('### Breakdown by Operation');
      report.push(`  Parse: ${summary.parse.mean.toFixed(2)}ms (${(summary.parse.mean / summary.complete.mean * 100).toFixed(1)}%)`);
      report.push(`  Render: ${summary.render.mean.toFixed(2)}ms (${(summary.render.mean / summary.complete.mean * 100).toFixed(1)}%)`);
      report.push('');

      report.push('### Memory Usage');
      report.push(`  Average Delta: ${(summary.memory.mean / (1024 * 1024)).toFixed(2)}MB`);
      report.push(`  Peak Delta: ${(summary.memory.max / (1024 * 1024)).toFixed(2)}MB`);
      report.push('');

      report.push('### Output');
      report.push(`  Average Size: ${(summary.outputSize.mean / 1024).toFixed(2)}KB`);
      report.push('');

      // Performance rating
      const rating = this.getRating(summary.complete.mean, result.config.dataSize);
      report.push(`### Performance Rating: ${rating}`);
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Get performance rating based on time and data size
   */
  getRating(meanTime, dataSize) {
    const timePerRow = meanTime / dataSize;

    if (timePerRow < 0.1) return '🚀 Excellent';
    if (timePerRow < 0.5) return '✅ Good';
    if (timePerRow < 1.0) return '⚠️ Fair';
    if (timePerRow < 2.0) return '🔄 Slow';
    return '🐌 Very Slow';
  }

  /**
   * Compare two benchmark results
   */
  compare(name1, name2) {
    const result1 = this.results.get(name1);
    const result2 = this.results.get(name2);

    if (!result1 || !result2) {
      throw new Error('Both benchmark results must exist for comparison');
    }

    const time1 = result1.summary.complete.mean;
    const time2 = result2.summary.complete.mean;
    const improvement = ((time1 - time2) / time1) * 100;

    return {
      baseline: name1,
      comparison: name2,
      improvement: improvement,
      faster: improvement > 0 ? name2 : name1,
      baselineTime: time1,
      comparisonTime: time2,
      speedupFactor: time1 / time2
    };
  }

  /**
   * Export results for external analysis
   */
  exportResults(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      platform: {
        node: process.version,
        arch: process.arch,
        platform: process.platform
      },
      results: Array.from(this.results.values())
    };

    if (format === 'csv') {
      return this.exportAsCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export as CSV format
   */
  exportAsCSV(data) {
    const headers = [
      'benchmark',
      'dataSize',
      'complexity',
      'meanTime',
      'medianTime',
      'p95Time',
      'parseTime',
      'renderTime',
      'memoryDelta',
      'outputSize'
    ];

    const rows = data.results.map(result => [
      result.name,
      result.config.dataSize,
      result.config.complexity,
      result.summary.complete.mean.toFixed(2),
      result.summary.complete.median.toFixed(2),
      result.summary.complete.p95.toFixed(2),
      result.summary.parse.mean.toFixed(2),
      result.summary.render.mean.toFixed(2),
      (result.summary.memory.mean / (1024 * 1024)).toFixed(2),
      (result.summary.outputSize.mean / 1024).toFixed(2)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}