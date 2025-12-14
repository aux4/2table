#!/usr/bin/env node

/**
 * 2table Benchmark Script
 * Run comprehensive performance tests and generate reports
 */

import { BenchmarkRunner } from '../lib/BenchmarkRunner.js';
import { PerformanceMonitor } from '../lib/PerformanceMonitor.js';
import fs from 'fs/promises';
import path from 'path';

class BenchmarkCLI {
  constructor() {
    this.runner = new BenchmarkRunner();
    this.setupDefaultBenchmarks();
  }

  setupDefaultBenchmarks() {
    // Small dataset benchmarks
    this.runner.register('small_simple', {
      dataSize: 10,
      complexity: 'simple',
      runs: 20,
      warmup: 5
    });

    this.runner.register('small_nested', {
      dataSize: 10,
      complexity: 'nested',
      runs: 20,
      warmup: 5
    });

    // Medium dataset benchmarks
    this.runner.register('medium_simple', {
      dataSize: 100,
      complexity: 'simple',
      runs: 15,
      warmup: 3
    });

    this.runner.register('medium_nested', {
      dataSize: 100,
      complexity: 'nested',
      runs: 15,
      warmup: 3
    });

    this.runner.register('medium_complex', {
      dataSize: 50,
      complexity: 'complex',
      runs: 10,
      warmup: 3
    });

    // Large dataset benchmarks
    this.runner.register('large_simple', {
      dataSize: 1000,
      complexity: 'simple',
      runs: 10,
      warmup: 2
    });

    this.runner.register('large_nested', {
      dataSize: 500,
      complexity: 'nested',
      runs: 8,
      warmup: 2
    });

    this.runner.register('large_complex', {
      dataSize: 200,
      complexity: 'complex',
      runs: 5,
      warmup: 2
    });

    // Wide table benchmarks
    this.runner.register('wide_small', {
      dataSize: 50,
      complexity: 'wide',
      runs: 10,
      warmup: 3
    });

    this.runner.register('wide_large', {
      dataSize: 200,
      complexity: 'wide',
      runs: 5,
      warmup: 2
    });
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    console.log('🚀 2table Performance Benchmarks');
    console.log('================================\n');

    switch (command) {
      case 'all':
        await this.runAllBenchmarks();
        break;
      case 'quick':
        await this.runQuickBenchmarks();
        break;
      case 'single':
        const benchmarkName = args[1];
        if (!benchmarkName) {
          console.error('Please specify a benchmark name');
          process.exit(1);
        }
        await this.runSingleBenchmark(benchmarkName);
        break;
      case 'list':
        this.listBenchmarks();
        break;
      case 'compare':
        await this.runComparison();
        break;
      case 'profile':
        await this.runProfileTest();
        break;
      default:
        this.showHelp();
    }
  }

