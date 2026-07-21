# 2table Package Development Guide

## Project Overview

The 2table package is a hierarchical JSON-to-table converter that transforms complex nested JSON structures into well-formatted ASCII and Markdown tables, or into CSV. It has been completely rearchitected using design patterns to eliminate complex conditional logic and provide maintainable, extensible code with high-performance optimizations.

Each output format is its own renderer (Strategy) class that reads the shared `Table` cell model and emits a string via `print()`: `AsciiRenderer`, `MarkdownRenderer`, `CsvRenderer`. The renderer is selected by the `format` string in `executable.js`. To add a format, add a new `*Renderer` class and one dispatch branch — never branch on format inside an existing renderer.

`CsvRenderer` emits RFC 4180 CSV (quotes a field containing a comma, double quote, CR or LF; doubles embedded quotes), ignores ANSI colors and column-width formatting, and flattens multi-level headers into a single header row using the dot-notation label convention (`address[street,city]` -> `address.street`, `address.city`). It derives the flattened header labels from the parsed structure (`Structure.js`) rather than inferring them spatially from header cells, because a top-level leaf placed between two groups is spatially ambiguous.

## Architecture

### Design Patterns Implemented

The codebase follows a strict design pattern approach to avoid complex `if` statements and promote maintainability:

#### Strategy Pattern
- **ContentExtractor**: Handles different property access methods (direct vs dot notation, invalid line extraction)
- **DataFormatter**: Manages nested object and array formatting
- **HeaderStrategy**: Generates single-level and multi-level headers
- **AlignmentStrategy + AlignmentFactory**: Handles text alignment (left, right, center)
- **ContentTypeStrategy**: Type detection and handling for different content types
- **LineNumberStrategy**: Manages line number column injection
- **InvalidLineStrategy**: Handles invalid line data processing and structure modification
- **InvalidRowStrategy**: Manages invalid row rendering with proper spanning and red colorization

#### Other Patterns
- **Builder Pattern**: TableBuilder for table construction
- **Composite Pattern**: TableRow and Cell structures
- **Visitor Pattern**: Cell context communication (isLastColumn)
- **Factory Pattern**: AlignmentFactory for creating alignment strategies

