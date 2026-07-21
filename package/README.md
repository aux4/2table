# aux4/2table

Convert a JSON array of objects to a human-readable table (ASCII or Markdown) or to CSV.

A lightweight aux4 package that reads a JSON array from stdin and prints a table. Use it to inspect JSON data quickly in a terminal, generate Markdown tables for documentation, or emit CSV for machine consumption.

## Installation

```bash
aux4 aux4 pkger install aux4/2table
```

## Quick Start

Pipe a JSON array to the command and specify the columns you want to display.

```bash
cat data.json | aux4 2table name,age,city
```

Produce Markdown output with --format:

```bash
cat data.json | aux4 2table --format md name,age,city
```

Produce CSV output for machine consumption:

```bash
cat data.json | aux4 2table --format csv name,age,city
```

## Usage

This package converts JSON arrays into table output. You can select simple fields, expand nested objects and arrays, rename columns, and set fixed column widths for wrapping.

### Main Commands

- [`aux4 2table`](./commands/aux4/2table) - Convert a JSON array of objects to a table format.

### Command Reference

Command: `aux4 2table`

Variables (defined in the package):

- --format
  - Description: Table output format
  - Options: `ascii` (default), `md`, `csv`
- table (positional)
  - Description: The table structure to output (column list)
  - Examples: `name,age,city`, `name,age,address[street,city]`, `name:"Full Name",age:Age`
- --lineNumbers
  - Description: Add a first column with line numbers starting from 1
  - Options: `true`, `false` (default)
- --showInvalidLines
  - Description: Show invalid lines as <invalid line> instead of skipping them
  - Options: `true`, `false` (default)

Table expression features

- Simple columns: `name,age,city`
- Nested objects: `address[street,city]`
- Arrays of objects: `contacts[name,email]`
- Column renaming: `name:"Full Name",age:Age`
- Fixed width with wrapping: `name{width:8},description{width:20}`
- Value formatting: `amount{format:currency,currency:USD},rate{format:percent}`

Input: JSON array provided via stdin.

## Examples

All examples use the full package invocation `aux4 2table` (recommended for clarity).

### ASCII table (default)

Input (data.json):

```json
[
  { "name": "Alice", "age": 30, "city": "New York" },
  { "name": "Bob", "age": 25, "city": "Los Angeles" },
  { "name": "Charlie", "age": 35, "city": "Chicago" }
]
```

Command:

```bash
cat data.json | aux4 2table name,age,city
```

Output:

```text
 name     age  city
 Alice     30  New York
 Bob       25  Los Angeles
 Charlie   35  Chicago
```

### Markdown table (--format md)

Command:

```bash
cat data.json | aux4 2table --format md name,age,city
```

Output:

```text
| name | age | city |
| --- | --- | --- |
| Alice | 30 | New York |
| Bob | 25 | Los Angeles |
| Charlie | 35 | Chicago |
```

### CSV output (--format csv)

CSV is intended for machine consumption: colors and column widths are ignored, values are comma-separated, and fields are quoted per RFC 4180 (a field is wrapped in double quotes when it contains a comma, double quote, carriage return or newline; embedded double quotes are doubled).

Command:

```bash
cat data.json | aux4 2table --format csv name,age,city
```

Output:

```text
name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago
```

Nested/hierarchical structures have no colspan in CSV, so headers are flattened to a single row using dot notation (`address[street,city]` becomes the columns `address.street` and `address.city`):

```bash
cat nested.json | aux4 2table --format csv name,address[street,city]
```

```text
name,address.street,address.city
John,123 Main St,NYC
Jane,456 Oak Ave,SF
```

### Nested objects

Input (nested.json):

```json
[
  {
    "name": "John",
    "age": 30,
    "address": { "street": "123 Main St", "city": "NYC", "state": "NY", "zipCode": "10001" }
  },
  { "name": "Jane", "age": 25, "address": { "street": "456 Oak Ave", "city": "SF", "state": "CA", "zipCode": "94102" } }
]
```

Command:

```bash
cat nested.json | aux4 2table name,age,address[street,city,state,zipCode]
```

