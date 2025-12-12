# 2table Package Development Guide

## Project Overview

The 2table package is a hierarchical JSON-to-table converter that transforms complex nested JSON structures into well-formatted ASCII and Markdown tables. It has been completely rearchitected using design patterns to eliminate complex conditional logic and provide maintainable, extensible code.

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

### Core Features

- **Hierarchical Structure Support**: Handles deeply nested JSON like `contact[email,address[street,city]]`
- **Multi-line Cells**: Arrays are treated as multi-line content within cells, not separate rows
- **Smart Column Width Calculation**: Prioritizes actual data content over header width
- **Text Wrapping**: Fixed width columns with intelligent word breaking
- **Numeric Right Alignment**: Automatic right alignment for numbers
- **ANSI Color Support**: Proper handling of color codes in width calculations
- **Line Numbers**: Optional sequential line numbering
- **Dot Notation**: Property access like `address.city`

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
├── Table.js                  # Main table class
├── AsciiTable.js            # ASCII format implementation
├── TableBuilder.js          # Builder pattern for table construction
├── Cell.js                  # Individual cell with multi-line support
├── TableRow.js              # Row composite
└── Structure.js             # Structure string parser
```

### Strategy Pattern Files
```
lib/
├── ContentExtractor.js      # Property extraction strategies (includes InvalidLineExtractor)
├── DataFormatter.js         # Nested data formatting strategies
├── HeaderStrategy.js        # Header generation strategies
├── AlignmentStrategy.js     # Text alignment strategies
├── AlignmentFactory.js      # Alignment strategy factory
├── ContentTypeStrategy.js   # Content type detection strategies
├── LineNumberStrategy.js    # Line number handling strategies
├── InvalidLineStrategy.js   # Invalid line data processing strategies
├── InvalidRowStrategy.js    # Invalid row rendering strategies
└── ContentFormatter.js     # Legacy compatibility formatter
```

### Utility Files
```
lib/
├── WidthControl.js          # Column width calculation
├── Input.js                 # Input handling utilities
├── Config.js               # Configuration management
├── Data.js                 # Data preparation utilities
└── AutoStructure.js        # Automatic structure generation
```

### Legacy Code
```
lib/legacy/                  # Original implementation (preserved for reference)
├── BaseTable.js            # Original base table class
├── AsciiTable.js           # Original ASCII implementation
└── ...                     # Other legacy files
```

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