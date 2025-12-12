# 2table Complex Objects Handling

## Complex nested objects with auto-structure

```file:complex-data.json
{
  "config": {
    "database": {
      "host": "localhost",
      "port": 5432,
      "credentials": {
        "username": "admin",
        "password": "secret"
      }
    },
    "api": {
      "endpoints": ["users", "posts", "comments"],
      "rateLimit": 100,
      "features": {
        "caching": true,
        "logging": false
      }
    }
  },
  "metadata": {
    "version": "2.1.0",
    "buildDate": "2023-12-01",
    "dependencies": [
      {"name": "express", "version": "4.18.0"},
      {"name": "mongoose", "version": "7.0.1"}
    ]
  },
  "users": [
    {"id": 1, "role": "admin"},
    {"id": 2, "role": "user"}
  ],
  "settings": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": false,
      "sms": null
    }
  }
}
```

### specify the structure

```execute
cat complex-data.json | aux4 2table 'config[database[host,port,credentials],api[endpoints,rateLimit,features]],metadata[version,buildDate,dependencies[name,version]],users[id,role],settings[theme,notifications[email,push,sms]]'
```

```expect
 config                                                                              metadata                                users      settings
 database                          api                                               version  buildDate   dependencies       id  role   theme  notifications
 host       port  credentials      endpoints             rateLimit  features                              name      version                    email  push   sms
 localhost  5432  [object Object]  users,posts,comments        100  [object Object]  2.1.0    2023-12-01  express   4.18.0    1  admin  dark   true   false
                                                                                                          mongoose  7.0.1     2  user
```

## Complex objects with specified structure

```file:nested-config.json
[
  {
    "service": "authentication",
    "config": {
      "providers": ["google", "facebook", "twitter"],
      "tokens": {
        "jwt": {
          "secret": "abc123",
          "expiry": 3600
        },
        "refresh": {
          "secret": "xyz789",
          "expiry": 86400
        }
      }
    },
    "status": "active"
  },
  {
    "service": "database",
    "config": {
      "connections": {
        "primary": {
          "host": "db1.example.com",
          "pool": 10
        },
        "replica": {
          "host": "db2.example.com",
          "pool": 5
        }
      },
      "cache": {
        "redis": {
          "host": "cache.example.com",
          "ttl": 300
        }
      }
    },
    "status": "maintenance"
  }
]
```

```execute
cat nested-config.json | aux4 2table --table service,config,status
```

```expect
 service         config           status
 authentication  [object Object]  active
 database        [object Object]  maintenance
```

## Array containing mixed object types

```file:mixed-objects.json
[
  {
    "type": "user",
    "data": {
      "profile": {
        "name": "John Doe",
        "settings": {
          "theme": "light",
          "lang": "en"
        }
      },
      "permissions": ["read", "write"]
    }
  },
  {
    "type": "system",
    "data": {
      "logs": [
        {"level": "info", "message": "System started"},
        {"level": "error", "message": "Connection failed"}
      ],
      "metrics": {
        "cpu": 75,
        "memory": 512,
        "disk": {
          "used": 50,
          "total": 100
        }
      }
    }
  }
]
```

```execute
cat mixed-objects.json | aux4 2table
```

```expect
 type    data
         logs                      metrics
         level  message            cpu  memory  disk
 user
 system  info   System started     75     512  [object Object]
         error  Connection failed
```
