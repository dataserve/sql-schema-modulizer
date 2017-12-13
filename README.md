# sql-schema-modulizer
Utilize reusable components as building blocks for architecting your SQL schema

[![Build Status](https://api.travis-ci.org/dataserve/sql-schema-modulizer.svg?branch=master)](https://travis-ci.org/dataserve/sql-schema-modulizer)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/374af9d5d052451f86b3125ac97d229d)](https://www.codacy.com/app/kdeegan/sql-schema-modulizer?utm_source=github.com&utm_medium=referral&utm_content=dataserve/sql-schema-modulizer&utm_campaign=Badge_Coverage)

## Installation
```
npm install sql-schema-modulizer
```

## Getting Started

### Basic Example
                 
```js
const SqlSchemaModulizer = require("sql-schema-modulizer");

var modulizer = new SqlSchemaModulizer({
    "dbName": {
        "tables": {
            "user": {
                "fields": {
                    "id": {
                        "type": "autoIncId"
                    },
                    "name": {
                        "type": "string:255",
                        "key": "unique"
                    },
                    "password": "string:128"
                }
            }
        }
    }
});

console.log(modulizer.getDbSchema("dbName"));

// Outputs
CREATE DATABASE dbName;

CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `password` varchar(128) NOT NULL,
  `mtime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### Example Using Modules as Building Blocks

```js
const SqlSchemaModulizer = require("sql-schema-modulizer");

let dbConfig = {
    "dbName": {
        "requires": {
            "mediaComment|audio": null,
            "mediaComment|photo": null,
            "mediaComment|video:prepend": null
        }
    }
}

let moduleConfig = {
    "media": {
        "tables": {
            "media": {
                "fields": {
                    "id": "autoIncId",
                    "filename": "string:256",
                    "mime": "string:128"
                }
            }
        }
    },
    "comment": {
        "tables": {
            "comment": {
                "fields": {
                    "id": "autoIncId",
                    "$comment_guest_id": {
                        "type": "int",
                        "key": true
                    },
                    "comment": "string:512"
                }
            },
            "comment_guest": {
                "fields": {
                    "id": "autoIncId",
                    "name": "string:128",
                    "url": "string:256"
                }
            }
        }
    },
    "mediaComment": {
        "requires": {
            "media": {
                "tables": {
                    "media": {
                        ">comment_cnt": "int"
                    },
                    "relationships": {
                        "hasMany": [
                            ">comment"
                        ]
                    }
                },
                "extends": {
                    "comment": {
                        "tables": {
                            "comment": {
                                "fields": {
                                    "^media_id": {
                                        "type": "int",
                                        "key": true
                                    }
                                },
                                "relationships": {
                                    "belongsTo": [
                                        "^media"
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

                 
var modulizer = new SqlSchemaModulizer([
]);

console.log(modulizer.getDbSchema("dbName"));
```

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
  "enable": <enable string match>,
  "disable": <!(enable string match)>,
  "tables": <tables object>,
  "requires": <requires object>,
  "tableDefaults": <cascading tableDefaults object>,
  "timestamps": <cascading timestamps object>,
  "fieldDefaults": <cascading fieldDefaults object>
}
```

#### `<enable string match>`
Only table names matching the regex will be *shown* in SQL schema output. Supports asterisk (*) and or (|)

#### `<!(enable string match)>`
Only table names matching the regex will be *removed* in SQL schema output. Supports asterisk (*) and or (|)

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
    "tableDefaults": <cascading tableDefaults object>,
    "timestamps": <cascading timestamps object>,
    "fieldDefaults": <cascading fieldDefaults object>,
    "tables": <tables object>
  }
}
```

#### `<extends object>`
```javascript
{
  "<parentModuleName>(:<namespace>)": {
    "extends": <extends object>,
    "requires": <requires object>,
    "tableDefaults": <cascading tableDefaults object>,
    "timestamps": <cascading timestamps object>,
    "fieldDefaults": <cascading fieldDefaults object>,
    "tables": <tables object>
  }
}
```

#### `<table object>`
```javascript
{
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
  "key": <primary|unique|true|default:false>,
  "nullable": <true|false|default:false>,
  "autoInc": <true|false|default:false>,
  "autoSetTimestamp": <true|false|default:false>,
  "autoUpdateTimestamp": <true|false|default:false>
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
