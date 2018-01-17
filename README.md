# sql-schema-modulizer
Utilize reusable components as building blocks for architecting your SQL schema. Take the headache out of writing your SQL syntax and the potential for mis-types and rebuilding the wheel.

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

const modulizer = new SqlSchemaModulizer();

modulizer.buildFromObject({
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
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### Simple Example Using Modules & Cascade Down Fields

There are 4 fields that cascade down the configuration tree: charset, engine, timestamps, customFields
                 
```js
const SqlSchemaModulizer = require("sql-schema-modulizer");

const modulizer = new SqlSchemaModulizer();

const dbConfig = {
    "dbName": {
        "imports": {
            "user|user1": {
                "engine": "InnoDB",
                "tables": {
                    "user": {
                        "fields": {
                            "type": "adminEnum"
                        }
                    }
                }
            },
            "user|user2": {
                "charset": "utf8",
                "timestamps": {
                    "modified": null,
                    "created": {
                        "name": "created_at",
                        "type": "datetime",
                        "autoSetTimestamp": true
                    }
                }
            }
        },
        "engine": "MyISM",
        "charset": "latin1_swedish_ci",
        "timestamps": null,
        "customFields": {
            "autoIncId": {
                "type": "int",
                "unsigned": true,
                "autoInc": true,
                "key": "primary"
            },
            "unsignedInt": {
                "type": "int",
                "unsigned": true
            },
            "adminEnum": {
                "type": "enum:USER,ADMIN",
                "default": "USER"
            }
        }
    }
};

const moduleConfig = {
    "user": {
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
            },
            "user_login": {
                "fields": {
                    "id": "autoIncId",
                    "$user_id": {
                        "type": "int",
                        "unsigned": true,
                        "key": true
                    }
                },
                "relationships": {
                    "belongsTo": [
                        "$user"
                    ]
                },
                "timestamps": {
                    "modified": {
                        "name": "modified_at",
                        "type": "timestamp",
                        "autoSetTimestamp": true,
                        "autoUpdateTimestamp": true
                    },
                    "created": {
                        "name": "created_at",
                        "type": "timestamp",
                        "autoSetTimestamp": true
                    }
                }
            }
        }
    }
};
                 
Modulizer.buildFromObject(dbConifg, moduleConfig);

console.log(modulizer.getDbSchema("dbName"));

// Outputs
CREATE DATABASE dbName;

CREATE TABLE `user1` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `type` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1_swedish_ci;

CREATE TABLE `user1_login` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user1_id` int unsigned NOT NULL DEFAULT '0',
  `modified_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user1_id` (`user1_id`),
  CONSTRAINT `user1_login_ibfk_1` FOREIGN KEY (`user1_id`) REFERENCES `user1` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1_swedish_ci;

CREATE TABLE `user2` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISM DEFAULT CHARSET=utf8;

CREATE TABLE `user2_login` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user2_id` int unsigned NOT NULL DEFAULT '0',
  `modified_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user2_id` (`user2_id`),
  CONSTRAINT `user2_login_ibfk_1` FOREIGN KEY (`user2_id`) REFERENCES `user2` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=MyISM DEFAULT CHARSET=utf8;
```

### Advanced Example Using Modules as Building Blocks

```js
const SqlSchemaModulizer = require("sql-schema-modulizer");

const dbConfig = {
    "dbName": {
        "imports": {
            "commentGuest": null,
            "mediaWithComment|audio": null,
            "mediaWithComment|photo": null,
            "mediaWithComment|video:prepend": null
        }
    }
}

const moduleConfig = {
    "commentGuest": {
        "tables": {
            "comment_guest": {
                "fields": {
                    "id": "autoIncId",
                    "name": "string:128",
                    "url": "string:255"
                }
            }
        }
    },
    "mediaWithComment": {
        "extends": {
            "mediaComment": null
        },
        "tables": {
            "media": {
                "fields": {
                    "id": "autoIncId",
                    "filename": "string:255",
                    "mime": "string:128",
                    ">comment_cnt": "int"
                }
            }
        }
    },
    "mediaComment": {
        "tables": {
            "comment": {
                "fields": {
                    "id": "autoIncId",
                    "^media_id": {
                        "type": "int",
                        "key": true
                    },
                    "comment_guest_id": {
                        "type": "int",
                        "key": true
                    },
                    "comment": "string:512"
                },
                "relationships": {
                    "belongsTo": [
                        "^media",
                        "comment_guest"
                    ]
                }
            }
        }
    }
};

const modulizer = new SqlSchemaModulizer();

modulizer.buildFromObject(dbConfig, moduleConfig);

console.log(modulizer.getDbSchema("dbName"));

// Outputs
CREATE DATABASE dbName;

CREATE TABLE `audio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `audio_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `audio_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `audio_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `audio_id` (`audio_id`),
  CONSTRAINT `audio_comment_ibfk_1` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `audio_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `comment_guest` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL DEFAULT '',
  `url` varchar(255) NOT NULL DEFAULT '',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `photo` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `photo_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `photo_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `photo_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `photo_id` (`photo_id`),
  CONSTRAINT `photo_comment_ibfk_1` FOREIGN KEY (`photo_id`) REFERENCES `photo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `photo_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `prepend_video` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `prepend_video_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `prepend_video_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `prepend_video_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `prepend_video_id` (`prepend_video_id`),
  CONSTRAINT `prepend_video_comment_ibfk_1` FOREIGN KEY (`prepend_video_id`) REFERENCES `prepend_video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prepend_video_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

## Configuration JSON Files

### Define data tables directly
View the example [config/example.json](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/example.json) file for reference.

### Define data tables using pre-defined modules
View the example [`config/exampleBlog.json`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/exampleBlog.json) which generates the entire model layer for a blog using common modules. The [`mobuleBlog`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleBlog.json) module extends and imports: [`moduleComment`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleComment.json), [`moduleCategory`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleCategory.json), [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json), and [`moduleUser`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleUser.json). Some are used more than once for different reasons. For example the [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json) module is built into three separate tables which are used for different cases: media inside blog posts, media inside comments to the blog, and user profile images for blog post authors and blog post commenters.

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
  "imports": <imports object>,
  "charset": <cascading charset string (default: utf8)>,
  "engine": <cascading engine string (default: InnoDB)>,
  "timestamps": <cascading timestamps object ([default](https://github.com/dataserve/sql-schema-modulizer/blob/master/src/index.js#L13))>,
  "customFields": <cascading customFields object ([default](https://github.com/dataserve/sql-schema-modulizer/blob/master/src/index.js#L27))>,
  "tables": <tables object>
}
```

#### `<enable string match>`
Only table names matching the regex will be *shown* in SQL schema output. Supports asterisk (*) and or (|)

#### `<!(enable string match)>`
Only table names matching the regex will be *removed* in SQL schema output. Supports asterisk (*) and or (|)

#### `<import object>`
This is used to "import" a module into the current dependency tree. It acts as a drop in feature, it does not give any inheritence functionality between the required module and the parent module. An imported module takes on the same namespace as the place it was requested from.

```javascript
{
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object or null to fetch from config/module[ModuleName].json>,
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object or null to fetch from config/module[ModuleName].json>,
  ...
}
```

#### `<extends object>`
This is used to "extend" the functionality of a module. Modules extended can reference fields in children modules and vice versa. The extendee will take on a sub namespace from the place it was requested from.

```javascript
{
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object or null to fetch from config/module[ModuleName].json>,
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object or null to fetch from config/module[ModuleName].json>,
  ...
}
```

#### `<module object>`
This is used to specify a module. It can be in it's own file `config/module[ModuleName].json` - or passed into the modulizer as a javascript object.

```javascript
{
  "<moduleName>": {
    "extends": <extends object>,
    "imports": <imports object>,
    "charset": <cascading charset string>,
    "engine": <cascading engine string>,
    "timestamps": <cascading timestamps object>,
    "customFields": <cascading customFields object>,
    "defaultTable": <defaultTable string>
    "tables": <tables object>
  }
}
```

#### `<cascading charset string>`
You can use this to set the table character sets (utf8, utf8mb4, latin1_swedish_ci, etc). When this is placed in the dependency tree, all modules "imported" and "extended" below it will use these values.

```javascript
"utf8"
```

#### `<cascading charset string>`
You can use this to set the table storage engines (InnoDB, MyISAM, MEMORY, etc). When this is placed in the dependency tree, all modules "imported" and "extended" below it will use this value.

```javascript
"InnoDB"
```

#### default `<cascading timestamps object>`
Set this to null to disable the timestamps functionality or to create your own. When this is placed in the dependency tree, all modules "imported" and "extended" below it will use these values.

```javascript
{
  created: {
    name: "ctime",
    type: "timestamp",
    autoSetTimestamp: true
  },
  modified:{
    name: "mtime",
    type: "timestamp",
    autoSetTimestamp: true,
    autoUpdateTimestamp: true
  }
}
```

#### default `<cascading customFields object>`
You can use this to create custom field type "macros". When this is placed in the dependency tree, all tables & modules "imported" and "extended" below it will use these values.

```javascript
{
    "autoIncId": {
        "type": "int",
        "key": "primary",
        "autoInc": true,
        "unsigned": true
    },
    "primaryId": {
        "type": "int",
        "key": "primary",
        "unsigned": true
    },
    "foreignId": {
        "type": "int",
        "key": true,
        "unsigned": true
    },
    "string": {
        "type": "varchar:255",
        "default": ""
    }
}
```

#### `<defaultTable string>`
Specify the default table in the module, used in the "^" wildcards from other modules. If defaultTable in a module is not specified, the first table in the JSON object is automatically set as the de3fault.

#### `<tables object>`
If the `<tables object>` is inside a module, they will inherit the modules namespace via a prepended string.

```javascript
{
  "<tableName1>": <table object>,
  "<tableName2>": <table object>,
  ...
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

#### `<fields object>`
```javascript
{
  <fieldName string>: <field object>,
  <fieldName string>: <field object>,
  ...
}
```

#### `<fieldName string>`
There are several "wildcard" characters which can be used in imported/extended modules. They can reference parent modules, children modules, and sibling tables.

* `^tableName<optional string>` would create a column named `${tableName}<optional string>`, referencing the actual generated name of `tableName` in the **parent** module (extended modules only)
* `^_id` is shorthand for above, however referes to the `defaultTable` of the **parent** module (extended modules only)
* `$tableName<optional string>` would create a column name `${tableName}<optional string>`, referencing the actual generated name of `tableName` in the **same** module
* `>tableName<optional string>` would create a column name `${tableName}<optional string>`, referencing the actual generated name of `tableName` in a **child** module (extended modules only)


#### `<field object>`
See [sourcecode](https://github.com/dataserve/sql-schema-modulizer/blob/master/src/mysql.js#L135) for full list of types

```javascript
{
  "type": <int|string(:length)|varchar(:length)|char(:length)|timestamp|tinyint|enum:(val,val)|etc>,
  "key": <primary|unique|true|default:false>,
  "nullable": <true|false|default:false>,
  "default": <string|integer|null|default:nullable==true: null, type==string: "", type==numeric: 0>,
  "autoInc": <true|false|default:false>,
  "autoSetTimestamp": <true|false|default:false>,
  "autoUpdateTimestamp": <true|false|default:false>
}
```

#### `<keys object>`
This is used to specify keys with multiple columns. Keys with single columns are specified in the `<field object>`.

```javascript
{
  <"keyName1">: <key object>,
  <"keyName2">: <key object>,
  ...
}
```

#### `<key object>`
This is used to specify keys with multiple columns. Keys with single columns are specified in the `<field object>`.

```javascript
{
  "type": <unique|true|default:true>,
  "fields": <array of fieldNames>
}
```

#### `<relationships object>`
```javascript
{
  "belongsTo": [array of <relationshipBelongsTo string>],
  "hasOne": [array of <relationshipHas string>],
  "hasMany": [array of <relationshipHas string>]
}
```

#### `<relationshipBelongsTo string>`
Using "belongsTo" DOES create foreign keys by default. If you wish to disable foreign keys for a particular "belongsTo", use the format "tableName:null". By default, `foreignColumnName === "id"` and ``localColumnName === `${tableName}_id` ``.

```javascript
"<relatedTableName string>:foreignColumnName,localColumnName"
```

#### `<relationshipHas string>`
Using "hasOne" or "hasMany" does NOT create foreign keys. By default, ``foreignColumnName === `${tableName}_id` `` and `localColumnName === "id"`.

```javascript
"<relatedTableName string>:foreignColumnName,localColumnName"
```

#### `<relatedTableName string>`
There are several "wildcard" characters which can be used in imported/extended modules. They can reference parent modules, children modules, and sibling tables.

* `^tableName` would reference the `tableName` table of the **parent** module (extended modules only)
* `^` is shorthand for above and would reference the default table of the **parent** module (extended modules only)
* `$tableName` would reference the `tableName` table of the **same** module
* `>tableName` would reference the `tableName` table of a **child** module (extended modules only)
