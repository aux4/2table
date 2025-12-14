# 2table Performance Monitoring & Benchmarking

This document describes the performance monitoring and benchmarking capabilities built into the 2table package.

## Performance Monitoring

### Environment Variable

Enable performance monitoring by setting the `PERF_MONITOR` environment variable:

```bash
PERF_MONITOR=true aux4 2table ascii 'name,age' < data.json
```

When enabled, performance reports are automatically generated and displayed after the table output.

### Sample Output

```
=== Performance Report ===

Performance by Duration (slowest first):
  TableParser.parseIntoTable: 15.42ms (2.1MB memory delta)
  AsciiRenderer.print: 8.73ms (0.8MB memory delta)
  AsciiRenderer.calculateColumnWidths: 3.21ms (0.2MB memory delta)
  TableParser.buildFieldColumnMap: 1.87ms (0.1MB memory delta)

Summary:
  Total operations: 4
  Total time: 29.23ms
  Average time: 7.31ms
  Total memory impact: 3.2MB
```

## Benchmarking Scripts

### Available Commands

```bash
# Run all benchmarks
npm run benchmark

# Quick benchmark suite
npm run benchmark:quick

# Detailed profiling
npm run benchmark:profile

# Performance comparison
npm run benchmark:compare

# Run specific benchmark
npm run benchmark single medium_nested

# List available benchmarks
npm run benchmark list
```

### Benchmark Suites

#### Quick Benchmarks (~2 minutes)
- `small_simple`: 10 rows, simple structure
- `small_nested`: 10 rows, nested objects
- `medium_simple`: 100 rows, simple structure
- `medium_nested`: 100 rows, nested objects

#### Full Benchmarks (~10 minutes)
- All quick benchmarks plus:
- `medium_complex`: 50 rows, complex nested structure
- `large_simple`: 1000 rows, simple structure
- `large_nested`: 500 rows, nested objects
- `large_complex`: 200 rows, complex structure
- `wide_small`: 50 rows, 20 columns
- `wide_large`: 200 rows, 20 columns

### Sample Benchmark Report

```
=== 2table Performance Benchmark Report ===
Generated: 2023-12-13T20:30:00.000Z

## medium_nested
Data Size: 100 rows
Complexity: nested
Runs: 15 (3 warmup)

### Complete Operation Performance
  Mean: 42.15ms
  Median: 41.80ms
  P90: 45.20ms
  P95: 46.85ms
  Range: 38.90ms - 48.30ms
  Std Dev: 2.45ms

### Breakdown by Operation
  Parse: 28.60ms (67.8%)
  Render: 13.55ms (32.2%)

### Memory Usage
  Average Delta: 1.85MB
  Peak Delta: 2.10MB

### Output
  Average Size: 3.2KB

### Performance Rating: ✅ Good
```

## Performance Optimizations Implemented

### 1. ANSI-Stripped Length Caching
- **Location**: `AsciiRenderer.js`
- **Optimization**: Caches results of ANSI code removal and text length calculations
- **Benefit**: Eliminates repeated regex operations on identical text

### 2. Double-Nested Map Iteration Elimination
- **Location**: `TableParser.js`
- **Optimization**: Replaced O(n²) nested loops with direct Map lookups
- **Benefit**: Significant performance improvement for large datasets

### 3. Pre-Computed Field Level Calculations
- **Location**: `TableParser.js`
- **Optimization**: Pre-computes field levels and paths during structure parsing
- **Benefit**: Eliminates repeated path parsing during data extraction

### 4. Batch Cell Operations
- **Location**: `TableParser.js`
- **Optimization**: Collects all cell operations and executes them in batches
- **Benefit**: Reduces table manipulation overhead

## Performance Test Files

### Test Suites
- `package/test/performance.test.md` - Performance benchmarks for aux4 test framework
- `package/test/performance-comparison.test.md` - Before/after performance comparisons

### Test Data Generators
The `BenchmarkRunner` class includes built-in test data generators for different complexity levels:

- **Simple**: Basic flat objects with 4 fields
- **Nested**: 2-level nested objects with contact information
- **Complex**: 3-level nested objects with arrays and metadata
- **Wide**: Single-level objects with 20 columns

## Monitoring API

### PerformanceMonitor Class

```javascript
import { PerformanceMonitor } from './lib/PerformanceMonitor.js';

// Enable monitoring
PerformanceMonitor.enable(true);

// Time a function
const result = PerformanceMonitor.timeSync('operation_name', () => {
  // Your code here
});

// Get results
const report = PerformanceMonitor.generateReport();
console.log(report);
```

### Available Methods

- `PerformanceMonitor.enable(enabled)` - Enable/disable monitoring
- `PerformanceMonitor.start(label)` - Start timing an operation
- `PerformanceMonitor.end(label, metadata)` - End timing and record results
- `PerformanceMonitor.time(label, fn, metadata)` - Time an async function
- `PerformanceMonitor.timeSync(label, fn, metadata)` - Time a sync function
- `PerformanceMonitor.generateReport()` - Generate performance report
- `PerformanceMonitor.clear()` - Clear all measurements

## Performance Baselines

Based on benchmarking on a modern development machine:

### Expected Performance (per 1000 rows)
- **Simple tables**: < 50ms
- **Nested tables**: < 100ms
- **Complex tables**: < 200ms
- **Wide tables (20+ cols)**: < 150ms

### Performance Ratings
- 🚀 **Excellent**: < 0.1ms per row
- ✅ **Good**: 0.1-0.5ms per row
- ⚠️ **Fair**: 0.5-1.0ms per row
- 🔄 **Slow**: 1.0-2.0ms per row
- 🐌 **Very Slow**: > 2.0ms per row

## Troubleshooting Performance Issues

### Enable Detailed Monitoring
```bash
PERF_MONITOR=true aux4 2table ascii 'structure' < data.json
```

### Run Profiling Test
```bash
npm run benchmark:profile
```

### Check for Bottlenecks
1. Look for operations taking > 50% of total time
2. Check memory delta for memory leaks
3. Compare against performance baselines
4. Use `npm run benchmark:compare` to compare different configurations

### Common Performance Issues
1. **Large nested structures**: Use simpler structure or reduce nesting depth
2. **Wide tables**: Consider splitting into multiple tables
3. **Large datasets**: Process in chunks or use streaming
4. **Memory growth**: Check for circular references in JSON data

## Continuous Performance Monitoring

### CI/CD Integration
Add performance regression tests to your CI pipeline:

```bash
# Run quick benchmarks and fail if performance degrades
npm run benchmark:quick > performance-results.txt
# Add logic to compare with baseline and fail build if regression detected
```

### Performance Budgets
Consider setting performance budgets based on your use case:
- Maximum processing time per 1000 rows
- Maximum memory usage
- Maximum output generation time

The benchmark results can be exported as JSON or CSV for integration with monitoring systems.