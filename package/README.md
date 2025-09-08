# aux4/2table

Convert a JSON array of objects to a human-readable table (ASCII or Markdown).

A lightweight aux4 package that reads a JSON array from stdin and prints a table. Use it to inspect JSON data quickly in a terminal or to generate Markdown tables for documentation.

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

## Usage

This package converts JSON arrays into table output. You can select simple fields, expand nested objects and arrays, rename columns, and set fixed column widths for wrapping.

### Main Commands

- [`aux4 2table`](./commands/aux4/2table) - Convert a JSON array of objects to a table format.

### Command Reference

Command: `aux4 2table`

Variables (defined in the package):

- --format
  - Description: Table output format
  - Options: `ascii` (default), `md`
- table (positional)
  - Description: The table structure to output (column list)
  - Examples: `name,age,city`, `name,age,address[street,city]`, `name:"Full Name",age:Age`

Table expression features

- Simple columns: `name,age,city`
- Nested objects: `address[street,city]`
- Arrays of objects: `contacts[name,email]`
- Column renaming: `name:"Full Name",age:Age`
- Fixed width with wrapping: `name{width:8},description{width:20}`

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

```
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

```
| name | age | city |
| --- | --- | --- |
| Alice | 30 | New York |
| Bob | 25 | Los Angeles |
| Charlie | 35 | Chicago |
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

## Examples from tests

The repository includes full example runs in the `test/` folder. Reproduce them locally:

- ASCII examples: `test/ascii.test.md`
- Markdown examples: `test/markdown.test.md`

Each test file contains sample input files, the exact command to run, and expected output blocks.

## License

This package is licensed under the Apache-2.0 License.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
