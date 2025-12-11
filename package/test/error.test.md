# 2table Error Handling

## null input

```file:null-input.json
null
```

```execute
cat null-input.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Input cannot be null or undefined
```

## invalid json syntax

```file:invalid-json.json
{"invalid": json}
```

```execute
cat invalid-json.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Invalid JSON input - please ensure your input is valid JSON format
```

## primitive string input

```file:string-input.json
"just a string"
```

```execute
cat string-input.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Input must be a JSON object or array of objects, received: string
```

## primitive number input

```file:number-input.json
42
```

```execute
cat number-input.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Input must be a JSON object or array of objects, received: number
```

## boolean input

```file:boolean-input.json
true
```

```execute
cat boolean-input.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Input must be a JSON object or array of objects, received: boolean
```

## empty array

```file:empty-array.json
[]
```

```execute
cat empty-array.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Input array cannot be empty
```

## array with null elements

```file:array-with-null.json
[null, {"name": "Alice"}]
```

```execute
cat array-with-null.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Invalid data: Item 1 is null or undefined
```

## array with mixed types

```file:mixed-types.json
[{"name": "Alice"}, "invalid", {"name": "Bob"}]
```

```execute
cat mixed-types.json | aux4 2table ascii 2>&1 | head -1
```

```expect
Invalid data: Item 2 must be an object, received: string
```

## mixed value types (should work)

```file:mixed-values.json
{"name": "Alice", "age": 30, "active": true, "score": null, "balance": 123.45}
```

```execute
cat mixed-values.json | aux4 2table ascii name,age,active,score,balance
```

```expect
 name   age  active  score  balance
 Alice   30  true            123.45
```