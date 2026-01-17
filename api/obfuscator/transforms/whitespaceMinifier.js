/**
 * Whitespace Minification Transform
 * Removes unnecessary whitespace and formats code
 */

class WhitespaceMinifier {
    constructor(options = {}) {
        this.options = {
            minify: true,
            preserveNewlines: false,
            singleLine: false,
            ...options
        };
        
        this.stats = {
            originalLength: 0,
            minifiedLength: 0
        };
    }
    
    transform(code) {
        this.stats.originalLength = code.length;
        
        let result = code;
        
        if (this.options.minify) {
            result = this.minifyWhitespace(result);
        }
        
        if (this.options.singleLine) {
            result = this.toSingleLine(result);
        }
        
        this.stats.minifiedLength = result.length;
        
        return {
            code: result,
            stats: {
                originalLength: this.stats.originalLength,
                minifiedLength: this.stats.minifiedLength,
                reduction: ((1 - this.stats.minifiedLength / this.stats.originalLength) * 100).toFixed(1) + '%'
            }
        };
    }
    
    minifyWhitespace(code) {
        const lines = code.split('\n');
        const result = [];
        
        for (let line of lines) {
            // Preserve content inside strings
            line = this.processLine(line);
            
            // Skip empty lines
            if (line.trim() === '') {
                if (this.options.preserveNewlines) {
                    result.push('');
                }
                continue;
            }
            
            result.push(line);
        }
        
        return result.join('\n');
    }
    
    processLine(line) {
        const parts = [];
        let i = 0;
        let inString = false;
        let stringChar = '';
        let currentPart = '';
        
        while (i < line.length) {
            const char = line[i];
            const prevChar = i > 0 ? line[i - 1] : '';
            
            // Handle string boundaries
            if ((char === '"' || char === "'") && prevChar !== '\\' && !inString) {
                // Flush current part with whitespace processing
                if (currentPart) {
                    parts.push(this.processNonStringPart(currentPart));
                    currentPart = '';
                }
                
                // Start string
                inString = true;
                stringChar = char;
                currentPart = char;
                i++;
                
                // Collect string content
                while (i < line.length) {
                    if (line[i] === '\\' && i + 1 < line.length) {
                        currentPart += line[i] + line[i + 1];
                        i += 2;
                    } else if (line[i] === stringChar) {
                        currentPart += line[i];
                        i++;
                        break;
                    } else {
                        currentPart += line[i];
                        i++;
                    }
                }
                
                parts.push(currentPart);
                currentPart = '';
                inString = false;
            }
            // Handle [[ ]] long strings
            else if (char === '[' && line[i + 1] === '[' && !inString) {
                if (currentPart) {
                    parts.push(this.processNonStringPart(currentPart));
                    currentPart = '';
                }
                
                currentPart = '[[';
                i += 2;
                
                while (i < line.length - 1) {
                    if (line[i] === ']' && line[i + 1] === ']') {
                        currentPart += ']]';
                        i += 2;
                        break;
                    }
                    currentPart += line[i];
                    i++;
                }
                
                parts.push(currentPart);
                currentPart = '';
            }
            else {
                currentPart += char;
                i++;
            }
        }
        
        // Process remaining non-string part
        if (currentPart) {
            parts.push(this.processNonStringPart(currentPart));
        }
        
        return parts.join('');
    }
    
    processNonStringPart(part) {
        // Remove leading/trailing whitespace
        part = part.trim();
        
        // Collapse multiple spaces to single space
        part = part.replace(/\s+/g, ' ');
        
        // Remove spaces around operators (careful with keywords)
        const operators = ['=', '+', '-', '*', '/', '%', '^', '#', '<', '>', '~', ',', ';', '(', ')', '[', ']', '{', '}', '.', ':'];
        
        for (const op of operators) {
            // Be careful with == ~= <= >= .. and similar
            if (op === '=') {
                // Don't remove space before = if preceded by = ~ < >
                part = part.replace(/([^=~<>])\s*=\s*/g, '$1= ');
                part = part.replace(/\s*=\s*([^=])/g, ' =$1');
            } else if (op === '-') {
                // Careful: might be negative number or subtraction
                // Keep space if after identifier/number
            } else if (op === '.') {
                // Careful: .. is concatenation, . is member access
                // Don't collapse spaces around ..
            } else {
                part = part.replace(new RegExp(`\\s*\\${op}\\s*`, 'g'), op);
            }
        }
        
        // Ensure space after keywords
        const keywords = ['local', 'function', 'if', 'then', 'else', 'elseif', 'end', 'for', 'while', 'do', 'repeat', 'until', 'return', 'and', 'or', 'not', 'in'];
        
        for (const kw of keywords) {
            const pattern = new RegExp(`\\b${kw}\\b(?!\\s)`, 'g');
            part = part.replace(pattern, `${kw} `);
        }
        
        return part;
    }
    
    toSingleLine(code) {
        // Remove all newlines, collapse to single line
        let result = code.replace(/\n\s*/g, ' ');
        result = result.replace(/\s+/g, ' ');
        return result.trim();
    }
}

module.exports = WhitespaceMinifier;
