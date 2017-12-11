"use strict";

const _array = require("lodash/array");
const _object = require("lodash/object");
const path = require("path");
const Type = require("type-of-is");
const util = require("util");

const MySql = require("./mysql");
const DEBUG = true;

function loadJson(path) {
    return JSON.parse(JSON.stringify(require(path)));
}

class SqlSchemaModulizer {

    constructor(configPath, dbType) {
        this.configDir = path.dirname(configPath);

        this.config = loadJson(configPath);

        this.requires = {};

        //TODO: add support for postgresql
        if (dbType && dbType.toLowerCase !== "mysql") {
            throw new Error("dbType not supported");
        }
        
        this.db = new MySql();

        for (let dbName in this.config) {
            if (!this.requires[dbName]) {
                this.requires[dbName] = {};
            }
            
            if (this.config[dbName].requires && Object.keys(this.config[dbName].requires).length) {
                this.buildModuleExtends(dbName, this.config[dbName].extends);
                
                this.buildModuleRequires(dbName, this.config[dbName].requires);
                
                this.buildModules(dbName);
            }
            
            this.debug(this.requires, true);

            this.debug(this.db.outputDbSchema(dbName, this.config[dbName]));
        }
    }

    buildModuleExtends(dbName, configExtends, parentModule, parentTableNamePrepend) {
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

            let configPassDown = this.extractPassDownVariables(configExtends[module]);
            
            if (this.requires[dbName][modulePrepended]) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], [configExtends[module], {parentModule}]);
            } else {
                this.requires[dbName][modulePrepended] = _object.merge(configExtends[module], {parentModule});
            }

            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            let moduleContents = loadJson(modulePath), childrenModules = [];

            if (configPassDown.extends) {
                moduleContents = _object.mergeWith(moduleContents, {extends: configPassDown.extends}, this.mergeConfig);
            }
            
            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                childrenModules = this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend);
            }

            if (childrenModules.length) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], {childrenModules});
            }

            if (configPassDown.requires) {
                moduleContents = _object.mergeWith(moduleContents, {requires: configPassDown.requires}, this.mergeConfig);
            }
            
            if (moduleContents.requires && Object.keys(moduleContents.requires).length) {
                this.buildModuleRequires(dbName, moduleContents.requires, tmpParentTableNamePrepend);
            }

            retChildrenModules.push(modulePrepended);
        }

        return retChildrenModules;
    }
    
    buildModuleRequires(dbName, configRequires, parentTableNamePrepend) {
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

            let configPassDown = this.extractPassDownVariables(configRequires[module]);

            if (this.requires[dbName][modulePrepended]) {
                this.requires[dbName][modulePrepended] = _object.merge(this.requires[dbName][modulePrepended], configRequires[module]);
            } else {
                this.requires[dbName][modulePrepended] = configRequires[module];
            }

            let modulePath = this.configDir + "/module" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            let moduleContents = loadJson(modulePath);

            if (configPassDown.extends) {
                moduleContents = _object.mergeWith(moduleContents, {extends: configPassDown.extends}, this.mergeConfig);
            }

            if (moduleContents.extends && Object.keys(moduleContents.extends).length) {
                this.buildModuleExtends(dbName, moduleContents.extends, modulePrepended, tmpParentTableNamePrepend);
            }

            if (configPassDown.requires) {
                moduleContents = _object.mergeWith(moduleContents, {requires: configPassDown.requires}, this.mergeConfig);
            }

            if (moduleContents.requires && Object.keys(moduleContents.requires).length) {
                this.buildModuleRequires(dbName, moduleContents.requires, tmpParentTableNamePrepend);
            }
        }
    }

    extractPassDownVariables(config) {
        let configPassDown = {
            requires: config.requires,
            extends: config.extends,
        };

        if (configPassDown.requires) {
            delete config.requires;
        }
        
        if (configPassDown.extends) {
            delete config.extends;
        }
        
        return configPassDown;
    }
    
    buildModules(dbName) {
        let tables = {}, moduleInfo = {}, tableInfo = {};
        
        for (let module in this.requires[dbName]) {
            let opt = this.requires[dbName][module];
            
            let enable = [], extendTables = {}, parentModule = null, childrenModules = null;
            
            if (opt) {
                if (opt.enable) {
                    if (!Array.isArray(opt.enable)) {
                        enable = [opt.enable];
                    } else {
                        enable = opt.enable;
                    }
                }
                
                if (opt.tables) {
                    extendTables = opt.tables;
                }
                
                if (opt.parentModule) {
                    parentModule = opt.parentModule;
                }
                
                if (opt.childrenModules) {
                    childrenModules = opt.childrenModules;
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
                if (typeof moduleContents.tables[table].enabled !== "undefined"
                    && !moduleContents.tables[table].enabled
                    && enable.indexOf(table) === -1) {
                    continue;
                }
                
                let tableName = table;
                
                if (tableNamePrepend) {
                    tableName = tableNamePrepend + "_" + tableName;
                }
                
                if (!tableInfo[tableName]) {
                    tableInfo[tableName] = {
                        parentModule: parentModule,
                        childrenModules: childrenModules,
                        siblingsAssoc: {},
                    };
                }
                
                tables[tableName] = moduleContents.tables[table];
                
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

}

module.exports = SqlSchemaModulizer;
