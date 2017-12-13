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
                    done("dbSql missing table " + tableName);
                }

                let tableSql = modulizer.getTableSchema(dbName, tableName);

                if (tableSql.indexOf(match) === -1) {
                    done("tableSql missing table " + tableName);
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

            done();
        } catch (err) {
            done(err);
        }
    });
});
