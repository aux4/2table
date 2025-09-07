### Description

The `2table` command reads JSON from standard input and renders it as a readable table in either ASCII or Markdown format. You control which fields appear, how they are labeled, and how nested structures (objects or arrays) expand into subcolumns. Inline definitions allow you to set fixed column widths, specify truncation behavior, and apply ANSI colors or text styles—all without altering the source data or writing extra code.

Columns are declared in a concise comma-separated string. You can rename fields with `field:Header`, drill into nested objects or arrays with `parent[childA,childB]`, and augment each column with properties in braces such as `{width:12;truncate:true}` or `{color:blue,underline}`. This makes `2table` an ideal utility for quickly inspecting complex JSON payloads or preparing data for reports.

#### Usage

```bash
aux4 2table [--format <ascii|md>] <columns-definition>
```

- `--format <ascii|md>`
  Specify the table style: `ascii` for a plain-text grid (default) or `md` for a Markdown table.

- `<columns-definition>`
  A comma-separated list of column specs. Each spec follows this pattern:

  ```text
  fieldName[:HeaderLabel][{property1:value1;property2:value2}][nestedField1,nestedField2,...]
  ```

  • **Basic field**: `name` selects the top-level `name` property.

  • **Custom label**: `name:FullName` renames the header to `FullName`. Quotes allow spaces: `id:"User ID"`.

  • **Inline properties** (inside `{}`;
  separated by `;`):
  - `width:<N>` ensures a minimum column width of N characters.
  - `truncate:true` shortens content exceeding width and appends `...`.
  - `color:<style>` applies an ANSI color or text style (e.g., `red`, `underline`, `bold`). Multiple styles comma-separate.

  • **Nested objects/arrays**: `parent[childA,childB]` expands the `parent` object or array into separate columns for each child key. You can combine this with renaming and properties: `contacts:"Contacts"[name:Name,email:Email]{width:20;color:cyan}`.

#### Examples

# Default ASCII output with basic fields

```bash
cat data.json | aux4 2table id,name,age,city
```

# Markdown output

```bash
cat data.json | aux4 2table --format md id,name,age,city
```

# Rename columns and set a fixed width

```bash
cat data.json | aux4 2table id:UserID,name:"Full Name"{width:15},age{width:4}
```

# Colorize and truncate long values

```bash
cat data.json | aux4 2table name{color:green},status{width:10;truncate:true}
```

# Expand a nested object

```bash
cat profile.json | aux4 2table id,profile[name,city]
```

# Combine nested array, custom label, and styling

```bash
cat nested.json | aux4 2table --format ascii id,contacts:"Contacts"[name:"Name",email:"Email",role]{width:25;color:blue}
```
