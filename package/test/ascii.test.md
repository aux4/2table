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
cat simple.json | aux4 2table name,age,city
```

```expect
 name     age  city
 Alice     30  New York
 Bob       25  Los Angeles
 Charlie   35  Chicago
```

## nested objects

```file:nested.json
[
  {"name": "John", "age": 30, "address": {"street": "123 Main St", "city": "NYC", "state": "NY", "zipCode": "10001"}},
  {"name": "Jane", "age": 25, "address": {"street": "456 Oak Ave", "city": "SF", "state": "CA", "zipCode": "94102"}}
]
```

```execute
cat nested.json | aux4 2table name,age,address[street,city,state,zipCode]
```

```expect
 name  age  address
            street       city  state  zipCode
 John   30  123 Main St  NYC   NY     10001
 Jane   25  456 Oak Ave  SF    CA     94102
```

## array of objects

```file:array.json
[
  {"name": "John", "age": 30, "address": [{"street": "123 Main St", "city": "NYC", "state": "NY", "zipCode": "10001"}, {"street": "456 Oak Ave", "city": "NYC", "state": "NY", "zipCode": "10002"}]},
  {"name": "Jane", "age": 25, "address": [{"street": "789 Pine St", "city": "SF", "state": "CA", "zipCode": "94102"}]}
]
```

```execute
cat array.json | aux4 2table name,age,address[street,city,state,zipCode]
```

```expect
 name  age  address
            street       city  state  zipCode
 John   30  123 Main St  NYC   NY     10001
            456 Oak Ave  NYC   NY     10002
 Jane   25  789 Pine St  SF    CA     94102
```

## fixed width columns with text wrapping

```file:long-text.json
[
  {"name": "Alice", "description": "This is a very long description that should wrap to multiple lines when displayed in a fixed width column"},
  {"name": "Bob", "description": "Short description"},
  {"name": "Charlie", "description": "Another extremely long description that contains multiple sentences and should definitely be wrapped across several lines to fit within the specified column width"}
]
```

```execute
cat long-text.json | aux4 2table 'name{width:8},description{width:20}'
```

```expect
 name      description
 Alice     This is a very long
           description that
           should wrap to
           multiple lines when
           displayed in a fixed
           width column
 Bob       Short description
 Charlie   Another extremely
           long description
           that contains
           multiple sentences
           and should
           definitely be
           wrapped across
           several lines to fit
           within the specified
           column width
```

## deeply nested objects with property selection

```file:deep-nested.json
[
  {
    "name": "John",
    "age": 30,
    "contact": {
      "email": "john@example.com",
      "address": {
        "street": "123 Main St",
        "city": "NYC",
        "country": "USA"
      }
    }
  },
  {
    "name": "Jane",
    "age": 25,
    "contact": {
      "email": "jane@example.com",
      "address": {
        "street": "456 Oak Ave",
        "city": "SF",
        "country": "USA"
      }
    }
  }
]
```

```execute
cat deep-nested.json | aux4 2table name,age,contact[email,address[street,city]]
```

```expect
 name  age  contact
            email             address
                              street       city
 John   30  john@example.com  123 Main St  NYC
 Jane   25  jane@example.com  456 Oak Ave  SF
```

## nested objects inside arrays

```file:nested-array-objects.json
[
  {
    "id": 1,
    "contacts": [
      {
        "person": {"name": "John Smith", "email": "john@example.com"},
        "address": {"street": "123 Main St", "city": "NYC"}
      },
      {
        "person": {"name": "Jane Doe", "email": "jane@example.com"},
        "address": {"street": "456 Oak Ave", "city": "SF"}
      }
    ]
  },
  {
    "id": 2,
    "contacts": [
      {
        "person": {"name": "Bob Wilson", "email": "bob@example.com"},
        "address": {"street": "789 Pine St", "city": "LA"}
      }
    ]
  }
]
```

```execute
cat nested-array-objects.json | aux4 2table 'id,contacts[person[name,email],address[street,city]]'
```

```expect
 id  contacts
     person                        address
     name        email             street       city
  1  John Smith  john@example.com  123 Main St  NYC
     Jane Doe    jane@example.com  456 Oak Ave  SF
  2  Bob Wilson  bob@example.com   789 Pine St  LA
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
cat people.json | aux4 2table name:Name,age:Age,email:"Email Address"
```

```expect
 Name     Age  Email Address
 Alice     30  alice@example.com
 Bob       25  bob@example.com
 Charlie   35  charlie@example.com
