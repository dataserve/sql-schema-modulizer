"use strict";

const _array = require("lodash/array");
const _object = require("lodash/object");
const path = require("path");
const Type = require("type-of-is");
const util = require("util");

const MySql = require("./mysql");

const DEBUG = true;

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
        autoInc: true
    },
    string: {
        type: "string:255",
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

    constructor(configPath, dbType) {
        if (Type.is(configPath, Object)) {
            this.configDir = __dirname;
            
            this.config = configPath;
        } else {
            this.configDir = path.dirname(configPath);

            this.config = loadJson(configPath);
        }

        this.requires = {};

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

        for (let dbName in this.config) {
            if (!this.requires[dbName]) {
                this.requires[dbName] = {};
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

            if (this.config[dbName].requires && Object.keys(this.config[dbName].requires).length) {
                this.buildModuleRequires(dbName, this.config[dbName].requires, null, cascadeDown);

                this.buildModules(dbName, enable);
            }
            
            //this.debug(this.requires, true);

            //this.debug(this.db.getDbSchema(dbName, this.config[dbName]));
        }
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

    buildModuleRequires(dbName, configRequires, parentTableNamePrepend, cascadeDown) {
        if (!configRequires) {
            return;
        }
        
        for (let module in configRequires) {
            if (!configRequires[module]) {
                configRequires[module] = {};
            }

            let tmpParentTableNamePrepend = parentTableNamePrepend;
            
            let moduleSplit = module.split(":"), modulePrepended = null;
            
            let moduleName = moduleSplit[0], tableNamePrepend = moduleSplit[1];

            if (tableNamePrepend) {
                if (!tmpParentTableNamePrepend) {
                    tmpParentTableNamePrepend= "";
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

            if (this.requires[dbName][modulePrepended]) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], configRequires[module]);
            } else {
                this.requires[dbName][modulePrepended] = configRequires[module];
            }

            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            let moduleContents = loadJson(modulePath), childrenModules = [];

            let cascadeDownTmp = this.extractCascadeDownVariables(moduleContents, cascadeDown);

            let passDown = this.extractPassDownVariables(configRequires[module]);
            
            if (passDown.extends) {
                moduleContents = _object.merge(moduleContents, {extends: passDown.extends});
            }

            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                childrenModules = this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            if (childrenModules.length) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], {childrenModules});
            }

            if (passDown.requires) {
                moduleContents = _object.merge(moduleContents, {requires: passDown.requires});
            }

            if (moduleContents.requires && Object.keys(moduleContents.requires).length) {
                this.buildModuleRequires(dbName, moduleContents.requires, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], cascadeDownTmp);
        }
    }

    buildModuleExtends(dbName, configExtends, parentModule, parentTableNamePrepend, cascadeDown) {
        if (!configExtends) {
            return;
        }

        let parentModuleName, parentTableName;
        
        if (parentModule) {
            let parentModuleSplit = parentModule.split(":");
            
            parentModuleName = parentModuleSplit[0];

            //DO NOT UNCOMMENT: below is relative, arg passed in
            //                  above is resolved absolute path
            //parentTableNamePrepend = parentModuleSplit[1];
        }
        
        let retChildrenModules = [];
        
        for (let module in configExtends) {
            if (!configExtends[module]) {
                configExtends[module] = {};
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
            
            if (this.requires[dbName][modulePrepended]) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], [configExtends[module], {parentModule}]);
            } else {
                this.requires[dbName][modulePrepended] = _object.merge(configExtends[module], {parentModule});
            }

            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            let moduleContents = loadJson(modulePath), childrenModules = [];

            let cascadeDownTmp = this.extractCascadeDownVariables(moduleContents, cascadeDown);

            let passDown = this.extractPassDownVariables(configExtends[module]);

            if (passDown.extends) {
                moduleContents = _object.merge(moduleContents, {extends: passDown.extends});
            }

            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                childrenModules = this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            if (childrenModules.length) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], {childrenModules});
            }

            if (passDown.requires) {
                moduleContents = _object.merge(moduleContents, {requires: passDown.requires});
            }
            
            if (moduleContents.requires && Object.keys(moduleContents.requires).length) {
                this.buildModuleRequires(dbName, moduleContents.requires, tmpParentTableNamePrepend, cascadeDownTmp);
            }

            retChildrenModules.push(modulePrepended);

            this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], cascadeDownTmp);
        }

        return retChildrenModules;
    }    

    extractPassDownVariables(config) {
        let passDown = {
            requires: config.requires,
            extends: config.extends,
        };

        if (passDown.requires) {
            delete config.requires;
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

        for (let module in this.requires[dbName]) {
            let opt = this.requires[dbName][module] || {};
            
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
            
            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
            
            let moduleContents = loadJson(modulePath);
            
            if (!moduleContents.tables || !Object.keys(moduleContents.tables).length) {
                continue;
            }
  
            if (extendTables) {
                moduleContents.tables = _object.mergeWith(moduleContents.tables, extendTables, this.mergeConfig);
            }

            let siblingsAssoc = {}, moduleTables = [];
            
            moduleInfo[module] = {
                tables: [],
                assoc: {}
            };

            for (let table in moduleContents.tables) {
                let tableName = table;
                
                if (tableNamePrepend) {
                    tableName = tableNamePrepend + "_" + tableName;
                }

                if (enable && !tableName.match(enable)) {
                    continue;
                }

                if (!tableInfo[tableName]) {
                    tableInfo[tableName] = {
                        parentModule: parentModule,
                        childrenModules: childrenModules,
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

            this.config[dbName].tables = _object.mergeWith(this.config[dbName].tables, tables, this.mergeConfig);
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
    
    mergeConfig(objValue, srcValue) {
        if (typeof objValue !== "undefined" && !Type.is(objValue, Object) && !Array.isArray(objValue)) {
            objValue = [objValue];
        }
        
        if (typeof srcValue !== "undefined" && !Type.is(srcValue, Object) && !Array.isArray(srcValue)) {
            srcValue = [srcValue];
        }
        
        if (Array.isArray(objValue)) {
            if (!Array.isArray(srcValue)) {
                srcValue = [srcValue];
            }
            
            return _array.uniq(objValue.concat(srcValue));
        }
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
