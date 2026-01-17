/**
 * Comment Removal Transform
 * Removes single-line and multi-line comments from Lua code
 */

class CommentRemover {
    constructor(options = {}) {
        this.options = {
            removeSingleLine: true,
            removeMultiLine: true,
            ...options
        };
        this.stats = {
            singleLineRemoved: 0,
            multiLineRemoved: 0
        };
    }
    
    transform(code) {
        let result = code;
        
        // Remove multi-line comments first --[[ ... ]]
        if (this.options.removeMultiLine) {
            result = this.removeMultiLineComments(result);
        }
        
        // Remove single-line comments -- ...
        if (this.options.removeSingleLine) {
            result = this.removeSingleLineComments(result);
        }
        
        return {
            code: result,
            stats: {
                singleLineRemoved: this.stats.singleLineRemoved,
                multiLineRemoved: this.stats.multiLineRemoved,
                totalRemoved: this.stats.singleLineRemoved + this.stats.multiLineRemoved
            }
        };
    }
    
    removeMultiLineComments(code) {
        // Match --[[ ... ]] and --[=[ ... ]=] variants
        const pattern = /--\[(=*)\[[\s\S]*?\]\1\]/g;
        let match;
        
        while ((match = pattern.exec(code)) !== null) {
            this.stats.multiLineRemoved++;
        }
        
        return code.replace(pattern, '');
    }
    
    removeSingleLineComments(code) {
        const lines = code.split('\n');
        const result = [];
        
        for (let line of lines) {
            // Handle strings to avoid removing -- inside strings
            let inString = false;
            let stringChar = '';
            let commentStart = -1;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';
                
                // Check for string boundaries
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                // Check for long string [[ ]]
                if (char === '[' && line[i + 1] === '[' && !inString) {
                    const endBracket = line.indexOf(']]', i + 2);
                    if (endBracket !== -1) {
                        i = endBracket + 1;
                        continue;
                    }
                }
                
                // Check for comment start
                if (char === '-' && line[i + 1] === '-' && !inString) {
                    // Make sure it's not --[[ (multi-line)
                    if (line[i + 2] !== '[') {
                        commentStart = i;
                        break;
                    }
                }
            }
            
            if (commentStart !== -1) {
                this.stats.singleLineRemoved++;
                line = line.substring(0, commentStart).trimEnd();
            }
            
            result.push(line);
        }
        
        return result.join('\n');
    }
}

module.exports = CommentRemover;
