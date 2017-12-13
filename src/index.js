"use strict";

const _array = require("lodash/array");
const _object = require("lodash/object");
const path = require("path");
const Type = require("type-of-is");
const util = require("util");

const MySql = require("./mysql");

const DEBUG = false;

const TABLE_DEFAULTS = {
    charset: "utf8",
    engine: "InnoDB",
};

const TIMESTAMP_DEFAULTS = {
    modified: {
        name: "mtime",
        type: "timestamp",
        fillable: false,
        autoSetTimestamp: true,
        autoUpdateTimestamp: true,
    },
    created: {
        name: "ctime",
        type: "timestamp",
        fillable: false,
        autoSetTimestamp: true,
    },
};

const FIELD_DEFAULTS = {
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
};

const CASCADE_DOWN_FIELDS = {
    tableDefaults: TABLE_DEFAULTS,
    timestamps: TIMESTAMP_DEFAULTS,
    fieldDefaults: FIELD_DEFAULTS,
};

function loadJson(path) {
    return JSON.parse(JSON.stringify(require(path)));
}

class SqlSchemaModulizer {

    constructor(dbType) {
        this.config = {};

        this.configDir = null;

        this.modules = {};

        this.tree = {};

        this.built = false;

        if (!dbType) {
            dbType = "mysql";
        }
        
        //TODO: add support for postgresql
        switch (dbType.toLowerCase()) {
        case "mysql":
            this.db = new MySql();
            
            break;
        default:
            throw new Error("dbType not supported");
        }
    }

    buildFromPath(configPath) {
        if (this.built) {
            throw new Error("Schema already built!");
        }
            
        this.configDir = path.dirname(configPath);
        
        this.config = loadJson(configPath);

        this.build();
    }

    buildFromObject(config, modules) {
        if (this.built) {
            throw new Error("Schema already built!");
        }

        this.config = config || {};

        this.modules = modules || {};

        this.build();
    }

    getModuleContents(moduleName) {
        moduleName = moduleName.split("|")[0];
        
        if (this.modules[moduleName]) {
            return JSON.parse(JSON.stringify(this.modules[moduleName]));
        }

        if (this.configDir) {
            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            return loadJson(modulePath);
        }

        throw new Error("module not found: " + moduleName);
    }

    build() {
        for (let dbName in this.config) {
            if (!this.tree[dbName]) {
                this.tree[dbName] = {};
            }

            let enable = null;
            
            if (this.config[dbName].enable) {
                enable = "^" + this.config[dbName].enable.split("*").join(".*") + "$";
            } else if (this.config[dbName].disable) {
                enable = "^((?!" + this.config[dbName].disable.split("*").join(".*") + ").)*$";
            }

            if (enable) {
                enable = new RegExp(enable, "i");
            }

            let cascadeDown = {};

            for (let cascadeField in CASCADE_DOWN_FIELDS) {
                cascadeDown[cascadeField] = typeof this.config[dbName][cascadeField] !== "undefined"
                    ? this.config[dbName][cascadeField] : CASCADE_DOWN_FIELDS[cascadeField];
            }

            if (this.config[dbName].tables) {
                this.buildTables(dbName, cascadeDown);
            }

            if (this.config[dbName].imports && Object.keys(this.config[dbName].imports).length) {
                this.buildModuleImports(dbName, this.config[dbName].imports, null, cascadeDown);

                this.buildModules(dbName, enable);
            }
            
            //this.debug(this.tree, true);

            //this.debug(this.db.getDbSchema(dbName, this.config[dbName]));
        }

        this.built = true;
    }

    buildTables(dbName, cascadeDown) {
        let cascadeVars = {};

        for (let cascadeField in CASCADE_DOWN_FIELDS) {
            if (typeof cascadeDown[cascadeField] !== "undefined") {
                cascadeVars[cascadeField] = cascadeDown[cascadeField];
            }
        }

        for (let table in this.config[dbName].tables) {
            let tableConfig = this.config[dbName].tables[table];
            
            _object.merge(tableConfig, cascadeVars);
        }
    }

