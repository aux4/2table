# 2table Complex Nested Auto-Structure Test

```file:complex-nested.json
[{"copilot":{"model":{"config":{"model":"gpt-5-mini"},"type":"openai"}},"my":{"test":{"table":"name,text","long":"this is a very long text example to demonstrate configuration settings in the YAML file.","nested":{"field":"name","array":["item1","item2","item3"]}}},"table":"name,text","test":{"list":[{"name":"David","age":30},{"name":"Eva","age":25},{"name":"Frank","age":28}]}}]
```

## auto-structure with deeply nested objects

```execute
cat complex-nested.json | aux4 2table --format ascii
```

```expect
 copilot             my                                                                                                                               table      test
 model               test                                                                                                                                        list
 config      type    table      long                                                                                      nested                                 name   age
 gpt-5-mini  openai  name,text  this is a very long text example to demonstrate configuration settings in the YAML file.  name   item1, item2, item3  name,text  David   30
                                                                                                                                                                 Eva     25
                                                                                                                                                                 Frank   28
```

## auto-structure with deeply nested objects - markdown format (should match ASCII structure)

```execute
cat complex-nested.json | aux4 2table --format md --structure 'copilot[model[config,type]],my[test[table,long,nested[field,array]]],table,test[list[name,age]]'
```

```expect
| copilot | my | table | test |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| model | test |  | list |  |  |  |  |  |
| config | type | table | long | nested |  | table | name | age |
| gpt-5-mini | openai | name,text | this is a very long text example to demonstrate configuration settings in the YAML file. | name   item1, item2, item3 |  | name,text | David | 30 |
|  |  |  |  |  |  |  | Eva | 25 |
|  |  |  |  |  |  |  | Frank | 28 |
```
