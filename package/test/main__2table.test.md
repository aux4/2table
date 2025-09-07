### Nested Array Objects

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

#### ASCII format with custom labels

```execute
cat nested-array-objects.json | aux4 2table id:ID,contacts:"Contacts"[name:"Name",email:"Email",role]
```

```expect
 ID  Contacts
     Name        Email             role
  1  John Smith  john@example.com  Manager
     Jane Doe    jane@example.com  Developer
  2  Bob Wilson  bob@example.com   Designer
```

#### Markdown format with custom labels

```execute
cat nested-array-objects.json | aux4 2table --format md id:ID,contacts:"Contacts"[name:"Name",email:"Email",role]
```

```expect
| ID | Contacts |  |  |
| --- | --- | --- | --- |
|  | Name | Email | role |
| 1 | John Smith | john@example.com | Manager |
|  | Jane Doe | jane@example.com | Developer |
| 2 | Bob Wilson | bob@example.com | Designer |
```
