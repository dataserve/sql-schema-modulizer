#!/usr/bin/env nodejs

"use strict";

const cli = require("commander");
const resolve = require("path").resolve;
const {version} = require("./package.json");

const SqlSchemaModulizer = require("./index");

cli.version(version)
    .option("-c, --config <path>", "Config File path")
    .option("-d, --db <type>", "Specify DB 'mysql' or 'postgresql'");

cli.command("sql <dbName> [<tableName>]")
    .description("Output Generated SQL")
    .action((dbName, tableName) => {
        if (!cli.config) {
            console.error("No --conifg <path> specified!");

            process.exit(1);
        }
        
        if (!dbName) {
            console.error("No <dbName> specified!");
            
            process.exit(1);
        }

        const modulizer = new SqlSchemaModulizer(cli.db);

        modulizer.buildFromPath(cli.config);

        try {
            if (!tableName) {
                console.log(modulizer.getDbSchema(dbName));
            } else {
                console.log(modulizer.getTableSchema(dbName, tableName));
            }
        } catch (err) {
            console.error(err.message);

            process.exit(1);
        }
        
        process.exit();
    });

cli.parse(process.argv);

if (!cli.args.length) {
    console.error("Please specify a command! Try '--help' to see command options.");

    process.exit(1);
}
