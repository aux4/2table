# 2table

## simple file

```file:simple.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat simple.json | aux4 2table --format md name,age,city
```

```expect
| name | age | city |
| --- | --- | --- |
| Alice | 30 | New York |
| Bob | 25 | Los Angeles |
| Charlie | 35 | Chicago |
```

## nested objects

```file:nested.json
[
  {"name": "John", "age": 30, "address": {"street": "123 Main St", "city": "NYC", "state": "NY", "zipCode": "10001"}},
  {"name": "Jane", "age": 25, "address": {"street": "456 Oak Ave", "city": "SF", "state": "CA", "zipCode": "94102"}}
]
```

```execute
cat nested.json | aux4 2table --format md name,age,address[street,city,state,zipCode]
```

```expect
| name | age | address |
| --- | --- | --- |
| John | 30 | 123 Main St  NYC   NY     10001 |
| Jane | 25 | 456 Oak Ave  SF    CA     94102 |
```

## array of objects

```file:array.json
[
  {"name": "John", "age": 30, "address": [{"street": "123 Main St", "city": "NYC", "state": "NY", "zipCode": "10001"}, {"street": "456 Oak Ave", "city": "NYC", "state": "NY", "zipCode": "10002"}]},
  {"name": "Jane", "age": 25, "address": [{"street": "789 Pine St", "city": "SF", "state": "CA", "zipCode": "94102"}]}
]
```

```execute
cat array.json | aux4 2table --format md name,age,address[street,city,state,zipCode]
```

```expect
| name | age | address |
| --- | --- | --- |
|  |  | \| street \| city \| state \| zipCode \| |
| John | 30 | 123 Main St  NYC   NY     10001 |
|  |  | 456 Oak Ave  NYC   NY     10002 |
| Jane | 25 | 789 Pine St  SF    CA     94102 |
```