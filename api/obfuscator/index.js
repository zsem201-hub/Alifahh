/**
 * LuaGuard Obfuscator - Main Entry Point
 * Phase 1 Implementation
 */

const { PRESETS, ROBLOX_GLOBALS, LUA_KEYWORDS } = require('./presets');
const VariableRenamer = require('./transforms/variableRenamer');
const StringEncoder = require('./transforms/stringEncoder');
const CommentRemover = require('./transforms/commentRemover');
const WhitespaceMinifier = require('./transforms/whitespaceMinifier');

class Obfuscator {
    constructor(preset = 'balanced', customOptions = null) {
        this.presetName = preset;
        this.preset = PRESETS[preset] || PRESETS.balanced;
        
        // Merge custom options if provided
        if (customOptions && preset === 'manual') {
            this.options = this.mergeOptions(this.preset.options, customOptions);
        } else {
            this.options = { ...this.preset.options };
        }
        
        // Initialize transforms
        this.transforms = [];
        this.transformResults = [];
    }
    
    mergeOptions(base, custom) {
        const result = JSON.parse(JSON.stringify(base));
        for (const key in custom) {
            if (typeof custom[key] === 'object' && !Array.isArray(custom[key])) {
                result[key] = { ...result[key], ...custom[key] };
            } else {
                result[key] = custom[key];
            }
        }
        return result;
    }
    
    getPresetInfo() {
        return {
            id: this.presetName,
            name: this.preset.name,
            icon: this.preset.icon,
            description: this.preset.description,
            options: this.options
        };
    }
    
    obfuscate(sourceCode) {
        let code = sourceCode;
        this.transformResults = [];
        
        // Step 1: Remove comments first (preserves structure for parsing)
        if (this.options.commentRemoval?.enabled) {
            const commentRemover = new CommentRemover(this.options.commentRemoval);
            const result = commentRemover.transform(code);
            code = result.code;
            this.transformResults.push({
                name: 'Comment Removal',
                icon: '🧹',
                details: result.stats
            });
        }
        
        // Step 2: Variable renaming
        if (this.options.variableRenaming?.enabled) {
            const renamer = new VariableRenamer(this.options.variableRenaming);
            const result = renamer.transform(code);
            code = result.code;
            this.transformResults.push({
                name: 'Variable Renaming',
                icon: '🔤',
                details: result.stats
            });
        }
        
        // Step 3: String encoding
        if (this.options.stringEncoding?.enabled) {
            const encoder = new StringEncoder(this.options.stringEncoding);
            const result = encoder.transform(code);
            code = result.code;
            this.transformResults.push({
                name: 'String Encoding',
                icon: '🔐',
                details: result.stats
            });
        }
        
        // Step 4: Whitespace minification (last step)
        if (this.options.whitespace?.enabled) {
            const minifier = new WhitespaceMinifier(this.options.whitespace);
            const result = minifier.transform(code);
            code = result.code;
            this.transformResults.push({
                name: 'Whitespace Minify',
                icon: '📦',
                details: result.stats
            });
        }
        
        // Add header comment
        code = this.addHeader(code);
        
        return {
            code,
            transforms: this.transformResults
        };
    }
    
    addHeader(code) {
        const header = `--[[ 
    Protected by LuaGuard Obfuscator v1.0.0
    Preset: ${this.preset.name} ${this.preset.icon}
    Generated: ${new Date().toISOString()}
    https://github.com/yourusername/luaguard
--]]

`;
        return header + code;
    }
}

module.exports = Obfuscator;
