# 2table Line Numbers Feature

## ASCII format with line numbers

```file:test-people.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  {"name": "Charlie", "age": 35, "city": "Chicago"}
]
```

```execute
cat test-people.json | aux4 2table name,age,city --lineNumbers true
```

```expect
 #  name     age  city
 1  Alice     30  New York
 2  Bob       25  Los Angeles
 3  Charlie   35  Chicago
```

## Single object with line numbers

```file:single-person.json
{"name": "Alice", "age": 30, "city": "New York", "email": "alice@example.com"}
```

```execute
cat single-person.json | aux4 2table name,age,city,email --lineNumbers true
```

```expect
 #  name   age  city      email
 1  Alice   30  New York  alice@example.com
```

## Large dataset with double-digit line numbers

```file:large-dataset.json
[
  {"name": "Alice", "age": 30, "city": "New York"},
  {"name": "Bob", "age": 25, "city": "Los Angeles"},
  {"name": "Charlie", "age": 35, "city": "Chicago"},
  {"name": "Diana", "age": 28, "city": "Boston"},
  {"name": "Eve", "age": 32, "city": "Seattle"},
  {"name": "Frank", "age": 29, "city": "Denver"},
  {"name": "Grace", "age": 31, "city": "Austin"},
  {"name": "Henry", "age": 27, "city": "Miami"},
  {"name": "Ivy", "age": 33, "city": "Phoenix"},
  {"name": "Jack", "age": 26, "city": "Portland"},
  {"name": "Kate", "age": 34, "city": "Dallas"},
  {"name": "Liam", "age": 29, "city": "Houston"},
  {"name": "Mia", "age": 31, "city": "Philadelphia"},
  {"name": "Noah", "age": 28, "city": "San Antonio"},
  {"name": "Olivia", "age": 30, "city": "San Diego"}
]
```

```execute
cat large-dataset.json | aux4 2table name,age,city --lineNumbers true
```

```expect
  #  name     age  city
  1  Alice     30  New York
  2  Bob       25  Los Angeles
  3  Charlie   35  Chicago
  4  Diana     28  Boston
  5  Eve       32  Seattle
  6  Frank     29  Denver
  7  Grace     31  Austin
  8  Henry     27  Miami
  9  Ivy       33  Phoenix
 10  Jack      26  Portland
 11  Kate      34  Dallas
 12  Liam      29  Houston
 13  Mia       31  Philadelphia
 14  Noah      28  San Antonio
 15  Olivia    30  San Diego
```