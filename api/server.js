const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Obfuscator = require('./obfuscator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer untuk file upload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.lua') || file.originalname.endsWith('.luau')) {
            cb(null, true);
        } else {
            cb(new Error('Only .lua and .luau files are allowed'));
        }
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        name: 'LuaGuard Obfuscator API',
        version: '1.0.0',
        phase: 1,
        endpoints: {
            obfuscate: 'POST /api/obfuscate',
            presets: 'GET /api/presets'
        }
    });
});

// Get available presets
app.get('/api/presets', (req, res) => {
    const presets = require('./obfuscator/presets');
    res.json({
        success: true,
        presets: Object.keys(presets.PRESETS).map(key => ({
            id: key,
            name: presets.PRESETS[key].name,
            description: presets.PRESETS[key].description
        }))
    });
});

// Main obfuscate endpoint
app.post('/api/obfuscate', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    const jobId = uuidv4().slice(0, 8).toUpperCase();
    
    try {
        let sourceCode;
        let fileName = 'script.lua';
        
        // Get source code from file or body
        if (req.file) {
            sourceCode = req.file.buffer.toString('utf-8');
            fileName = req.file.originalname;
        } else if (req.body.code) {
            sourceCode = req.body.code;
            fileName = req.body.fileName || 'script.lua';
        } else {
            return res.status(400).json({
                success: false,
                error: 'No source code provided. Send file or code in body.'
            });
        }
        
        // Get options
        const preset = req.body.preset || 'balanced';
        const customOptions = req.body.options ? JSON.parse(req.body.options) : null;
        
        // Create obfuscator instance
        const obfuscator = new Obfuscator(preset, customOptions);
        
        // Run obfuscation
        const result = obfuscator.obfuscate(sourceCode);
        
        const endTime = Date.now();
        const processTime = ((endTime - startTime) / 1000).toFixed(2);
        
        res.json({
            success: true,
            jobId,
            fileName,
            preset: obfuscator.getPresetInfo(),
            stats: {
                originalSize: sourceCode.length,
                obfuscatedSize: result.code.length,
                compressionRatio: ((result.code.length / sourceCode.length) * 100).toFixed(1) + '%',
                processTime: processTime + 's',
                transformsApplied: result.transforms
            },
            code: result.code,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Obfuscation error:', error);
        res.status(500).json({
            success: false,
            jobId,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

app.listen(PORT, () => {
    console.log(`🛡️ LuaGuard API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/`);
});
