"use strict";

const SqlSchemaModulizer = require("../index");

describe("SqlSchemaModulizer Tests", function() {
    it("Example Blog Table Names", function(done) {
        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromPath("../config/exampleBlog");

            const dbName = "blog";
            
            const dbSql = modulizer.getDbSchema(dbName);

            const tableNames = [
                "blog",
                "blog_category",
                "blog_category_ref",
                "blog_comment",
                "blog_comment_guest",
                "blog_media",
                "user",
                "user_admin",
                "user_profile_media",
            ];

            for (let tableName of tableNames) {
                let match = "CREATE TABLE `" + tableName + "`";
                
                if (dbSql.indexOf(match) === -1) {
                    done(new Error("dbSql missing table " + tableName));
                    return;
                }

                let tableSql = modulizer.getTableSchema(dbName, tableName);

                if (tableSql.indexOf(match) === -1) {
                    done(new Error("tableSql missing table " + tableName));
                    return;
                }
            }
            
            done();
        } catch (err) {
            done(err);
        }
    });

    it("Build from Manual Config", function(done) {
        const dbName = "modulizer";
        
        const config = {
            [dbName]: {
                "tables": {
                    "default": {
                        "fields": {
                            "id": {
                                "type": "int",
                                "unsigned": true,
                                "autoInc": true,
                                "key": "primary",
                            },
                            "numeric": {
                                "type": "smallint",
                                "nullable": true,
                            },
                            "key": {
                                "type": "string:20",
                                "nullable": true,
                            },
                        },
                    },
                },
            },
        };
        
        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(config);
            
            let dbSql = modulizer.getDbSchema(dbName);

            if (dbSql.indexOf("CREATE DATABASE " + dbName) === -1) {
                done(new Error("create database not found"));
                return;
            }

            let tableSchema = `CREATE TABLE \`default\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`numeric\` smallint DEFAULT NULL,
  \`key\` varchar(20) DEFAULT NULL,
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("create table default not found"));
                return;
            }

            done();
        } catch (err) {
            done(err);
        }
    });

    it("Build modules from Manual Config", function(done) {
        const dbName = "modulizer";
        
        let dbConfig = {
            [dbName]: {
                "imports": {
                    "commentGuest": null,
                    "mediaWithComment|audio": null,
                    "mediaWithComment|photo": null,
                    "mediaWithComment|video:prepend": null,
                }
            }
        }

        let moduleConfig = {
            "mediaWithComment": {
                "extends": {
                    "mediaComment": null,
                },
                "tables": {
                    "media": {
                        "fields": {
                            "id": "autoIncId",
                            "filename": "string:255",
                            "mime": "string:128",
                            ">comment_cnt": "int",
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
                            "url": "string:255",
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
                                "key": true,
                            },
                            "comment": "string:512",
                        },
                        "relationships": {
                            "belongsTo": [
                                "^media",
                                "comment_guest",
                            ]
                        }
                    }
                }
            }
        };
        
        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig, moduleConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            const tableNames = [
                "audio",
                "audio_comment",
                "comment_guest",
                "photo",
                "photo_comment",
                "prepend_video",
                "prepend_video_comment",
            ];

            for (let tableName of tableNames) {
                let match = "CREATE TABLE `" + tableName + "`";
                
                if (dbSql.indexOf(match) === -1) {
                    done(new Error("dbSql missing table " + tableName));
                    return;
                }

                let tableSql = modulizer.getTableSchema(dbName, tableName);

                if (tableSql.indexOf(match) === -1) {
                    done(new Error("tableSql missing table " + tableName));
                    return;
                }
            }

            let tableSchema = `CREATE TABLE \`audio_comment\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`comment_guest_id\` int NOT NULL DEFAULT '0',
  \`comment\` varchar(512) NOT NULL DEFAULT '',
  \`audio_id\` int NOT NULL DEFAULT '0',
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`comment_guest_id\` (\`comment_guest_id\`),
  KEY \`audio_id\` (\`audio_id\`),
  CONSTRAINT \`audio_comment_ibfk_1\` FOREIGN KEY (\`audio_id\`) REFERENCES \`audio\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`audio_comment_ibfk_2\` FOREIGN KEY (\`comment_guest_id\`) REFERENCES \`comment_guest\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table audio_comment schema not found"));
                return;
            }

            tableSchema = `CREATE TABLE \`photo_comment\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`comment_guest_id\` int NOT NULL DEFAULT '0',
  \`comment\` varchar(512) NOT NULL DEFAULT '',
  \`photo_id\` int NOT NULL DEFAULT '0',
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`comment_guest_id\` (\`comment_guest_id\`),
  KEY \`photo_id\` (\`photo_id\`),
  CONSTRAINT \`photo_comment_ibfk_1\` FOREIGN KEY (\`photo_id\`) REFERENCES \`photo\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`photo_comment_ibfk_2\` FOREIGN KEY (\`comment_guest_id\`) REFERENCES \`comment_guest\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table photo_comment schema not found"));
                return;
            }
            
            tableSchema = `CREATE TABLE \`prepend_video\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`filename\` varchar(255) NOT NULL DEFAULT '',
  \`mime\` varchar(128) NOT NULL DEFAULT '',
  \`prepend_video_comment_cnt\` int NOT NULL DEFAULT '0',
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table prepend_video schema not found"));
                return;
            }
            
            done();
        } catch (err) {
            done(err);
        }
    });

    it("Invalid field type", function(done) {
        const dbName = "modulizer";
        
        let dbConfig = {
            [dbName]: {
                "tables": {
                    "test": {
                        "fields": {
                            "id": "notAType"
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            done(new Error("invalid field type not triggered"));
        } catch (err) {
            if (err.message.indexOf("Unknown type") !== -1) {
                done();
            } else {
                done(err);
            }
        }
    });

    it("Multi field key", function(done) {
        const dbName = "modulizer";
        
        let dbConfig = {
            [dbName]: {
                "tables": {
                    "test": {
                        "fields": {
                            "id1": "int",
                            "id2": "int"
                        },
                        "keys": {
                            "ids": {
                                "type": true,
                                "fields": ["id1", "id2"],
                            },
                            "ids_unique": {
                                "type": "unique",
                                "fields": ["id1", "id2"],
                            }
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            if (dbSql.indexOf("KEY `ids` (`id1`,`id2`)") === -1) {
                done(new Error("regular multi key not found"));
                return;
            }

            if (dbSql.indexOf("UNIQUE KEY `ids_unique` (`id1`,`id2`)") === -1) {
                done(new Error("unique multi key not found"));
                return;
            }

            done();
        } catch (err) {
            done(err);
        }
    });
    
    it("Cascading fields", function(done) {
        const dbName = "modulizer";
        
        let dbConfigFail = {
            [dbName]: {
                "imports": {
                    "firstFail|first": null
                },
                "timestamps": null,
                "tableDefaults": null,
                "fieldDefaults": null,
            }
        }

        let dbConfigSuccess = {
            [dbName]: {
                "imports": {
                    "firstSuccess|first": null
                },
                "timestamps": null,
                "tableDefaults": null,
                "fieldDefaults": null,
            }
        }
        
        let moduleConfig = {
            "firstFail": {
                "extends": {
                    "second": null,
                },
                "tables": {
                    "first": {
                        "fields": {
                            "id": "autoIncId",
                        }
                    }
                }
            },
            "firstSuccess": {
                "extends": {
                    "second": null,
                },
                "tables": {
                    "first": {
                        "fields": {
                            "id": "int",
                        }
                    }
                }
            },
            "second": {
                "tableDefaults": {
                    "charset": "fakeCharset",
                    "engine": "fakeEngine",
                },
                "timestamps": {
                    "created": {
                        "name": "created_at",
                        "type": "timestamp",
                        "autoSetTimestamp": true,
                    },
                },
                "fieldDefaults": {
                    "autoIncId": {
                        "type": "smallint",
                        "key": "primary",
                        "autoInc": true,
                        "unsigned": true
                    }
                },
                "extends": {
                    "third": null,
                },
                "tables": {
                    "second": {
                        "fields": {
                            "id": "autoIncId",
                        }
                    }
                }
            },
            "third": {
                "tableDefaults": {
                    "charset": "SuperAmazing",
                },
                "timestamps": {
                    "modified": {
                        "name": "modified_at",
                        "type": "timestamp",
                        "autoSetTimestamp": true,
                        "autoUpdateTimestamp": true,
                    },
                },
                "fieldDefaults": {
                    "autoIncId": {
                        "type": "bigint",
                        "unsigned": true
                    }
                },
                "tables": {
                    "third": {
                        "fields": {
                            "id": "autoIncId",
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfigFail, moduleConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            done(new Error("invalid field type didn't fail"));
        } catch (err) {
            if (err.message.indexOf("Unknown type") === -1) {
                done(err);
                return;
            }
        }

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfigSuccess, moduleConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            let tableSchema = `CREATE TABLE \`first\` (
  \`id\` int NOT NULL DEFAULT '0'
);`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table first schema not found"));
                return;
            }
            
            tableSchema = `CREATE TABLE \`first_second\` (
  \`id\` smallint unsigned NOT NULL AUTO_INCREMENT,
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=fakeEngine DEFAULT CHARSET=fakeCharset;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table first_second schema not found"));
                return;
            }
            
            tableSchema = `CREATE TABLE \`first_second_third\` (
  \`id\` bigint unsigned NOT NULL DEFAULT '0',
  \`modified_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) DEFAULT CHARSET=SuperAmazing;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table first_second_third schema not found"));
                return;
            }

            done();
        } catch (err) {
            done(err);
        }
    });
    

    it("Trigger Various Errors", function(done) {
        const dbName = "modulizer";
        
        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromPath("../config/example");

            modulizer.buildFromPath("../config/example");
            
            let dbSql = modulizer.getDbSchema(dbName);

            done(new Error("multiple builds not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("Schema already built") === -1) {
                done(err);
                return;
            }
        }

        let dbConfig = {
            [dbName]: {
                "tables": {
                    "test": {
                        "fields": {
                            "id": "int"
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            done(new Error("multiple builds not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("Schema already built") === -1) {
                done(err);
                return;
            }
        }

        try {
            const modulizer = new SqlSchemaModulizer("postgresql");

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            done(new Error("unsupported db not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("dbType not supported") === -1) {
                done(err);
                return;
            }
        }

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName + "INVALID");

            done(new Error("invalid db not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("dbName '" + dbName + "INVALID' not found in config") === -1) {
                done(err);
                return;
            }
        }

        try {
            const modulizer = new SqlSchemaModulizer();
            
            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getTableSchema(dbName + "INVALID", "test");

            done(new Error("invalid db table not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("dbName '" + dbName + "INVALID' not found in config") === -1) {
                done(err);
                return;
            }
        }

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getTableSchema(dbName, "testINVALID");

            done(new Error("invalid table not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("tableName 'testINVALID' not found in config") === -1) {
                done(err);
                return;
            }
        }
        
        dbConfig = {
            [dbName]: {
                "imports": {
                    "fakeModule": null
                },
                "tables": {
                    "test": {
                        "fields": {
                            "id": "int"
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            console.log(dbSql);

            done(new Error("invalid module not triggered"));
            return;
        } catch (err) {
            if (err.message.indexOf("module not found") === -1) {
                done(err);
                return;
            }
        }

        done();
    });

    it("Pass thru names", function(done) {
        const dbName = "modulizer";
        
        let dbConfig = {
            [dbName]: {
                "imports": {
                    "combiner": null
                }
            }
        }
        
        let moduleConfig = {
            "combiner": {
                "imports": {
                    "first|combine1": {
                        "extends": {
                            "second|combine2": null,
                        }
                    }
                }
            },
            "first": {
                "tables": {
                    "first": {
                        "fields": {
                            "id": "autoIncId",
                        }
                    }
                }
            },
            "second": {
                "tables": {
                    "second": {
                        "fields": {
                            "id": "autoIncId",
                            "^first_id": "int"
                        }
                    }
                }
            }
        };

        try {
            const modulizer = new SqlSchemaModulizer();

            modulizer.buildFromObject(dbConfig, moduleConfig);
            
            let dbSql = modulizer.getDbSchema(dbName);

            console.log(dbSql);

            let tableSchema = `CREATE TABLE \`combine1\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table combine1 schema not found"));
                return;
            }

            tableSchema = `CREATE TABLE \`combine1_combine2\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`combine1_id\` int NOT NULL DEFAULT '0',
  \`mtime\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  \`ctime\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;`;

            if (dbSql.indexOf(tableSchema) === -1) {
                done(new Error("table combine2 schema not found"));
                return;
            }
        } catch (err) {
            done(err);
            return;
        }
        
        done();
    });
});
