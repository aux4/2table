# 2table Invalid Lines Feature

## Default behavior - skip invalid lines but preserve line numbers

```file:mixed-valid-invalid.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  null,
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  "invalid string",
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat mixed-valid-invalid.json | aux4 2table --table name,age,city --lineNumbers true --showInvalidLines false
```

```expect
 #  name     age  city
 1  Alice     30  New York
 3  Bob       25  Los Angeles
 5  Charlie   35  Chicago
```

## Show invalid lines with line numbers

```file:mixed-valid-invalid.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  null,
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  "invalid string",
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat mixed-valid-invalid.json | aux4 2table --table name,age,city --lineNumbers true --showInvalidLines true
```

```expect
 #  name            age  city
 1  Alice            30  New York
 2  <invalid line>
 3  Bob              25  Los Angeles
 4  <invalid line>
 5  Charlie          35  Chicago
```

## Show invalid lines without line numbers

```file:mixed-valid-invalid.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  null,
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  "invalid string",
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat mixed-valid-invalid.json | aux4 2table --table name,age,city --lineNumbers false --showInvalidLines true
```

```expect
 name            age  city
 Alice            30  New York
 <invalid line>
 Bob              25  Los Angeles
 <invalid line>
 Charlie          35  Chicago
```

## All invalid data with showInvalidLines true

```file:all-invalid.json
[null, "string", 42, true]
```

```execute
cat all-invalid.json | aux4 2table --table name,age --lineNumbers true --showInvalidLines true
```

```expect
 #  name
 1  <invalid line>
 2  <invalid line>
 3  <invalid line>
 4  <invalid line>
```

## Single invalid object

```file:single-invalid.json
null
```

```execute
cat single-invalid.json | aux4 2table --table name --lineNumbers true --showInvalidLines true
```

```expect
 #  name
 1  <invalid line>
```