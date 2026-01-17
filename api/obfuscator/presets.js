/**
 * Obfuscation Presets Configuration
 * Phase 1: Variable Renaming, String Encoding, Comment Removal, Whitespace Minify
 */

const PRESETS = {
    // Maximum Performance - Minimal obfuscation
    performance: {
        name: 'Performance',
        description: 'Minimal obfuscation, maximum speed. Best for large scripts.',
        icon: '⚡',
        options: {
            // Variable Renaming
            variableRenaming: {
                enabled: true,
                style: 'short',        // 'short' | 'hex' | 'underscore' | 'mixed'
                preserveGlobals: true,
                preserveRobloxAPI: true
            },
            // String Encoding
            stringEncoding: {
                enabled: false,
                method: 'none'
            },
            // Comment Removal
            commentRemoval: {
                enabled: true,
                removeSingleLine: true,
                removeMultiLine: true
            },
            // Whitespace
            whitespace: {
                enabled: true,
                minify: true,
                preserveNewlines: false
            }
        }
    },
    
    // Balanced - Good security with acceptable performance
    balanced: {
        name: 'Balanced',
        description: 'Good security and performance balance. Recommended for most scripts.',
        icon: '⚖️',
        options: {
            variableRenaming: {
                enabled: true,
                style: 'hex',
                preserveGlobals: true,
                preserveRobloxAPI: true
            },
            stringEncoding: {
                enabled: true,
                method: 'base64',      // 'base64' | 'hex' | 'charcode' | 'xor'
                encodeAll: false,      // Only encode suspicious strings
                minLength: 3
            },
            commentRemoval: {
                enabled: true,
                removeSingleLine: true,
                removeMultiLine: true
            },
            whitespace: {
                enabled: true,
                minify: true,
                preserveNewlines: false
            }
        }
    },
    
    // Maximum Security - Full obfuscation
    maxSecurity: {
        name: 'Max Security',
        description: 'Maximum protection. May impact performance on large scripts.',
        icon: '🔒',
        options: {
            variableRenaming: {
                enabled: true,
                style: 'mixed',
                preserveGlobals: true,
                preserveRobloxAPI: true,
                addDecoys: true
            },
            stringEncoding: {
                enabled: true,
                method: 'xor',
                encodeAll: true,
                minLength: 1,
                addWrapper: true
            },
            commentRemoval: {
                enabled: true,
                removeSingleLine: true,
                removeMultiLine: true,
                addFakeComments: false
            },
            whitespace: {
                enabled: true,
                minify: true,
                preserveNewlines: false,
                singleLine: true
            }
        }
    },
    
    // Manual - Custom configuration (default to balanced)
    manual: {
        name: 'Manual',
        description: 'Custom configuration. Choose your own settings.',
        icon: '🔧',
        options: {
            variableRenaming: {
                enabled: true,
                style: 'hex',
                preserveGlobals: true,
                preserveRobloxAPI: true
            },
            stringEncoding: {
                enabled: true,
                method: 'base64',
                encodeAll: false,
                minLength: 3
            },
            commentRemoval: {
                enabled: true,
                removeSingleLine: true,
                removeMultiLine: true
            },
            whitespace: {
                enabled: true,
                minify: true,
                preserveNewlines: false
            }
        }
    }
};

// Roblox globals that should NEVER be renamed
const ROBLOX_GLOBALS = [
    // Core
    'game', 'workspace', 'script', 'plugin',
    // Services
    'Enum', 'Instance', 'Vector3', 'Vector2', 'CFrame', 'Color3', 'BrickColor',
    'UDim', 'UDim2', 'Ray', 'Region3', 'Rect', 'TweenInfo', 'NumberRange',
    'NumberSequence', 'ColorSequence', 'PhysicalProperties', 'Axes', 'Faces',
    // Global functions
    'typeof', 'require', 'spawn', 'delay', 'wait', 'tick', 'time', 'elapsedTime',
    'settings', 'UserSettings', 'version', 'printidentity',
    // Executor globals
    'getgenv', 'getrenv', 'getfenv', 'setfenv', 'getrawmetatable', 'setrawmetatable',
    'hookfunction', 'hookmetamethod', 'newcclosure', 'islclosure', 'iscclosure',
    'loadstring', 'checkcaller', 'getcallingscript', 'KRNL_LOADED', 'syn', 'fluxus',
    'getexecutorname', 'identifyexecutor', 'is_sirhurt_closure', 'Drawing', 'cleardrawcache',
    'isreadonly', 'setreadonly', 'make_writeable', 'firesignal', 'getconnections',
    'fireproximityprompt', 'gethui', 'gethiddenproperty', 'sethiddenproperty',
    'setsimulationradius', 'getcustomasset', 'getsynasset', 'isnetworkowner',
    'fireclickdetector', 'firetouchinterest', 'isrbxactive', 'keypress', 'keyrelease',
    'mouse1click', 'mouse1press', 'mouse1release', 'mouse2click', 'mouse2press', 'mouse2release',
    'mousemoveabs', 'mousemoverel', 'mousescroll', 'request', 'http_request', 'HttpGet',
    'readfile', 'writefile', 'appendfile', 'loadfile', 'isfile', 'isfolder', 'makefolder',
    'delfolder', 'delfile', 'listfiles', 'getscriptbytecode', 'getscripthash',
    'rconsoleprint', 'rconsolename', 'rconsoleclear', 'rconsoleinput', 'printconsole',
    // Lua globals
    '_G', '_VERSION', 'assert', 'collectgarbage', 'coroutine', 'debug', 'dofile',
    'error', 'gcinfo', 'getmetatable', 'ipairs', 'load', 'loadfile',
    'newproxy', 'next', 'os', 'pairs', 'pcall', 'print', 'rawequal', 'rawget',
    'rawlen', 'rawset', 'select', 'setmetatable', 'string', 'table', 'tonumber',
    'tostring', 'type', 'unpack', 'xpcall', 'math', 'bit32', 'utf8', 'task',
    // Common patterns
    'self', 'nil', 'true', 'false'
];

// Lua keywords that cannot be used as identifiers
const LUA_KEYWORDS = [
    'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
    'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
    'then', 'true', 'until', 'while', 'continue'
];

module.exports = {
    PRESETS,
    ROBLOX_GLOBALS,
    LUA_KEYWORDS
};
