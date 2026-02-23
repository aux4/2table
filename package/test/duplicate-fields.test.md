# 2table

## duplicate field names in nested structures

```file:duplicate-fields.json
{
  "imap": {
    "host": "imap.gmail.com",
    "port": "993"
  },
  "smtp": {
    "host": "smtp.gmail.com",
    "port": "465"
  }
}
```

```execute
cat duplicate-fields.json | aux4 2table "imap[host,port],smtp[host,port]"
```

```expect
 imap                  smtp
 host            port  host            port
 imap.gmail.com   993  smtp.gmail.com  465
```