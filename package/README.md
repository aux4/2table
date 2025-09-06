# 2table
Convert JSON to ASCII Table

## Install

```
npm install -g 2table
```

## Usage

Example `test.json`
```
[
  {
    "addressLine1": "1333 2ND ST",
    "city": "SANTA MONICA",
    "state": "CA",
    "zip5": "90401",
    "zip4": "4100",
    "info": {
      "carrierRoute": "C002",
      "countyName": "LOS ANGELES",
      "deliveryPoint": "99",
      "checkDigit": "3",
      "cmar": "N"
    }
  },
  {
    "addressLine1": "1333 2ND ST STE 200",
    "city": "SANTA MONICA",
    "state": "CA",
    "zip5": "90401",
    "zip4": "1151",
    "info": {
      "carrierRoute": "C002",
      "countyName": "LOS ANGELES",
      "deliveryPoint": "99",
      "checkDigit": "0",
      "cmar": "N"
    }
  },
  {
    "addressLine1": "1333 2ND ST FL 1",
    "city": "SANTA MONICA",
    "state": "CA",
    "zip5": "90401",
    "zip4": "4104",
    "info": {
      "carrierRoute": "C002",
      "countyName": "LOS ANGELES",
      "deliveryPoint": "99",
      "checkDigit": "9",
      "cmar": "N"
    }
  }
]
```

### Just output the specified fields as columns

```
cat test.json | 2table "addressLine1,city,state,zip5"

 addressLine1         city          state  zip5  
 1333 2ND ST          SANTA MONICA  CA     90401 
 1333 2ND ST STE 200  SANTA MONICA  CA     90401 
 1333 2ND ST FL 1     SANTA MONICA  CA     90401  
```

### Rename the columns

```
cat test.json | 2table "addressLine1:Address,city:City,state:State,zip5:ZipCode"

 Address              City          State  ZipCode 
 1333 2ND ST          SANTA MONICA  CA     90401   
 1333 2ND ST STE 200  SANTA MONICA  CA     90401   
 1333 2ND ST FL 1     SANTA MONICA  CA     90401   
```

### Define column width

```
cat test.json | 2table "addressLine1:Address{width:11},city:City,state:State,zip5:ZipCode"

 Address      City          State  ZipCode 
 1333 2ND ST  SANTA MONICA  CA     90401   
 1333 2ND ST  SANTA MONICA  CA     90401   
 STE 200                                   
 1333 2ND ST  SANTA MONICA  CA     90401   
 FL 1                                      
```

### Define column color

```
cat test.json | 2table "addressLine1:Address{width:11;color:red},city:City,state:State{color:cyan},zip5:ZipCode"

 Address      City          State  ZipCode 
 1333 2ND ST  SANTA MONICA  CA     90401   
 1333 2ND ST  SANTA MONICA  CA     90401   
 STE 200                                   
 1333 2ND ST  SANTA MONICA  CA     90401   
 FL 1                                      
```

### Nested object

```
cat test.json | 2table "addressLine1:Address,city:City,state:State,zip5:ZipCode,info:Details[countyName:County,carrierRoute:Route]"

 Address              City          State  ZipCode  Details            
                                                    County       Route 
 1333 2ND ST          SANTA MONICA  CA     90401    LOS ANGELES  C002  
 1333 2ND ST STE 200  SANTA MONICA  CA     90401    LOS ANGELES  C002  
 1333 2ND ST FL 1     SANTA MONICA  CA     90401    LOS ANGELES  C002  
```