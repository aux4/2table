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
| name | age | address |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  |  | street | city | state | zipCode |
| John | 30 | 123 Main St | NYC | NY | 10001 |
| Jane | 25 | 456 Oak Ave | SF | CA | 94102 |
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
| name | age | address |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  |  | street | city | state | zipCode |
| John | 30 | 123 Main St | NYC | NY | 10001 |
|  |  | 456 Oak Ave | NYC | NY | 10002 |
| Jane | 25 | 789 Pine St | SF | CA | 94102 |
```

## column renaming

```file:people.json
[
  {"name": "Alice", "age": 30, "email": "alice@example.com"},
  {"name": "Bob", "age": 25, "email": "bob@example.com"},
  {"name": "Charlie", "age": 35, "email": "charlie@example.com"}
]
```

```execute
cat people.json | aux4 2table --format md name:Name,age:Age,email:"Email Address"
```

```expect
| Name | Age | Email Address |
| --- | --- | --- |
| Alice | 30 | alice@example.com |
| Bob | 25 | bob@example.com |
| Charlie | 35 | charlie@example.com |
```

## nested column renaming

```file:employees.json
[
  {"name": "John", "age": 30, "contact": {"email": "john@example.com", "phone": "123-456-7890"}},
  {"name": "Jane", "age": 25, "contact": {"email": "jane@example.com", "phone": "987-654-3210"}}
]
```

```execute
cat employees.json | aux4 2table --format md name:"Full Name",age:"Years Old",contact:"Contact Info"[email:"Email Address",phone:"Phone Number"]
```

```expect
| Full Name | Years Old | Contact Info |  |
| --- | --- | --- | --- |
|  |  | Email Address | Phone Number |
| John | 30 | john@example.com | 123-456-7890 |
| Jane | 25 | jane@example.com | 987-654-3210 |
```

## nested objects inside arrays

```file:nested-array-objects.json
[
  {
    "id": 1,
    "contacts": [
      {"name": "John Smith", "email": "john@example.com", "role": "Manager"},
      {"name": "Jane Doe", "email": "jane@example.com", "role": "Developer"}
    ]
  },
  {
    "id": 2,
    "contacts": [
      {"name": "Bob Wilson", "email": "bob@example.com", "role": "Designer"}
    ]
  }
]
```

```execute
cat nested-array-objects.json | aux4 2table --format md 'id,contacts[name,email,role]'
```

```expect
| id | contacts |  |  |
| --- | --- | --- | --- |
|  | name | email | role |
| 1 | John Smith | john@example.com | Manager |
|  | Jane Doe | jane@example.com | Developer |
| 2 | Bob Wilson | bob@example.com | Designer |
```