#### Value Formatting (Strategy + Factory)
- **Location**: `lib/ValueFormatter.js`, wired in `lib/TableParser.js` (`populateDataItem`)
- **Purpose**: Implements the per-column `{format:...}` modifier (number, currency, percent, date, time, datetime). Each format type is its own strategy class (`NumberFormatter`, `CurrencyFormatter`, `PercentFormatter`, `DateFormatter`, `TimeFormatter`, `DateTimeFormatter`); `IdentityFormatter` is the default that returns values unchanged so existing behavior is untouched.
- **Dispatch**: `ValueFormatterFactory.create(columnFormat)` maps the `format` type string to a strategy via a lookup registry (`FORMATTER_REGISTRY`) — never a switch/if. Adding a format type = one class + one registry entry.
- **Contract**: each strategy exposes `format(value)` (returns a display string, or the original value on empty/un-parseable input — never "NaN"/"Invalid Date") and `rightAligned(value)` (numeric strategies request right alignment; temporal/identity do not). Empty/NaN/Invalid-Date guarding lives in the `NumericFormatter`/`TemporalFormatter` base classes, not in scattered ifs.
- **Temporal style**: the unified `style` option is the primary key for temporal presentation — it sets the dateStyle for `date`, the timeStyle for `time`, and BOTH parts for `datetime`. `dateStyle`/`timeStyle` remain as per-part overrides. Precedence per part is resolved via the `resolveTemporalStyle(explicit, style, fallback)` helper (`optionValue(explicit) ?? optionValue(style) ?? fallback`) — explicit part style > `style` > built-in default (date medium, time medium, datetime = date medium + time short). No if-chains; blank/whitespace options are treated as absent by `optionValue`. Valid values: `short|medium|long|full`.
- **Where it runs**: `TableParser.populateDataItem` builds one formatter per column (cached in `columnMetadata`) and applies `formatter.format(rawValue)` BEFORE `formatCellValue`, so ASCII/Markdown/CSV all receive identical formatted values. Auto right-align is driven by `formatter.rightAligned(rawValue)` and is skipped when the column has an explicit `align:`.
- **Structure parsing**: `lib/Structure.js` `parseItems` tracks brace depth (so commas inside `{...}` don't split fields) and `parseProperties` splits options on `,` or `;`, parsing numeric options (`width`, `decimals`) to integers. `lib/StructureParser.js` (secondary parser) mirrors the `decimals` parseInt handling.

### Core Features

- **Hierarchical Structure Support**: Handles deeply nested JSON like `contact[email,address[street,city]]`
- **Multi-line Cells**: Arrays are treated as multi-line content within cells, not separate rows
- **Smart Column Width Calculation**: Prioritizes actual data content over header width
- **Text Wrapping**: Fixed width columns with intelligent word breaking
- **Numeric Right Alignment**: Automatic right alignment for numbers
- **ANSI Color Support**: Proper handling of color codes in width calculations
- **Line Numbers**: Optional sequential line numbering
- **Dot Notation**: Property access like `address.city`
- **High-Performance Rendering**: Optimized for both narrow and wide tables with intelligent caching

### Performance Optimizations

The codebase includes several high-performance optimizations:

#### **ANSI-Stripped Length Caching**
- **Location**: `lib/AsciiRenderer.js:22-24, 398-427`
- **Implementation**: `ansiCache` and `lengthCache` Maps cache ANSI code removal and text length calculations
- **Benefit**: Eliminates repeated regex operations on identical text, especially for colored output

#### **Wide Table Optimization**
- **Location**: `lib/AsciiRenderer.js:51-53`
- **Implementation**: Automatic batched processing for tables with 10+ columns
- **Benefit**: Reduces overhead for wide tables through intelligent batch sizing

#### **Multi-Level Caching System**
- **Cell Cache**: Formatted cell content caching for narrow tables
- **Row Cache**: Complete row segment caching
- **Color Cache**: Color-applied text caching
- **Format Cache**: Pre-computed column format caching
- **Adaptive Strategy**: Disables heavy caching for wide tables (15+ columns) to reduce overhead

#### **Optimized Field Processing**
- **Location**: `lib/TableParser.js`
- **Implementation**: Pre-computed field levels and paths during structure parsing
- **Benefit**: Eliminates repeated path parsing during data extraction

## Building and Testing

### Prerequisites

- Node.js v20+
- npm

### Build Process

```bash
# Install dependencies
npm install

# Build the package (creates rollup bundle)
npm run build
```

The build process uses Rollup to create `package/lib/aux4-2table.mjs` from `executable.js`.

### Running Tests

#### Main Functionality Tests
```bash
# Run all ASCII table functionality tests
cd package/test
aux4 test run ascii.test.md
```

#### Line Numbers Feature Tests
```bash
# Run line numbers specific tests
cd package/test
aux4 test run line-numbers.test.md
```

#### Manual Testing
```bash
# Test basic table generation
echo '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]' | node executable.js ascii 'name,age'

# Test with line numbers
echo '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]' | node executable.js ascii 'name,age' true true

# Test nested structures
echo '[{"name": "John", "contact": {"email": "john@example.com", "address": {"city": "NYC"}}}]' | node executable.js ascii 'name,contact[email,address[city]]'
```

## Project Structure

### Core Architecture Files
```
lib/
├── Table.js                  # Main table class with cell/row management
├── AsciiRenderer.js         # High-performance ASCII format renderer
├── MarkdownRenderer.js      # Markdown format renderer
├── CsvRenderer.js           # CSV format renderer (RFC 4180, flattened headers)
├── TableParser.js           # Pure JSON-to-Table parser with optimizations
├── Cell.js                  # Individual cell with multi-line support
└── Structure.js             # Hierarchical structure string parser
```

### Core Utility Files
```
lib/
├── Config.js               # Configuration management
├── Data.js                 # Data preparation utilities
└── AutoStructure.js        # Automatic structure generation from JSON
```

**Note**: Legacy strategy pattern files and complex architectural layers have been removed in favor of a simpler, high-performance architecture focused on core table generation functionality.

## Test Cases

### ASCII Tests (ascii.test.md)
- ✅ Simple files
- ✅ Nested objects
- ✅ Array of objects
- ✅ Fixed width columns with text wrapping
- ✅ Deeply nested objects with property selection
- ✅ Nested objects inside arrays
- ✅ Column renaming
- ✅ Auto-structure generation
- ✅ Dot notation property selection
- ✅ Multi-level dot notation
- ✅ Single object input

**Result: 14/14 tests passing** ✅

### Line Numbers Tests (line-numbers.test.md)
- ✅ ASCII format with line numbers
- ✅ Single object with line numbers
- ✅ Large dataset with double-digit line numbers

**Result: 3/3 tests passing** ✅

### Invalid Lines Tests (invalid-lines.test.md)
- ✅ Default behavior - skip invalid lines but preserve line numbers
- ✅ Show invalid lines with line numbers
- ✅ Show invalid lines without line numbers
- ✅ All invalid data with showInvalidLines true
- ✅ Single invalid object

**Result: 5/5 tests passing** ✅

## Current Development Status

### Completed Features ✅
- Core table generation with hierarchical structures
- Strategy pattern implementation eliminating conditional logic
- Multi-level header generation
- Text wrapping for fixed width columns
- Numeric right alignment
- Proper ANSI color handling
- Column width calculation from data content
- Arrays as multi-line cells
- Dot notation property access
- Line number column integration with proper alignment
- Invalid line handling with graceful error display
- Red colorization for invalid line indicators

### Fully Implemented Features ✅
All major functionality is now complete and fully tested.

### Technical Debt Eliminated ✅
- Removed all complex `if/switch` statements in favor of strategy patterns
- Eliminated type checking conditionals using ContentTypeStrategy
- Replaced inline alignment logic with AlignmentStrategy + Factory
- Converted header generation to strategy-based approach

## Key Design Decisions

1. **Cell-Centric Approach**: Arrays are treated as multi-line content within cells rather than separate table rows
2. **Strategy Over Conditionals**: Every piece of conditional logic has been replaced with strategy pattern implementations
3. **Data-Driven Width Calculation**: Column widths are determined by actual data content, not just headers
4. **Pattern Composition**: Multiple design patterns work together to create a maintainable architecture

## Usage Examples

### Basic Table
```bash
echo '[{"name": "Alice", "age": 30}]' | node executable.js ascii 'name,age'
# Output:
# name   age
# Alice   30
```

### Nested Structure
```bash
echo '[{"user": {"name": "John", "contact": {"email": "john@example.com"}}}]' | node executable.js ascii 'user[name,contact[email]]'
# Output:
# user
# name  email
# John  john@example.com
```

### Fixed Width with Text Wrapping
```bash
echo '[{"name": "Alice", "description": "Very long description text"}]' | node executable.js ascii 'name{width:8},description{width:15}'
# Output with text wrapping in fixed width columns
```

## Contributing Guidelines

1. **Design Patterns First**: Always implement new functionality using appropriate design patterns
2. **No Complex Conditionals**: Avoid `if/switch` statements; use strategy patterns instead
3. **Strategy Pattern Requirement**: When implementing new features, do NOT add conditional logic. Instead, create multiple classes with different implementations and follow the design pattern structure to call them appropriately
4. **Test-Driven Development**: Ensure all changes pass existing tests in `ascii.test.md`
5. **Build Before Commit**: Always run `npm run build` before testing changes
6. **Strategy Documentation**: Document any new strategies in this file

### Design Pattern Requirements

**CRITICAL**: This codebase strictly prohibits complex `if` statements and conditional logic. All functionality must be implemented using design patterns:

- **Strategy Pattern**: For different behaviors based on data type or state
- **Factory Pattern**: For creating appropriate strategy instances
- **Builder Pattern**: For complex object construction
- **Composite Pattern**: For tree-like structures

When adding new functionality:
1. Identify the variation points in behavior
2. Create separate strategy classes for each variation
3. Use a factory or strategy selector to choose the appropriate implementation
4. Never use inline conditionals for behavioral differences

## Troubleshooting

### Build Issues
- Ensure Node.js v20+ is installed
- Run `npm install` to install dependencies
- Check for TypeScript/syntax errors in source files

### Test Failures
- Build first with `npm run build`
- Run tests from correct directory: `cd package/test`
- Check test output for specific failure details

### Development Workflow
1. Make changes to source files in `lib/`
2. Run `npm run build`
3. Test with `aux4 test run ascii.test.md`
4. Debug issues with manual testing using `echo | node executable.js`