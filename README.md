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
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(128) NOT NULL DEFAULT '',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

### Example Using Modules as Building Blocks

```js
const SqlSchemaModulizer = require("sql-schema-modulizer");

let dbConfig = {
    "dbName": {
        "imports": {
            "commentGuest": null,
            "mediaWithComment|audio": null,
            "mediaWithComment|photo": null,
            "mediaWithComment|video:prepend": null
        }
    }
}

let moduleConfig = {
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
                    "comment": "string:512",
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
View the example [config/exampleBlog.json](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/exampleBlog.json) which generates the entire model layer for a blog using common modules. The [`mobuleBlog`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleBlog.json) module extends and imports: [`moduleComment`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleComment.json), [`moduleCategory`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleCategory.json), [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json), and [`moduleUser`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleUser.json). Some are used more than once for different reasons. For example the [`moduleMedia`](https://github.com/dataserve/sql-schema-modulizer/blob/master/config/moduleMedia.json) module is built into three separate tables which are used for different cases: media inside blog posts, media inside comments to the blog, and user profile images for blog post authors and blog post commenters.

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
  "imports": <imports object>,
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

#### `<import object>`
This is used to "import" a module into the current dependency tree. It acts as a drop in feature, it does not give any inheritence functionality between the required module and the parent module. An imported module takes on the same namespace as the place it was requested from.

```javascript
{
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object>,
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object>,
  ...
}
```

#### `<extends object>`
This is used to "extend" the functionality of a module. Modules extended can reference fields in children modules and vice versa. The extendee will take on a sub namespace from the place it was requested from.

```javascript
{
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object>,
  "<moduleName>(|<nameToUseInSchema>)(:<namespace>)": <module object>,
  ...
}
```

#### `<module object>`
This is used to specify a module. It can be in it's own file (config/module[ModuleName].json) - or passed into the modulizer as a javascript object.

```javascript
{
  "<moduleName>": {
    "extends": <extends object>,
    "imports": <imports object>,
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

#### `<cascading tableDefaults object>`
You can use this to set DB configuration options, such as character sets & table storage engines (InnoDB vs MyISAM).

```javascript
{
  "charset": <string>,
  "engine": <string>
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

#### default `<fieldDefaults object>`
You can use this to create custom field type "macros"

```javascript
{
    autoIncId: {
        type: "int",
        key: "primary",
        autoInc: true,
        unsigned: true
    },
    string: {
        type: "string:255",
        default: ""
    },
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
  "default": <string|integer|null|default:nullable==true:null, type==string: "",type==numeric:0>,
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