This produces multi-row headers for the nested `address` fields and prints each address row beneath the parent record.

### Renaming columns

Use colon syntax to rename columns in the output:

```bash
cat people.json | aux4 2table name:"Full Name",age:"Years Old",contact:"Contact Info"[email:"Email Address",phone:"Phone Number"]
```

### Fixed width and wrapping

Set a width for long text fields to enable wrapping in ASCII output:

```bash
cat long-text.json | aux4 2table 'name{width:8},description{width:20}'
```

### Value formatting

Use the `{format:...}` column modifier to render raw values as numbers, currency, percentages, dates, times or datetimes. Formatting is applied before rendering, so it is consistent across ASCII, Markdown and CSV output. All formats are Intl-based.

| Format | Option keys | Notes |
| --- | --- | --- |
| `number` | `decimals`, `locale` | Thousands grouping is on by default. |
| `currency` | `currency` (ISO code, default `USD`), `decimals`, `locale` | |
| `percent` | `decimals`, `locale` | The value is treated as a ratio (`0.25` renders as `25%`). |
| `date` | `style` (`short`\|`medium`\|`long`\|`full`, default `medium`), `dateStyle` (override), `locale` | |
| `time` | `style` (`short`\|`medium`\|`long`\|`full`, default `medium`), `timeStyle` (override), `locale` | |
| `datetime` | `style` (sets both parts), `dateStyle` (override, default `medium`), `timeStyle` (override, default `short`), `locale` | |

Multiple options are comma-separated inside the braces. `locale` defaults to the host locale (falling back to `en-US`).

**Temporal `style`:** the unified `style` key sets the presentation for temporal formats — the `dateStyle` for `date`, the `timeStyle` for `time`, and BOTH parts for `datetime`. The fine-grained `dateStyle` / `timeStyle` keys remain available as per-part overrides. Precedence per part is: explicit `dateStyle`/`timeStyle` > `style` > built-in default. For example, `ts{format:datetime,style:medium,timeStyle:short}` renders the date part medium and the time part short.

```bash
echo '[{"amount":1234.5,"qty":3,"rate":0.1234,"born":"1990-05-01","ts":"2026-07-20T14:30:00Z"}]' \
  | aux4 2table 'amount{format:currency,currency:USD},qty{format:number,decimals:0},rate{format:percent,decimals:1},born{format:date},ts{format:datetime}'
```

Output:

```text
    amount  qty   rate  born          ts
 $1,234.50    3  12.3%  May 1, 1990   Jul 20, 2026, 2:30 PM
```

**Note:** `number`, `currency` and `percent` columns right-align automatically (an explicit `align:` always wins). Empty values render as an empty cell, and an un-parseable date or a non-numeric value given a numeric format falls back to the original raw value.

### Auto-structure generation

When no structure is provided, the command automatically analyzes the JSON to generate an optimal table structure:

```bash
cat complex-data.json | aux4 2table
```

This automatically detects nested objects and arrays, creating appropriate column groupings.

### Line numbers and invalid data handling

Add line numbers for data debugging and control how invalid JSON lines are handled:

```bash
cat data.json | aux4 2table name,age,city --lineNumbers true --showInvalidLines true
```

Output:
```text
 #  name     age  city
 1  Alice     30  New York
 2  <invalid line>
 3  Charlie   35  Chicago
```

### Dot notation for nested properties

Access nested object properties using dot notation:

```bash
cat nested.json | aux4 2table name,age,address.city,address.state
```

### Complex nested structures

Handle deeply nested objects and arrays with mixed object types:

```bash
cat mixed-objects.json | aux4 2table 'type,data[logs[level,message],metrics[cpu,memory,disk]]'
```

This creates multi-level headers and handles objects that contain both arrays and nested objects.

## Examples from tests

The repository includes full example runs in the `test/` folder. Reproduce them locally:

- ASCII examples: `test/ascii.test.md`
- Markdown examples: `test/markdown.test.md`
- CSV examples: `test/csv.test.md`

Each test file contains sample input files, the exact command to run, and expected output blocks.

## License

This package is licensed under the Apache-2.0 License.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
