/**
 * String Encoding Transform
 * Encodes string literals to make them unreadable
 */

class StringEncoder {
    constructor(options = {}) {
        this.options = {
            method: 'base64',      // 'base64' | 'hex' | 'charcode' | 'xor'
            encodeAll: false,
            minLength: 3,
            addWrapper: false,
            xorKey: 42,
            ...options
        };
        
        this.stats = {
            stringsEncoded: 0,
            stringsSkipped: 0
        };
        
        this.decoderAdded = false;
    }
    
    transform(code) {
        this.stats = { stringsEncoded: 0, stringsSkipped: 0 };
        this.decoderAdded = false;
        
        let result = code;
        
        // Add decoder function at the beginning
        const decoder = this.getDecoderFunction();
        
        // Find and encode strings
        result = this.encodeStrings(result);
        
        // Add decoder if any strings were encoded
        if (this.stats.stringsEncoded > 0) {
            result = decoder + '\n' + result;
        }
        
        return {
            code: result,
            stats: {
                stringsEncoded: this.stats.stringsEncoded,
                stringsSkipped: this.stats.stringsSkipped,
                method: this.options.method
            }
        };
    }
    
    getDecoderFunction() {
        switch (this.options.method) {
            case 'base64':
                return `local function _decode(_s) local _b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/' _s=_s:gsub('[^'..(_b)..'=]','') return (_s:gsub('.',function(_x) if(_x=='=')then return'' end local _r,_f='',((_b):find(_x)-1) for _i=6,1,-1 do _r=_r..(_f%2^_i-_f%2^(_i-1)>0 and'1'or'0') end return _r end):gsub('%d%d%d?%d?%d?%d?%d?%d?',function(_x) if(#_x~=8)then return'' end local _c=0 for _i=1,8 do _c=_c+(_x:sub(_i,_i)=='1'and 2^(8-_i)or 0) end return string.char(_c) end)) end`;
            
            case 'hex':
                return `local function _decode(_s) return (_s:gsub('..', function(_h) return string.char(tonumber(_h, 16)) end)) end`;
            
            case 'charcode':
                return `local function _decode(...) local _t = {...} local _r = '' for _i = 1, #_t do _r = _r .. string.char(_t[_i]) end return _r end`;
            
            case 'xor':
                return `local function _decode(_s, _k) _k = _k or ${this.options.xorKey} local _r = '' for _i = 1, #_s do _r = _r .. string.char(bit32.bxor(string.byte(_s, _i), _k)) end return _r end`;
            
            default:
                return '';
        }
    }
    
    encodeStrings(code) {
        const result = [];
        let i = 0;
        
        while (i < code.length) {
            // Check for string start
            if (code[i] === '"' || code[i] === "'") {
                const quote = code[i];
                const start = i;
                i++;
                
                // Find end of string
                let content = '';
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) {
                        content += code[i] + code[i + 1];
                        i += 2;
                    } else if (code[i] === quote) {
                        break;
                    } else {
                        content += code[i];
                        i++;
                    }
                }
                
                // Include closing quote
                if (i < code.length) i++;
                
                // Decide whether to encode
                const originalString = code.substring(start, i);
                
                // Unescape content for encoding
                const unescaped = this.unescapeString(content);
                
                if (this.shouldEncode(unescaped)) {
                    const encoded = this.encodeString(unescaped);
                    result.push(encoded);
                    this.stats.stringsEncoded++;
                } else {
                    result.push(originalString);
                    this.stats.stringsSkipped++;
                }
            }
            // Check for long strings [[ ]]
            else if (code[i] === '[' && code[i + 1] === '[') {
                const start = i;
                i += 2;
                
                let content = '';
                while (i < code.length - 1) {
                    if (code[i] === ']' && code[i + 1] === ']') {
                        break;
                    }
                    content += code[i];
                    i++;
                }
                i += 2;
                
                if (this.shouldEncode(content)) {
                    const encoded = this.encodeString(content);
                    result.push(encoded);
                    this.stats.stringsEncoded++;
                } else {
                    result.push(code.substring(start, i));
                    this.stats.stringsSkipped++;
                }
            }
            else {
                result.push(code[i]);
                i++;
            }
        }
        
        return result.join('');
    }
    
    shouldEncode(str) {
        // Skip if too short
        if (str.length < this.options.minLength) {
            return false;
        }
        
        // If encodeAll is true, encode everything
        if (this.options.encodeAll) {
            return true;
        }
        
        // Otherwise, only encode strings that look "important"
        // URLs, paths, names, etc.
        const patterns = [
            /https?:\/\//i,           // URLs
            /\w+:\w+/,                // Service patterns
            /[A-Z][a-z]+[A-Z]/,       // CamelCase
            /password|secret|key|token/i,  // Sensitive words
            /\.(lua|txt|json|xml)/i   // File extensions
        ];
        
        return patterns.some(pattern => pattern.test(str));
    }
    
    encodeString(str) {
        switch (this.options.method) {
            case 'base64':
                return `_decode("${this.toBase64(str)}")`;
            
            case 'hex':
                return `_decode("${this.toHex(str)}")`;
            
            case 'charcode':
                return `_decode(${this.toCharCodes(str)})`;
            
            case 'xor':
                return `_decode("${this.toXor(str)}", ${this.options.xorKey})`;
            
            default:
                return `"${str}"`;
        }
    }
    
    toBase64(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        const bytes = Buffer.from(str, 'utf-8');
        
        for (let i = 0; i < bytes.length; i += 3) {
            const b1 = bytes[i];
            const b2 = bytes[i + 1] || 0;
            const b3 = bytes[i + 2] || 0;
            
            result += chars[b1 >> 2];
            result += chars[((b1 & 3) << 4) | (b2 >> 4)];
            result += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
            result += i + 2 < bytes.length ? chars[b3 & 63] : '=';
        }
        
        return result;
    }
    
    toHex(str) {
        return Buffer.from(str, 'utf-8')
            .toString('hex');
    }
    
    toCharCodes(str) {
        const codes = [];
        for (let i = 0; i < str.length; i++) {
            codes.push(str.charCodeAt(i));
        }
        return codes.join(', ');
    }
    
    toXor(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const xored = str.charCodeAt(i) ^ this.options.xorKey;
            result += String.fromCharCode(xored);
        }
        // Escape for Lua string
        return this.escapeLuaString(result);
    }
    
    escapeLuaString(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code < 32 || code > 126 || code === 34 || code === 92) {
                result += '\\' + code.toString().padStart(3, '0');
            } else {
                result += str[i];
            }
        }
        return result;
    }
    
    unescapeString(str) {
        // Handle Lua escape sequences
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')
            .replace(/\\(\d{1,3})/g, (match, code) => String.fromCharCode(parseInt(code)));
    }
}

module.exports = StringEncoder;
