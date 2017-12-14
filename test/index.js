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
                            "key": "string:20",
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

            if (dbSql.indexOf("CREATE TABLE `default`") === -1) {
                done(new Error("create table not found"));
                return;
            }

            if (dbSql.indexOf("`id` int unsigned NOT NULL AUTO_INCREMENT") === -1) {
                done(new Error("auto increment not found"));
                return;
            }

            if (dbSql.indexOf("`key` varchar(20) NOT NULL DEFAULT ''") === -1) {
                done(new Error("key string not found"));
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
});
