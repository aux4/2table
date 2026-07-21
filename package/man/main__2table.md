#### Description

2table converts a JSON array (or single JSON object) into a human-readable table or into CSV. It supports three output formats: an ASCII fixed-width table, a Markdown table, and CSV. You specify which fields to include using a compact structure language; if you omit the structure it will be inferred from the input JSON.

CSV is intended for machine consumption: colors and column widths are ignored, values are comma-separated, and fields are quoted per RFC 4180 (a field is wrapped in double quotes when it contains a comma, double quote, carriage return or newline; embedded double quotes are doubled). Nested structures have no colspan in CSV, so multi-level headers are flattened to a single header row using dot notation (address[street,city] becomes the columns address.street and address.city).

The structure language supports nested objects and arrays (e.g. address[street,city]) so nested fields can be rendered as sub-columns. Columns can be given fixed widths (and optional truncation) to force wrapping or to align numeric values.

Columns also support a `{format:...}` modifier that renders each raw value using Intl formatting before it reaches any renderer, so ASCII, Markdown and CSV all receive the same formatted value. Supported format types and their option keys:

- `format:number` — thousands grouping on by default. Options: `decimals:N` (fixed min & max fraction digits), `locale:` (default host locale, falling back to en-US).
- `format:currency` — options: `currency:USD` (ISO 4217 code, default USD), `decimals:`, `locale:`.
- `format:percent` — the value is treated as a ratio (0.25 renders as 25%). Options: `decimals:`, `locale:`.
- `format:date` — options: `style:short|medium|long|full` (default medium), `dateStyle:` (override), `locale:`.
- `format:time` — options: `style:short|medium|long|full` (default medium), `timeStyle:` (override), `locale:`.
- `format:datetime` — options: `style:` (sets both date and time parts), `dateStyle:` (override, default medium), `timeStyle:` (override, default short), `locale:`.

For temporal formats the unified `style` key sets the presentation — the dateStyle for `date`, the timeStyle for `time`, and BOTH parts for `datetime`. The fine-grained `dateStyle`/`timeStyle` keys remain available as per-part overrides. Precedence per part: explicit `dateStyle`/`timeStyle` > `style` > built-in default (e.g. `ts{format:datetime,style:medium,timeStyle:short}` renders the date medium and the time short).

Multiple options are comma-separated inside the braces (e.g. `amount{format:currency,currency:USD,decimals:2}`). number/currency/percent columns right-align by default (an explicit `align:` always wins). Empty values (null, undefined, "") render as an empty cell, and an un-parseable date or a non-numeric value given a numeric format falls back to the original raw value rather than emitting "NaN" or "Invalid Date".

The command accepts the output format and a table structure/column list. Format can be provided positionally or with --format; the table structure is a positional argument (or omitted to auto-generate).

#### Usage

Describe the main parameters and options of the command.

```bash
aux4 2table [optional args (based on profile name break by :] <command> --<variable> <value>
```

Key parameters

- format: output format, one of ascii (default), md, or csv. Provided via --format.
- table: the table structure (columns) to output. This is a positional argument when provided. If omitted, the utility will try to auto-generate the structure from the JSON input.
- lineNumbers: add a first column with line numbers starting from 1 (default: false).
- showInvalidLines: show invalid JSON lines as <invalid line> instead of skipping them (default: false).

Structure examples

- name,age,city -> simple flat columns
- name,age,address[street,city] -> nested object rendered as sub-columns
- id,contacts[name,email] -> array of objects; rows expand for each nested array element
- name{width:8} -> column width control (wraps long text to the width)
- amount{format:currency,currency:USD} -> render the value as USD currency
- rate{format:percent,decimals:1} -> render a ratio as a percentage with one decimal
- born{format:date,style:long} -> render an ISO date string as a long date (dateStyle:long overrides style)
- ts{format:datetime,style:medium,timeStyle:short} -> both parts medium, time part overridden to short

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

##### CSV output (use --format csv)

```bash
cat simple.json | aux4 2table --format csv name,age,city
```

Emits comma-separated values with RFC 4180 quoting; nested headers are flattened using dot notation.

```text
name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago
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

##### Value formatting with {format:...}

```bash
echo '[{"amount":1234.5,"qty":3,"rate":0.1234,"born":"1990-05-01","ts":"2026-07-20T14:30:00Z"}]' \
  | aux4 2table 'amount{format:currency,currency:USD},qty{format:number,decimals:0},rate{format:percent,decimals:1},born{format:date},ts{format:datetime}'
```

Renders each column with its declared format. Numeric columns (number, currency, percent) right-align automatically.

```text
    amount  qty   rate  born          ts
 $1,234.50    3  12.3%  May 1, 1990   Jul 20, 2026, 2:30 PM
```
