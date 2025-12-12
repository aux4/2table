#### Description

2table converts a JSON array (or single JSON object) into a human-readable table. It supports two output formats: an ASCII fixed-width table and a Markdown table. You specify which fields to include using a compact structure language; if you omit the structure it will be inferred from the input JSON.

The structure language supports nested objects and arrays (e.g. address[street,city]) so nested fields can be rendered as sub-columns. Columns can be given fixed widths (and optional truncation) to force wrapping or to align numeric values.

The command accepts the output format and a table structure/column list. Format can be provided positionally or with --format; the table structure is a positional argument (or omitted to auto-generate).

#### Usage

Describe the main parameters and options of the command.

```bash
aux4 2table [optional args (based on profile name break by :] <command> --<variable> <value>
```

Key parameters

- format: output format, either ascii (default) or md. Can be provided as the first positional argument or via --format.
- table: the table structure (columns) to output. This is a positional argument when provided. If omitted, the utility will try to auto-generate the structure from the JSON input.
- lineNumbers: add a first column with line numbers starting from 1 (default: false).
- showInvalidLines: show invalid JSON lines as <invalid line> instead of skipping them (default: false).

Structure examples

- name,age,city -> simple flat columns
- name,age,address[street,city] -> nested object rendered as sub-columns
- id,contacts[name,email] -> array of objects; rows expand for each nested array element
- name{width:8} -> column width control (wraps long text to the width)

#### Example

##### Simple ASCII table (explicit structure)

```bash
cat simple.json | aux4 2table name,age,city
```

Explaination: reads an array of objects from stdin and prints an ASCII table with columns name, age and city.

```text
 name     age  city
 Alice     30  New York
 Bob       25  Los Angeles
 Charlie   35  Chicago
```

##### Simple Markdown table (use --format md)

```bash
cat simple.json | aux4 2table --format md name,age,city
```

This prints the same columns in a GitHub-flavored Markdown table.

```text
| name | age | city |
| --- | --- | --- |
| Alice | 30 | New York |
| Bob | 25 | Los Angeles |
| Charlie | 35 | Chicago |
```

##### Nested structure (object fields rendered as sub-columns)

```bash
cat nested.json | aux4 2table name,age,address[street,city,state,zipCode]
```

The address field is an object; its selected keys become sub-columns under the address column.

```text
 name  age  address
            street       city  state  zipCode
 John   30  123 Main St  NYC   NY     10001
 Jane   25  456 Oak Ave  SF    CA     94102
```

##### Fixed-width columns with wrapping

```bash
cat long-text.json | aux4 2table 'name{width:8},description{width:20}'
```

This forces the name column to 8 characters and the description column to 20 characters, wrapping text to multiple lines when needed.

```text
 name      description
 Alice     This is a very long
           description that
           should wrap to
           multiple lines when
           displayed in a
           fixed width column
 Bob       Short description
 Charlie   Another extremely
           long description
           that contains
           multiple sentences
           and should
           definitely be
           wrapped across
           several lines to
           fit within the
           specified column
           width

##### Auto-structure generation

```bash
cat complex-data.json | aux4 2table
```

When no table structure is provided, the command automatically analyzes the JSON input to generate an optimal structure, including nested objects and arrays.

##### Line numbers with invalid data handling

```bash
cat data.json | aux4 2table name,age,city --lineNumbers true --showInvalidLines true
```

Shows line numbers and displays invalid JSON lines instead of skipping them:

```text
 #  name     age  city
 1  Alice     30  New York
 2  <invalid line>
 3  Charlie   35  Chicago
```

##### Dot notation for nested properties

```bash
cat nested.json | aux4 2table name,age,address.city,address.state
```

Access deeply nested object properties using dot notation without expanding the entire nested structure.