  async runAllBenchmarks() {
    console.log('Running all benchmarks...\n');

    try {
      const results = await this.runner.runAll();

      // Generate and display report
      const report = this.runner.generateReport();
      console.log(report);

      // Save results
      await this.saveResults(results, 'full_benchmark');

      console.log('\n✅ All benchmarks completed successfully!');
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }

  async runQuickBenchmarks() {
    console.log('Running quick benchmarks...\n');

    const quickBenchmarks = [
      'small_simple',
      'small_nested',
      'medium_simple',
      'medium_nested'
    ];

    try {
      for (const name of quickBenchmarks) {
        await this.runner.runBenchmark(name);
      }

      const report = this.runner.generateReport();
      console.log(report);

      await this.saveResults(this.runner.results, 'quick_benchmark');

      console.log('\n✅ Quick benchmarks completed!');
    } catch (error) {
      console.error('❌ Quick benchmark failed:', error.message);
      process.exit(1);
    }
  }

  async runSingleBenchmark(name) {
    console.log(`Running benchmark: ${name}\n`);

    try {
      const result = await this.runner.runBenchmark(name);

      // Display results
      console.log('\n=== Results ===');
      console.log(`Mean time: ${result.summary.complete.mean.toFixed(2)}ms`);
      console.log(`P95 time: ${result.summary.complete.p95.toFixed(2)}ms`);
      console.log(`Memory delta: ${(result.summary.memory.mean / (1024 * 1024)).toFixed(2)}MB`);

      console.log('\n✅ Benchmark completed!');
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }

  listBenchmarks() {
    console.log('Available benchmarks:\n');

    for (const [name, config] of this.runner.benchmarks) {
      console.log(`  ${name}:`);
      console.log(`    Data size: ${config.dataSize}`);
      console.log(`    Complexity: ${config.complexity}`);
      console.log(`    Runs: ${config.runs}`);
      console.log('');
    }
  }

  async runComparison() {
    console.log('Running performance comparison...\n');

    try {
      // Run baseline benchmarks
      await this.runner.runBenchmark('medium_simple');
      await this.runner.runBenchmark('medium_nested');

      // Compare results
      const comparison = this.runner.compare('medium_simple', 'medium_nested');

      console.log('=== Performance Comparison ===');
      console.log(`Baseline: ${comparison.baseline} (${comparison.baselineTime.toFixed(2)}ms)`);
      console.log(`Comparison: ${comparison.comparison} (${comparison.comparisonTime.toFixed(2)}ms)`);
      console.log(`${comparison.faster} is ${Math.abs(comparison.improvement).toFixed(1)}% ${comparison.improvement > 0 ? 'faster' : 'slower'}`);
      console.log(`Speedup factor: ${comparison.speedupFactor.toFixed(2)}x`);

    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
      process.exit(1);
    }
  }

  async runProfileTest() {
    console.log('Running detailed profiling test...\n');

    // Enable detailed monitoring
    PerformanceMonitor.enable(true);

    try {
      const testData = this.runner.generateTestData(100, 'nested');
      const structure = this.runner.getStructureForComplexity('nested');

      // Import modules for manual profiling
      const { TableParser } = await import('../lib/TableParser.js');
      const { AsciiRenderer } = await import('../lib/AsciiRenderer.js');
      const { Table } = await import('../lib/Table.js');

      console.log('Profiling table generation...');

      const table = new Table();

      // Profile each step
      PerformanceMonitor.start('profile_test');

      await TableParser.parseIntoTable(table, testData, structure);
      const renderer = new AsciiRenderer(table);
      const output = renderer.print();

      PerformanceMonitor.end('profile_test');

      // Generate detailed report
      const report = PerformanceMonitor.generateReport();
      console.log(report);

      console.log(`\nOutput size: ${(output.length / 1024).toFixed(2)}KB`);
      console.log('✅ Profiling completed!');

    } catch (error) {
      console.error('❌ Profiling failed:', error.message);
      process.exit(1);
    }
  }

  async saveResults(results, filename) {
    try {
      const resultsDir = './benchmark-results';
      await fs.mkdir(resultsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFile = path.join(resultsDir, `${filename}-${timestamp}.json`);
      const csvFile = path.join(resultsDir, `${filename}-${timestamp}.csv`);

      // Save JSON
      await fs.writeFile(jsonFile, this.runner.exportResults('json'));

      // Save CSV
      await fs.writeFile(csvFile, this.runner.exportResults('csv'));

      console.log(`\n📊 Results saved:`);
      console.log(`  JSON: ${jsonFile}`);
      console.log(`  CSV: ${csvFile}`);
    } catch (error) {
      console.warn(`Warning: Could not save results: ${error.message}`);
    }
  }

  showHelp() {
    console.log('Usage: node benchmark.js [command]\n');
    console.log('Commands:');
    console.log('  all              Run all benchmarks (default)');
    console.log('  quick            Run quick benchmark suite');
    console.log('  single <name>    Run a specific benchmark');
    console.log('  list             List available benchmarks');
    console.log('  compare          Compare performance between configurations');
    console.log('  profile          Run detailed profiling test');
    console.log('  help             Show this help\n');

    console.log('Examples:');
    console.log('  node benchmark.js quick');
    console.log('  node benchmark.js single medium_nested');
    console.log('  node benchmark.js compare');
  }
}

// Run the CLI
const cli = new BenchmarkCLI();
cli.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});