    // this is a recursive function, along with buildModuleExtends()
    buildModuleImports(dbName, config, parentTableNamePrepend, cascadeDown) {
        if (!config) {
            return;
        }
        
        for (let module in config) {
            if (!config[module]) {
                config[module] = {};
            }

            let tmpParentTableNamePrepend = parentTableNamePrepend;
            
            let moduleSplit = module.split(":"), modulePrepended = null;
            
            let moduleName = moduleSplit[0], tableNamePrepend = moduleSplit[1];

            let moduleNameSplit = moduleName.split("|");

            if (tableNamePrepend) {
                if (!tmpParentTableNamePrepend) {
                    tmpParentTableNamePrepend = "";
                } else {
                    tmpParentTableNamePrepend += "_";
                }
                
                tmpParentTableNamePrepend += tableNamePrepend;
            }

            if (tmpParentTableNamePrepend) {
                modulePrepended = moduleName + ":" + tmpParentTableNamePrepend;
            } else {
                modulePrepended = module;
            }

            if (this.tree[dbName][modulePrepended]) {
                _object.merge(this.tree[dbName][modulePrepended], config[module]);
            } else {
                this.tree[dbName][modulePrepended] = config[module];
            }

            let moduleContents = this.getModuleContents(moduleName), childrenModules = [];

            let cascadeDownTmp = this.extractCascadeDownVariables(moduleContents, cascadeDown);

            let passThruTableName = null;
            
            let passDown = this.extractPassDownVariables(config[module]);
            
            if (passDown.extends) {
                _object.merge(moduleContents, {extends: passDown.extends});
            }

            // is this a "pass-thru" module? aka tableless
            // -- if so, need to pass along "passThruTableName" value
            if (parentTableNamePrepend && !config[module].tables && moduleNameSplit[1]) {
                passThruTableName = moduleNameSplit[1];

                this.setPassThruTableName(passThruTableName, moduleContents);
            }
            
            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                childrenModules = this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            if (childrenModules.length) {
                _object.merge(this.tree[dbName][modulePrepended], {childrenModules});
            }

            if (passDown.imports) {
                _object.merge(moduleContents, {imports: passDown.imports});
            }

            if (moduleContents.imports && Object.keys(moduleContents.imports).length) {
                this.buildModuleImports(dbName, moduleContents.imports, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            _object.merge(this.tree[dbName][modulePrepended], cascadeDownTmp);
        }
    }

    // this is a recursive function, along with buildModuleImports()
    buildModuleExtends(dbName, config, parentModule, parentTableNamePrepend, cascadeDown) {
        if (!config) {
            return;
        }

        let parentModuleName, parentTableName;
        
        if (parentModule) {
            let parentModuleSplit = parentModule.split(":")[0].split("|");

            parentModuleName = parentModuleSplit[1] ? parentModuleSplit[1] : parentModuleSplit[0];
        }
        
        let retChildrenModules = [];

        for (let module in config) {
            if (!config[module]) {
                config[module] = {};
            }

            let tmpParentTableNamePrepend = parentTableNamePrepend;
            
            let moduleSplit = module.split(":"), modulePrepended = null;
            
            let moduleName = moduleSplit[0], tableNamePrepend = moduleSplit[1];

            if (parentModuleName) {
                if (!tmpParentTableNamePrepend) {
                    tmpParentTableNamePrepend = parentModuleName;
                } else {
                    tmpParentTableNamePrepend += "_" + parentModuleName;
                }
            }
            
            if (tmpParentTableNamePrepend) {
                if (tableNamePrepend) {
                    tmpParentTableNamePrepend += "_" + tableNamePrepend;
                }
                
                modulePrepended = moduleName + ":" + tmpParentTableNamePrepend;
            } else {
                modulePrepended = module;
            }
            
            if (this.tree[dbName][modulePrepended]) {
                _object.merge(this.tree[dbName][modulePrepended], config[module], {parentModule});
            } else {
                this.tree[dbName][modulePrepended] = _object.merge({}, config[module], {parentModule});
            }

            let moduleContents = this.getModuleContents(moduleName), childrenModules = [];

            let cascadeDownTmp = this.extractCascadeDownVariables(moduleContents, cascadeDown);

            let passDown = this.extractPassDownVariables(config[module]);

            if (passDown.extends) {
                _object.merge(moduleContents, {extends: passDown.extends});
            }

            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                childrenModules = this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            if (childrenModules.length) {
                _object.merge(this.tree[dbName][modulePrepended], {childrenModules});
            }

            if (passDown.imports) {
                _object.merge(moduleContents, {imports: passDown.imports});
            }
            
            if (moduleContents.imports && Object.keys(moduleContents.imports).length) {
                this.buildModuleImports(dbName, moduleContents.imports, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            retChildrenModules.push(modulePrepended);

            _object.merge(this.tree[dbName][modulePrepended], cascadeDownTmp);
        }

        return retChildrenModules;
    }    

    setPassThruTableName(passThruTableName, moduleContents) {
        for (let field of ["extends", "imports"]) {
            for (let module in moduleContents[field]) {
                let moduleSplit = module.split(":");
                
                let moduleName = moduleSplit[0], tableNamePrepend = moduleSplit[1];

                let moduleNameSplit = moduleName.split("|");

                moduleName = moduleNameSplit[0];

                let newModuleName = moduleName + "|" + passThruTableName;

                if (tableNamePrepend) {
                    newModuleName += ":" + tableNamePrepend;
                }

                moduleContents[field][newModuleName] = moduleContents[field][module];

                delete moduleContents[field][module];
            }
        }
    }
    
    extractPassDownVariables(config, passThruTableName) {
        let passDown = {
            imports: config.imports,
            extends: config.extends,
        };

        if (passDown.imports) {
            delete config.imports;
        }
        
        if (passDown.extends) {
            delete config.extends;
        }
        
        return passDown;
    }

    extractCascadeDownVariables(moduleContents, cascadeDown) {
        let cascadeDownTmp = Object.assign({}, cascadeDown);

        for (let cascadeField in CASCADE_DOWN_FIELDS) {
            if (typeof moduleContents[cascadeField] !== "undefined") {
                cascadeDownTmp[cascadeField] = moduleContents[cascadeField];
            }
        }

        return cascadeDownTmp;
    }
    
    buildModules(dbName, enable) {
        let tables = {}, moduleInfo = {}, tableInfo = {};

        for (let module in this.tree[dbName]) {
            let opt = this.tree[dbName][module] || {};
            
            let extendTables = {}, parentModule = null, childrenModules = null;
            let cascadeVars = {};
            
            if (opt.tables) {
                extendTables = opt.tables;
            }
            
            if (opt.parentModule) {
                parentModule = opt.parentModule;
            }
            
            if (opt.childrenModules) {
                childrenModules = opt.childrenModules;
            }

            for (let cascadeField in CASCADE_DOWN_FIELDS) {
                if (typeof opt[cascadeField] !== "undefined") {
                    cascadeVars[cascadeField] = opt[cascadeField];
                }
            }

            let [moduleName, tableNamePrepend] = module.split(":");

            let moduleNameSplit = moduleName.split("|");

            moduleName = moduleNameSplit[0];

            let updatedTableName = moduleNameSplit[1] ? moduleNameSplit[1] : "";

            let moduleContents = this.getModuleContents(moduleName);
            
            if (!moduleContents.tables || !Object.keys(moduleContents.tables).length) {
                continue;
            }
  
            if (extendTables) {
                _object.merge(moduleContents.tables, extendTables);
            }

            let siblingsAssoc = {}, moduleTables = [];
            
            moduleInfo[module] = {
                tables: [],
                assoc: {}
            };

            let defaultTableName = moduleContents.defaultTable
                ? moduleContents.defaultTable : Object.keys(moduleContents.tables)[0];

            for (let table in moduleContents.tables) {
                let tableName = table;

                if (updatedTableName) {
                    tableName = tableName.replace(defaultTableName, updatedTableName);
                }
                
                if (tableNamePrepend) {
                    tableName = tableNamePrepend + "_" + tableName;
                }

                if (enable && !tableName.match(enable)) {
                    continue;
                }

                if (!tableInfo[tableName]) {
                    tableInfo[tableName] = {
                        parentModule,
                        childrenModules,
                        siblingsAssoc: {},
                    };
                }
                
                tables[tableName] = moduleContents.tables[table];

                _object.merge(tables[tableName], cascadeVars);
                
                moduleInfo[module].assoc[table] = tableName;
                
                moduleInfo[module].tables.push(tableName);
                
                siblingsAssoc[table] = tableName;
                
                moduleTables.push(tableName);
            }

            for (let tableName of moduleTables) {
                tableInfo[tableName].siblingsAssoc = siblingsAssoc;
            }
        }
        
        for (let tableName in tables) {
            let parentTables = {}, siblingTables = {}, childrenTables = {};
            
            if (tableInfo[tableName].parentModule && moduleInfo[tableInfo[tableName].parentModule]) {
                parentTables = moduleInfo[tableInfo[tableName].parentModule].assoc;
            }
            
            if (tableInfo[tableName].childrenModules) {
                for (let childrenModule of tableInfo[tableName].childrenModules) {
                    if (moduleInfo[childrenModule]) {
                        childrenTables = Object.assign(childrenTables, moduleInfo[childrenModule].assoc);
                    }
                }
            }
            
            if (tableInfo[tableName] && tableInfo[tableName].siblingsAssoc) {
                siblingTables = tableInfo[tableName].siblingsAssoc;
            }
            
            this.extendTable(tables, tableName, parentTables, siblingTables, childrenTables);
        }
        
        if (Object.keys(tables).length) {
            if (!this.config[dbName].tables) {
                this.config[dbName].tables = {};
            }

            _object.merge(this.config[dbName].tables, tables);
        }
    }

    extendTable(tables, tableName, parentTables, siblingTables, childrenTables) {
        let tmpParentTables = {};
        
        for (let table in parentTables) {
            tmpParentTables["^" + table] = parentTables[table];
        };
        
        parentTables = tmpParentTables;

        let tmpSiblingTables = {};
        
        for (let table in siblingTables) {
            tmpSiblingTables["$" + table] = siblingTables[table];
        }
        
        siblingTables = tmpSiblingTables;

        let tmpChildrenTables = {};

        for (let table in childrenTables) {
            tmpChildrenTables[">" + table] = childrenTables[table];
        }
        
        childrenTables = tmpChildrenTables;
        
        let table = tables[tableName];
        
        let fields = table.fields;
        
        if (fields) {
            Object.keys(fields).forEach(field => {
                let fieldAssoc = this.associateTable(field, parentTables, siblingTables, childrenTables);
                
                if (fieldAssoc === field) {
                    return;
                }
                
                fields[fieldAssoc] = fields[field];
                
                delete fields[field];
            });
        }
        
        let keys = table.keys;
        
        if (keys) {
            for (let keyName in keys) {
                if (!keys[keyName].fields) {
                    continue;
                }
                
                keys[keyName].fields.forEach((field, index) => {
                    let fieldAssoc = this.associateTable(field, parentTables, siblingTables, childrenTables);
                    
                    if (fieldAssoc === field) {
                        return;
                    }
                    
                    keys[keyName].fields[index] = fieldAssoc;
                });
            }
        }
        
        let relationships = table.relationships;
        
        if (relationships) {
            Object.keys(table.relationships).forEach(rel => {
                table.relationships[rel].forEach((tbl, index) => {
                    let tblAssoc = this.associateTable(tbl, parentTables, siblingTables, childrenTables);
                    
                    if (tblAssoc === tbl) {
                        return;
                    }
                    
                    relationships[rel][index] = tblAssoc;
                });
            });
        }
    }

    associateTable(str, parentTables, siblingTables, childrenTables) {
        if (parentTables) {
            Object.keys(parentTables).sort().forEach(table => {
                str = str.replace(table, parentTables[table]);
            });
        }
        
        if (siblingTables) {
            Object.keys(siblingTables).sort().forEach(table => {
                str = str.replace(table, siblingTables[table]);
            });
        }
        
        if (childrenTables) {
            Object.keys(childrenTables).sort().forEach(table => {
                str = str.replace(table, childrenTables[table]);
            });
        }
        
        return str;
    }
    
    debug(arg, isInspect) {
        if (!DEBUG) {
            return;
        }
        if (isInspect) {
            console.log(util.inspect(arg, false, null));
        } else {
            console.log(arg);
        }
    }

    getDb() {
        return this.db;
    }

    getDbSchema(dbName) {
        if (!this.config[dbName]) {
            throw new Error("dbName '" + dbName + "' not found in config");
        }
        
        return this.db.getDbSchema(dbName, this.config[dbName]);
    }

    getTableSchema(dbName, tableName) {
        if (!this.config[dbName]) {
            throw new Error("dbName '" + dbName + "' not found in config");
        }

        if (!this.config[dbName].tables || !this.config[dbName].tables[tableName]) {
            throw new Error("tableName '" + tableName + "' not found in config");
        }

        let tableConfig = this.config[dbName].tables[tableName];
        
        return this.db.getTableSchema(tableName, tableConfig);
    }
}

module.exports = SqlSchemaModulizer;