```

## nested column renaming

```file:employees.json
[
  {"name": "John", "age": 30, "contact": {"email": "john@example.com", "phone": "123-456-7890"}},
  {"name": "Jane", "age": 25, "contact": {"email": "jane@example.com", "phone": "987-654-3210"}}
]
```

```execute
cat employees.json | aux4 2table name:"Full Name",age:"Years Old",contact:"Contact Info"[email:"Email Address",phone:"Phone Number"]
```

```expect
 Full Name  Years Old  Contact Info
                       Email Address     Phone Number
 John              30  john@example.com  123-456-7890
 Jane              25  jane@example.com  987-654-3210
```

## auto-structure with missing nested fields

```file:people-missing-fields.json
[
  {
    "name": "John",
    "age": 30,
    "address": [
      {
        "street": "123 Main St",
        "city": "NYC",
        "state": "NY",
        "zipCode": "10001"
      },
      {
        "street": "456 Oak Ave",
        "city": "NYC",
        "zipCode": "10002"
      }
    ]
  },
  {
    "name": "Jane",
    "age": 25,
    "address": [
      {
        "street": "789 Pine St",
        "city": "SF",
        "state": "CA",
        "zipCode": "94102"
      }
    ]
  }
]
```

```execute
cat people-missing-fields.json | aux4 2table
```

```expect
 name  age  address
            street       city  state  zipCode
 John   30  123 Main St  NYC   NY     10001
            456 Oak Ave  NYC          10002
 Jane   25  789 Pine St  SF    CA     94102
```

## property selection with dot notation

```file:people-with-nested.json
[
  {"name": "Alice", "age": 30, "address": {"city": "New York", "state": "NY", "country": "USA"}},
  {"name": "Bob", "age": 25, "address": {"city": "Los Angeles", "state": "CA", "country": "USA"}},
  {"name": "Charlie", "age": 35, "address": {"city": "Chicago", "state": "IL", "country": "USA"}}
]
```

```execute
cat people-with-nested.json | aux4 2table name,age,address.city,address.state
```

```expect
 name     age  address.city  address.state
 Alice     30  New York      NY
 Bob       25  Los Angeles   CA
 Charlie   35  Chicago       IL
```

## property selection with arrays

```file:companies.json
[
  {
    "name": "TechCorp",
    "employees": [
      {"person": {"firstName": "John", "lastName": "Smith"}, "role": "Developer", "salary": 75000},
      {"person": {"firstName": "Jane", "lastName": "Doe"}, "role": "Designer", "salary": 70000}
    ]
  },
  {
    "name": "StartupInc", 
    "employees": [
      {"person": {"firstName": "Mike", "lastName": "Wilson"}, "role": "CEO", "salary": 120000}
    ]
  }
]
```

```execute
cat companies.json | aux4 2table name,employees[person.firstName,person.lastName,role,salary]
```

```expect
 name        employees
             person.firstName  person.lastName  role       salary
 TechCorp    John              Smith            Developer   75000
             Jane              Doe              Designer    70000
 StartupInc  Mike              Wilson           CEO        120000
```

## dot notation property selection

```file:people-with-address.json
[
  {"name": "Alice", "age": 30, "address": {"city": "New York", "state": "NY", "country": "USA"}},
  {"name": "Bob", "age": 25, "address": {"city": "Los Angeles", "state": "CA", "country": "USA"}},
  {"name": "Charlie", "age": 35, "address": {"city": "Chicago", "state": "IL", "country": "USA"}}
]
```

```execute
cat people-with-address.json | aux4 2table name,age,address.city,address.state
```

```expect
 name     age  address.city  address.state
 Alice     30  New York      NY
 Bob       25  Los Angeles   CA
 Charlie   35  Chicago       IL
```

## multi-level dot notation

```file:people-nested.json
[
  {
    "id": 1,
    "person": {
      "firstName": "John",
      "lastName": "Smith",
      "address": {
        "city": "New York",
        "state": "NY"
      }
    }
  },
  {
    "id": 2,
    "person": {
      "firstName": "Jane",
      "lastName": "Doe",
      "address": {
        "city": "Los Angeles",
        "state": "CA"
      }
    }
  }
]
```

```execute
cat people-nested.json | aux4 2table id,person.firstName,person.lastName,person.address.city,person.address.state
```

```expect
 id  person.firstName  person.lastName  person.address.city  person.address.state
  1  John              Smith            New York             NY
  2  Jane              Doe              Los Angeles          CA
```

## single object input

```file:single-object.json
{"name": "Alice", "age": 30, "city": "New York", "email": "alice@example.com"}
```

```execute
cat single-object.json | aux4 2table ascii name,age,city,email
```

```expect
 name   age  city      email
 Alice   30  New York  alice@example.com
```
