# sql-schema-modulizer
Utilize reusable components as building blocks for architecting your SQL schema

## Configuration JSON Files

### Define data tables directly
View the example [config/example.json](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/example.json) file for reference.

### Define data tables using pre-defined modules
View the example [config/exampleBlogModules.json](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/exampleBlogModules.json) which generates the entire model layer for a blog using common modules. The [`mobuleBlog`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleBlog.json) module extends and requires: [`moduleComment`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleComment.json), [`moduleCategory`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleCategory.json), [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json), and [`moduleUser`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleUser.json). Some are used more than once for different reasons. For example the [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json) module is built into three separate tables which are used for different cases: media inside blog posts, media inside comments to the blog, and user profile images for blog post authors and blog post commenters.

## Configuration JSON Syntax
There are two types of configuration styles. One defines all your tables directly, the other uses modules to extend common functionality via "sub-systems".

#### Top Level
```javascript
{
  "dbName1": <db object>,
  "dbName2": <db object>,
  ...
}
```

#### `<db object>`
```javascript
{
  "tables": <tables object>,
  "requires": <requires object>
}
```

#### `<tables object>`
```javascript
{
  "<tableName1>": <table object>,
  "<tableName2>": <table object>,
  ...
}
```

#### `<requires object>`
```javascript
{
  "<moduleName>(:<namespace>)": {
    "extends": <extends object>,
    "requires": <requires object>,
    "enableModules": <array of sub modules>,
    "enableTables": <array of sub tables>,
    "tables": <tables object>
  }
}
```

#### `<extends object>`
```javascript
{
  "<parentModuleName>(:<namespace>)": 
    "extends": <extends object>,
    "requires": <requires object>,
    "enableModules": [array of sub modules],
    "enableTables": [array of sub tables],
    "tables": <tables object>
}
```

#### `<table object>`
```javascript
{
  "enabled": <true|false|default:true>,
  "timestamp": <undefined for default|define custom <timestamp object>|null to disable timestamps for table>,
  "fields": <fields object>,
  "keys": <keys object>,
  "relationships": <relationships object>
}
```

#### default `<timestamp object>`
```javascript
{
  created: {
    name: "ctime",
    type: "timestamp",
    fillable: false,
    autoSetTimestamp: true
  },
  modified:{
    name: "mtime",
    type: "timestamp",
    fillable: false,
    autoSetTimestamp: true,
    autoUpdateTimestamp: true
  }
}
```

#### `<fields object>`
```javascript
{
  <"fieldName1">: <field object>,
  <"fieldName2">: <field object>,
  ...
}
```

#### `<field object>`
```javascript
{
  "type": <int|string|string:length|timestamp|tinyint|smallint|mediumint|bigint>,
  "fillable": <true|false|default:false>,
  "key": <primary|unique|true|default:false>,
  "nullable": <true|false|default:false>,
  "autoInc": <true|false|default:false>,
  "autoSetTimestamp": <true|false|default:false>,
  "autoUpdateTimestamp": <true|false|default:false>,
  "validate": {
    "add": <validate string>,
    "set": <validate string>
  }
}
```

#### `<keys object>`
```javascript
{
  <"keyName1">: <key object>,
  <"keyName2">: <key object>,
  ...
}
```

#### `<key object>`
```javascript
{
  "type": <unique|true|default:true>,
  "fields": <array of fieldNames>
}
```

#### `<relationships object>`
```javascript
{
  "belongsTo": [array of tableNames],
  "hasOne": [array of tableNames],
  "hasMany": [array of tableNames]
}
```
