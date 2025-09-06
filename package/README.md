# aux4/2table

Convert a JSON array of objects to a table format (ASCII or Markdown).

`aux4/2table` is an aux4 CLI package that reads a JSON array from standard input and renders it as a human-readable table. It supports:

- ASCII or Markdown output formats
- Nested objects and arrays
- Column selection and ordering
- Column renaming
- Fixed column widths and text wrapping

## Installation

```bash
aux4 aux4 pkger install aux4/2table
```

## Quick Start

Assuming you have a file `data.json`:

```json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  {"name": "Bob",   "age": 25, "city": "Los Angeles"}
]
```

Render an ASCII table of `name`, `age`, and `city`:

```bash
cat data.json | aux4 2table name,age,city
```

## Usage

Transform JSON arrays into tables with customizable columns and formats.

### Main Commands

- [`aux4 2table`](./commands/2table) - Convert a JSON array of objects to a table format.

### Command Reference

#### aux4 2table

Convert a JSON array of objects to a table format.

Usage:
```bash
aux4 2table [--format <ascii|md>] <table-spec>
```

Options:

- `--format <ascii|md>`
  Table output format. Defaults to `ascii`.

Positional arguments:

- `<table-spec>`
  A comma-separated list of fields to include. Supports nested selection, renaming, and column options.
  - Simple field: `name`
  - Nested object: `address[street,city]`
  - Array of objects: `items[name,qty]`
  - Column renaming: `name:Name,age:Age`
  - Width wrapping: `description{width:20}`

## Examples

### 1. Basic ASCII Table

```bash
cat simple.json | aux4 2table name,age,city
```
```bash
 name     age  city       
 Alice     30   New York   
 Bob       25   Los Angeles
```

### 2. Markdown Table

```bash
cat simple.json | aux4 2table --format md name,age,city
```
```markdown
| name  | age | city        |
| ----- | --- | ----------- |
| Alice | 30  | New York    |
| Bob   | 25  | Los Angeles |
```

### 3. Nested Objects

```bash
cat nested.json | aux4 2table name,age,address[street,city,state]
```
```bash
 name  age  address                
            street       city  state
 John   30  123 Main St  NYC   NY   
 Jane   25  456 Oak Ave   SF    CA   
```

### 4. Array of Objects

```bash
cat array.json | aux4 2table name,age,address[street,city]
```
```bash
 name  age  address              
            street       city    
 John   30  123 Main St  NYC     
        456 Oak Ave  NYC         
 Jane   25  789 Pine St  SF      
```

### 5. Column Renaming

```bash
cat people.json | aux4 2table name:Name,age:Age,email:"Email Address"
```
```bash
 Name     Age  Email Address       
 Alice    30   alice@example.com   
 Bob      25   bob@example.com     
```

### 6. Fixed Width & Text Wrapping

```bash
cat long-text.json | aux4 2table 'name{width:8},description{width:20}'
```
```bash
 name      description         
 Alice     This is a very long
           description that    
           should wrap to      
           multiple lines when 
           displayed in a      
           fixed width column  
```

## License

This package is licensed under the Apache License 2.0.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
