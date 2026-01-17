/**
 * Variable Renaming Transform
 * Renames local variables and function parameters
 */

const { ROBLOX_GLOBALS, LUA_KEYWORDS } = require('../presets');

class VariableRenamer {
    constructor(options = {}) {
        this.options = {
            style: 'hex',           // 'short' | 'hex' | 'underscore' | 'mixed'
            preserveGlobals: true,
            preserveRobloxAPI: true,
            addDecoys: false,
            ...options
        };
        
        this.variableMap = new Map();
        this.counter = 0;
        this.stats = {
            renamed: 0,
            preserved: 0
        };
        
        // Build protected names set
        this.protectedNames = new Set(LUA_KEYWORDS);
        if (this.options.preserveRobloxAPI) {
            ROBLOX_GLOBALS.forEach(name => this.protectedNames.add(name));
        }
    }
    
    transform(code) {
        this.variableMap.clear();
        this.counter = 0;
        this.stats = { renamed: 0, preserved: 0 };
        
        let result = code;
        
        // Step 1: Find and collect all local variable declarations
        result = this.renameLocalVariables(result);
        
        // Step 2: Rename function parameters
        result = this.renameFunctionParameters(result);
        
        // Step 3: Rename for loop variables
        result = this.renameForLoopVariables(result);
        
        return {
            code: result,
            stats: {
                variablesRenamed: this.stats.renamed,
                variablesPreserved: this.stats.preserved,
                mappingCount: this.variableMap.size
            }
        };
    }
    
    generateName() {
        const index = this.counter++;
        
        switch (this.options.style) {
            case 'short':
                return this.generateShortName(index);
            case 'hex':
                return this.generateHexName(index);
            case 'underscore':
                return this.generateUnderscoreName(index);
            case 'mixed':
                return this.generateMixedName(index);
            default:
                return this.generateHexName(index);
        }
    }
    
    generateShortName(index) {
        // a, b, c, ..., z, aa, ab, ...
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let name = '';
        let n = index;
        
        do {
            name = chars[n % 26] + name;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        
        // Avoid keywords
        while (this.protectedNames.has(name)) {
            name = '_' + name;
        }
        
        return name;
    }
    
    generateHexName(index) {
        // _0x2f4a, _0x1b3c, ...
        const hex = index.toString(16).padStart(4, '0');
        return `_0x${hex}`;
    }
    
    generateUnderscoreName(index) {
        // ___, ____, _____, ...
        // Using different patterns to distinguish
        const base = '_'.repeat((index % 10) + 3);
        const suffix = Math.floor(index / 10);
        return base + (suffix > 0 ? suffix.toString() : '');
    }
    
    generateMixedName(index) {
        // Mix of l, I, 1 and _ to confuse readers
        // _lI1Il, _l1IlI, ...
        const chars = ['l', 'I', '1', '_'];
        let name = '_';
        
        let n = index;
        for (let i = 0; i < 6; i++) {
            name += chars[(n + i) % 4];
            n = Math.floor(n / 4);
        }
        
        return name;
    }
    
    shouldRename(varName) {
        // Don't rename protected names
        if (this.protectedNames.has(varName)) {
            this.stats.preserved++;
            return false;
        }
        
        // Don't rename if starts with _ and looks like internal
        if (varName.startsWith('__')) {
            this.stats.preserved++;
            return false;
        }
        
        return true;
    }
    
    getOrCreateMapping(varName) {
        if (!this.shouldRename(varName)) {
            return varName;
        }
        
        if (!this.variableMap.has(varName)) {
            const newName = this.generateName();
            this.variableMap.set(varName, newName);
            this.stats.renamed++;
        }
        
        return this.variableMap.get(varName);
    }
    
    renameLocalVariables(code) {
        // Match: local varName or local var1, var2, var3
        const localPattern = /\blocal\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
        
        let result = code;
        const declarations = [];
        
        // First pass: collect all declarations
        let match;
        while ((match = localPattern.exec(code)) !== null) {
            const varsStr = match[1];
            const vars = varsStr.split(',').map(v => v.trim());
            
            for (const varName of vars) {
                if (varName && this.shouldRename(varName)) {
                    const newName = this.getOrCreateMapping(varName);
                    declarations.push({ old: varName, new: newName });
                }
            }
        }
        
        // Second pass: replace all occurrences
        for (const { old: oldName, new: newName } of declarations) {
            // Replace as whole word only
            const wordPattern = new RegExp(`\\b${this.escapeRegex(oldName)}\\b`, 'g');
            result = result.replace(wordPattern, (match, offset) => {
                // Don't replace inside strings
                if (this.isInsideString(result, offset)) {
                    return match;
                }
                return newName;
            });
        }
        
        return result;
    }
    
    renameFunctionParameters(code) {
        // Match function declarations with parameters
        const funcPattern = /function\s*(?:[a-zA-Z_][a-zA-Z0-9_.:]*\s*)?\(([^)]*)\)/g;
        
        let result = code;
        const params = [];
        
        let match;
        while ((match = funcPattern.exec(code)) !== null) {
            if (match[1].trim()) {
                const paramList = match[1].split(',').map(p => p.trim());
                for (const param of paramList) {
                    // Handle ... (vararg)
                    if (param === '...') continue;
                    
                    if (param && this.shouldRename(param)) {
                        const newName = this.getOrCreateMapping(param);
                        params.push({ old: param, new: newName });
                    }
                }
            }
        }
        
        // Replace all parameter occurrences
        for (const { old: oldName, new: newName } of params) {
            const wordPattern = new RegExp(`\\b${this.escapeRegex(oldName)}\\b`, 'g');
            result = result.replace(wordPattern, (match, offset) => {
                if (this.isInsideString(result, offset)) {
                    return match;
                }
                return newName;
            });
        }
        
        return result;
    }
    
    renameForLoopVariables(code) {
        // Match: for i = 1, 10 or for k, v in pairs(...)
        const forPattern = /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(?:=|in)/g;
        
        let result = code;
        const loopVars = [];
        
        let match;
        while ((match = forPattern.exec(code)) !== null) {
            const vars = match[1].split(',').map(v => v.trim());
            for (const varName of vars) {
                if (varName && this.shouldRename(varName)) {
                    const newName = this.getOrCreateMapping(varName);
                    loopVars.push({ old: varName, new: newName });
                }
            }
        }
        
        for (const { old: oldName, new: newName } of loopVars) {
            const wordPattern = new RegExp(`\\b${this.escapeRegex(oldName)}\\b`, 'g');
            result = result.replace(wordPattern, (match, offset) => {
                if (this.isInsideString(result, offset)) {
                    return match;
                }
                return newName;
            });
        }
        
        return result;
    }
    
    isInsideString(code, offset) {
        // Simple check - count quotes before offset
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < offset && i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            // Handle [[ ]] long strings
            if (char === '[' && code[i + 1] === '[' && !inString) {
                const endBracket = code.indexOf(']]', i + 2);
                if (endBracket !== -1 && endBracket > offset) {
                    return true;
                }
            }
        }
        
        return inString;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

module.exports = VariableRenamer;
