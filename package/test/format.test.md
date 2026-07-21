# 2table format

The `{format:...}` column modifier renders raw values as numbers, currency,
percentages, dates, times or datetimes using Intl formatting. Tests pin
`locale:en-US` and run under `TZ=UTC` so the output is deterministic regardless
of the host machine.

## number

```file:numbers.json
[
  { "n": 1234567.89 },
  { "n": 42 }
]
```

### should group thousands by default

```execute
cat numbers.json | TZ=UTC aux4 2table 'n{format:number,locale:en-US}'
```

```expect
            n
 1,234,567.89
           42
```

### should honor decimals:0

```file:qty.json
[
  { "qty": 3 },
  { "qty": 10 }
]
```

```execute
cat qty.json | TZ=UTC aux4 2table 'qty{format:number,decimals:0,locale:en-US}'
```

```expect
 qty
   3
  10
```

## currency

```file:amounts.json
[
  { "amount": 1234.5 },
  { "amount": 9.5 }
]
```

### should render USD with grouping and two decimals

```execute
cat amounts.json | TZ=UTC aux4 2table 'amount{format:currency,currency:USD,locale:en-US}'
```

```expect
    amount
 $1,234.50
     $9.50
```

## percent

```file:rates.json
[
  { "rate": 0.1234 },
  { "rate": 0.5 }
]
```

### should treat the value as a ratio

```execute
cat rates.json | TZ=UTC aux4 2table 'rate{format:percent,decimals:1,locale:en-US}'
```

```expect
  rate
 12.3%
 50.0%
```

## date

```file:born.json
[
  { "born": "1990-05-01" }
]
```

### should render a short date via style

```execute
cat born.json | TZ=UTC aux4 2table 'born{format:date,style:short,locale:en-US}'
```

```expect
 born
 5/1/90
```

### should let dateStyle override style

```execute
cat born.json | TZ=UTC aux4 2table 'born{format:date,style:short,dateStyle:medium,locale:en-US}'
```

```expect
 born
 May 1, 1990
```

## time

```file:ts.json
[
  { "t": "2026-07-20T14:30:00Z" }
]
```

### should render a short time via style

```execute
cat ts.json | TZ=UTC aux4 2table 't{format:time,style:short,locale:en-US}'
```

```expect
 t
 2:30 PM
```

### should let timeStyle override style

```execute
cat ts.json | TZ=UTC aux4 2table 't{format:time,style:short,timeStyle:medium,locale:en-US}'
```

```expect
 t
 2:30:00 PM
```

## datetime

```file:datetime.json
[
  { "ts": "2026-07-20T14:30:00Z" }
]
```

### should render date and time together with defaults

```execute
cat datetime.json | TZ=UTC aux4 2table 'ts{format:datetime,locale:en-US}'
```

```expect
 ts
 Jul 20, 2026, 2:30 PM
```

### should apply style to both date and time parts

```execute
cat datetime.json | TZ=UTC aux4 2table 'ts{format:datetime,style:medium,locale:en-US}'
```

```expect
 ts
 Jul 20, 2026, 2:30:00 PM
```

### should let timeStyle override style for the time part only

```execute
cat datetime.json | TZ=UTC aux4 2table 'ts{format:datetime,style:medium,timeStyle:short,locale:en-US}'
```

```expect
 ts
 Jul 20, 2026, 2:30 PM
```

## right alignment

```file:mixed.json
[
  { "name": "Alice", "amount": 1234.5 },
  { "name": "Bob", "amount": 9.5 }
]
```

### should right-align a formatted currency column next to a text column

```execute
cat mixed.json | TZ=UTC aux4 2table 'name,amount{format:currency,locale:en-US}'
```

```expect
 name      amount
 Alice  $1,234.50
 Bob        $9.50
```

## edge cases

```file:edge.json
[
  { "amount": null, "d": "not-a-date" },
  { "amount": 9.5, "d": "2026-07-20T14:30:00Z" }
]
```

### should render empty for null and fall back to the raw value for an invalid date

```execute
cat edge.json | TZ=UTC aux4 2table 'amount{format:currency,locale:en-US},d{format:date,locale:en-US}'
```

```expect
 amount  d
         not-a-date
  $9.50  Jul 20, 2026
```

## other output formats

```file:multi.json
[
  { "amount": 1234.5, "rate": 0.25 }
]
```

### should format values in CSV output and quote the currency field

```execute
cat multi.json | aux4 2table --format csv 'amount{format:currency,locale:en-US},rate{format:percent}'
```

```expect
amount,rate
"$1,234.50",25%
```

### should format values and right-align in Markdown output

```execute
cat multi.json | aux4 2table --format md 'amount{format:currency,locale:en-US},rate{format:percent}'
```

```expect
| amount | rate |
| ---: | ---: |
| $1,234.50 | 25% |
```
