# 2table csv

## simple flat structure

```file:simple.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat simple.json | aux4 2table --format csv name,age,city
```

```expect
name,age,city
Alice,30,New York
Bob,25,Los Angeles
Charlie,35,Chicago
```

## value containing a comma is quoted

```file:comma.json
[
  {"name": "Alice", "age": 30},
  {"name": "Bob, Jr.", "age": 25}
]
```

```execute
cat comma.json | aux4 2table --format csv name,age
```

```expect
name,age
Alice,30
"Bob, Jr.",25
```

## value containing a double quote is doubled and wrapped

```file:quote.json
[
  {"name": "He said \"hi\"", "age": 1}
]
```

```execute
cat quote.json | aux4 2table --format csv name,age
```

```expect
name,age
"He said ""hi""",1
```

## nested structure is flattened to a single header row

```file:nested.json
[
  {"name": "John", "address": {"street": "123 Main St", "city": "NYC"}},
  {"name": "Jane", "address": {"street": "456 Oak Ave", "city": "SF"}}
]
```

```execute
cat nested.json | aux4 2table --format csv name,address[street,city]
```

```expect
name,address.street,address.city
John,123 Main St,NYC
Jane,456 Oak Ave,SF
```

## single object input

```file:single-object.json
{"name": "Alice", "age": 30, "city": "New York", "email": "alice@example.com"}
```

```execute
cat single-object.json | aux4 2table --format csv name,age,city,email
```

```expect
name,age,city,email
Alice,30,New York,alice@example.com
```

## dot notation for nested properties

```file:dot.json
[
  {"name": "Alice", "address": {"city": "New York", "state": "NY"}},
  {"name": "Bob", "address": {"city": "Los Angeles", "state": "CA"}}
]
```

```execute
cat dot.json | aux4 2table --format csv name,address.city,address.state
```

```expect
name,address.city,address.state
Alice,New York,NY
Bob,Los Angeles,CA
```

## line numbers add a leading # column

```file:line-numbers.json
[
  {"name": "Alice", "age": 30},
  {"name": "Bob", "age": 25}
]
```

```execute
cat line-numbers.json | aux4 2table --format csv name,age --lineNumbers true
```

```expect
#,name,age
1,Alice,30
2,Bob,25
```

## auto-generated structure when columns are omitted

```file:auto.json
[
  {"name": "Alice", "age": 30},
  {"name": "Bob", "age": 25}
]
```

```execute
cat auto.json | aux4 2table --format csv
```

```expect
name,age
Alice,30
Bob,25
```

## invalid format is rejected

```execute
echo '[{"name":"Alice"}]' | aux4 2table --format xml name 2>&1 | head -1
```

```expect:partial
Invalid format: xml*
```
