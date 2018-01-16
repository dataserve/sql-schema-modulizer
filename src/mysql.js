'use strict';

const _object = require('lodash/object');

class MySql {

    constructor(modulizer) {
        this.modulizer = modulizer;
    }

    getDbSchema(dbName, dbConfig) {
        let res = [];

        res.push('CREATE DATABASE ' + dbName + ';');

        if (dbConfig.tables && Object.keys(dbConfig.tables).length) {
            let tables = dbConfig.tables;
            
            let tablesSorted = Object.keys(tables).sort();
            
            for (let tableName of tablesSorted) {
                res.push(this.getTableSchema(tableName, tables[tableName]));
            }
        }
        
        return res.join('\n\n');
    }
    
    getTableSchema(tableName, tableConfig) {
        let fields = tableConfig.fields;

        let keys = tableConfig.keys;

        let belongsTo = tableConfig.relationships && tableConfig.relationships.belongsTo ? tableConfig.relationships.belongsTo : null;

        let timestamps = tableConfig.timestamps;
        
        let res = [];
        
        res.push('CREATE TABLE `' + tableName + '` (');
        
        let defs = [];
        
        for (let field in fields) {
            defs.push('  ' + this.outputFieldSchema(field, fields[field]));
        }

        if (timestamps) {
            for (let field in timestamps) {
                defs.push('  ' + this.outputFieldSchema(timestamps[field].name, timestamps[field]));
            }
        }
        
        for (let field in fields) {
            let keySchema = this.outputKeySchema(field, fields[field]);
            
            if (keySchema) {
                defs.push('  ' + keySchema);
            }
        }
        
        if (keys) {
            for (let key in keys) {
                let keySchema = this.outputMultiKeySchema(key, keys[key]);
                
                if (keySchema) {
                    defs.push('  ' + keySchema);
                }
            }
        }

        if (belongsTo) {
            let cnt = 1;
            
            for (let relatedTableConfig of belongsTo) {
                let [ relatedTableName, relatedConfig ] = this.modulizer.relatedTable(relatedTableConfig);

                relatedConfig = relatedConfig || '';
                
                let [ foreignColumnName, localColumnName ] = relatedConfig.split(',');

                if (!foreignColumnName) {
                    foreignColumnName = 'id';
                }

                if (!localColumnName) {
                    localColumnName = relatedTableName + '_id';
                }
                
                defs.push('  ' + this.outputForeignKeySchema(tableName, relatedTableName, foreignColumnName, localColumnName, cnt));
                
                ++cnt;
            }
        }
        
        let len = defs.length, cnt = 0;
        
        for (let i in defs) {
            let comma = ',';
            
            if (cnt === (len - 1)) {
                comma = '';
            }
            
            defs[i] += comma;
            
            ++cnt;
        }
        
        res = res.concat(defs);

        let close = [')'];

        if (tableConfig.engine) {
            close.push('ENGINE=' + tableConfig.engine);
        }

        if (tableConfig.charset) {
            close.push('DEFAULT CHARSET=' + tableConfig.charset);
        }

        res.push(close.join(' ') + ';');
        
        return res.join('\n');
    }

    outputFieldSchema(field, config) {
        let res = ['`' + field + '`'];

        let [type, length] = config.type.split(':');
        
        if (type === 'string') {
            type = 'varchar';
        }

        switch (type) {
        case 'int':
        case 'bigint':
        case 'mediumint':
        case 'smallint':
        case 'tinyint':
        case 'float':
        case 'double':
        case 'decimal':
            if (length) {
                res.push(`${type}(${length})`);
            } else {
                res.push(type);
            }
            
            if (config.unsigned) {
                res.push('unsigned');
            }

            this.populateDefault(config, '0')

            break;
        case 'varchar':
        case 'char':
            if (!length) {
                length = 255;
            }
            
            res.push(`${type}(${length})`);

            this.populateDefault(config, '');
            
            break;
        case 'text':
        case 'tinytext':
        case 'text':
        case 'mediumtext':
        case 'longtext':
            res.push(type);
            
            break;
        case 'enum':
        case 'set':
            if (!length) {
                throw new Error('Missing values for: ' + field + ' - ' + type + ' - format: `field:value1,value2,value3`');
            }
            
            res.push(`${type}('${length.split(",").join("','")}')`);

            this.populateDefault(config, '');
            
            break;
        case 'date':
            res.push(type);

            this.populateDefault(config, '00-00-00');

            break;
        case 'time':
            res.push(type);

            this.populateDefault(config, '00:00:00');
            
            break;
        case 'datetime':
        case 'timestamp':
            res.push(type);

            this.populateDefault(config, '0000-00-00 00:00:00');

            if (config.autoSetTimestamp) {
                delete config.default;
                
                res.push('DEFAULT CURRENT_TIMESTAMP');
            }
            
            if (config.autoUpdateTimestamp) {
                res.push('ON UPDATE CURRENT_TIMESTAMP');
            }
            break;
        default:
            throw new Error('Unknown type for field: ' + field + ' - ' + type);
        }
        
        if (!config.nullable) {
            res.push('NOT NULL');
        }

        if (typeof config.default !== 'undefined') {
            if (config.default === null) {
                res.push('DEFAULT NULL');
            } else {
                res.push('DEFAULT \'' + config.default.replace("'", "\'") + '\'');
            }
        }
        
        if (config.autoInc) {
            res.push('AUTO_INCREMENT');
        }

        return res.join(' ');
    }

    populateDefault(config, defaultValue) {
        if (!config.default && !config.autoInc) {
            if (config.nullable) {
                config.default = null;
            } else {
                config.default = defaultValue;
            }
        }
    }

    outputKeySchema(field, config) {
        if (!config.key) {
            return;
        }
        
        switch (config.key) {
        case 'primary':
            return 'PRIMARY KEY (`' + field + '`)';
        case 'unique':
            return 'UNIQUE KEY `' + field + '` (`' + field + '`)';
        }
        
        return 'KEY `' + field + '` (`' + field + '`)';
    }

    outputMultiKeySchema(name, config) {
        let {type, fields} = config;
        
        if (!type || !fields) {
            return;
        }
        
        if (!Array.isArray(fields)) {
            fields = [fields];
        }
        
        switch (type) {
        case 'unique':
            return 'UNIQUE KEY `' + name + '` (`' + fields.join('`,`') + '`)';
        }
        
        return 'KEY `' + name + '` (`' + fields.join('`,`') + '`)';
    }

    outputForeignKeySchema(tableName, relatedTableName, foreignColumnName, localColumnName, cnt) {
        return 'CONSTRAINT `' + tableName + '_ibfk_' + cnt + '` FOREIGN KEY (`' + localColumnName + '`) REFERENCES `' + relatedTableName + '` (`' + foreignColumnName + '`) ON DELETE CASCADE ON UPDATE CASCADE';
    }

}

module.exports = MySql;
