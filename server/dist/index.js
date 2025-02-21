"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const config_1 = __importDefault(require("./config"));
dotenv_1.default.config();
// Add this after your imports and before app initialization
const ytDlpPath = process.env.NODE_ENV === 'production'
    ? '/usr/local/bin/yt-dlp' // Use installed binary in production
    : '/opt/homebrew/bin/yt-dlp';
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Move these to the top, right after imports and before any other code
let server;
process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal. Performing graceful shutdown...');
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    }
    else {
        process.exit(0);
    }
});
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173', // Development
    'https://twitch-batch-downloader.vercel.app', // Production
    process.env.CORS_ORIGIN // From environment
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Add debug logging for CORS
app.use((req, res, next) => {
    console.log('Request details:', {
        origin: req.headers.origin,
        allowedOrigins,
        method: req.method,
        path: req.path
    });
    next();
});
app.use(express_1.default.json());
// Create downloads directory if it doesn't exist
if (!fs_1.default.existsSync(config_1.default.downloadsDir)) {
    fs_1.default.mkdirSync(config_1.default.downloadsDir, { recursive: true });
}
// Log all requests for debugging
app.use((req, res, next) => {
    console.log('Request:', {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        headers: req.headers
    });
    next();
});
// Add these near the top after middleware
app.use((req, res, next) => {
    console.log('Incoming request:', {
        path: req.path,
        method: req.method,
        headers: req.headers
    });
    next();
});
// Add this function near the top of the file
function sanitizeFilename(filename) {
    return filename
        .replace(/[\\/:"*?<>|]+/g, '-') // Replace Windows/Unix invalid chars with dash
        .replace(/\s+/g, ' ') // Normalize spaces (but keep them as spaces)
        .replace(/\.+/g, '.') // Replace multiple dots with single dot
        .trim(); // Remove leading/trailing spaces
}
// Add a helper function to parse yt-dlp progress
function parseProgress(output) {
    // Look for download percentage
    const progressMatch = output.match(/(\d+\.?\d*)%/);
    if (!progressMatch)
        return null;
    const percent = parseFloat(progressMatch[1]);
    // Extract speed and ETA
    const speedMatch = output.match(/(\d+\.?\d*[KMG]iB\/s)/);
    const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
    return {
        type: 'progress',
        percent: Math.round(percent * 10) / 10, // Round to 1 decimal place
        status: percent >= 100 ? 'processing' : 'downloading',
        speed: speedMatch ? speedMatch[1] : undefined,
        eta: etaMatch ? etaMatch[1] : undefined
    };
}
// Update the handler definitions
const downloadHandler = async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const { authorization } = req.headers;
        const { filename } = req.body;
        console.log('Download request:', {
            videoId,
            hasAuth: !!authorization,
            filename,
            body: req.body
        });
        if (!authorization) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }
        if (!filename) {
            res.status(400).json({ error: 'No filename provided' });
            return;
        }
        // Sanitize the filename before storing
        const sanitizedFilename = sanitizeFilename(filename);
        const filenameMapPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.filename`);
        fs_1.default.writeFileSync(filenameMapPath, sanitizedFilename);
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const videoUrl = `https://www.twitch.tv/videos/${videoId}`;
        const outputPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.mp4`);
        console.log('Starting download with config:', {
            ytDlpPath: config_1.default.ytDlpPath,
            videoUrl,
            outputPath,
            nodeEnv: config_1.default.nodeEnv
        });
        console.log('Checking yt-dlp path:', config_1.default.ytDlpPath);
        console.log('yt-dlp exists:', fs_1.default.existsSync(config_1.default.ytDlpPath));
        console.log('yt-dlp stats:', fs_1.default.existsSync(config_1.default.ytDlpPath) ? fs_1.default.statSync(config_1.default.ytDlpPath) : null);
        const ytDlp = (0, child_process_1.spawn)(config_1.default.ytDlpPath, [
            '--no-check-certificates', // Add this to avoid SSL issues
            '--no-cache-dir', // Don't try to use cache
            videoUrl,
            '-o', outputPath,
            '-f', 'best', // Simplify format selection
            '--merge-output-format', 'mp4'
        ]);
        let lastProgress = 0;
        ytDlp.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log('Raw output:', output);
            const progress = parseProgress(output);
            if (progress) {
                console.log('Parsed progress:', progress);
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });
        ytDlp.stderr.on('data', (data) => {
            console.error('Download error:', data.toString());
        });
        // Wait for download to complete
        await new Promise((resolve, reject) => {
            ytDlp.on('close', async (code) => {
                if (code === 0) {
                    try {
                        // Verify file exists and has size
                        const fileStats = fs_1.default.statSync(outputPath);
                        console.log('Download verification:', {
                            videoId,
                            outputPath,
                            exists: fs_1.default.existsSync(outputPath),
                            size: fileStats.size,
                            isFile: fileStats.isFile(),
                            permissions: fileStats.mode,
                            directory: config_1.default.downloadsDir,
                            dirContents: fs_1.default.readdirSync(config_1.default.downloadsDir)
                        });
                        if (!fs_1.default.existsSync(outputPath) || fileStats.size === 0) {
                            reject(new Error('Download completed but file is missing or empty'));
                            return;
                        }
                        // Send completion event
                        const isBatchDownload = req.query.batch === 'true';
                        console.log('Download complete:', {
                            videoId,
                            isBatchDownload,
                            outputPath,
                            exists: fs_1.default.existsSync(outputPath)
                        });
                        res.write(`data: ${JSON.stringify({
                            type: 'complete',
                            percent: 100,
                            downloadUrl: `/api/videos/${videoId}/file${isBatchDownload ? '?batch=true' : ''}`,
                            filename: filename,
                            batchDownload: isBatchDownload
                        })}\n\n`);
                        res.end();
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    reject(new Error(`Download failed with code ${code}`));
                }
            });
            ytDlp.on('error', (error) => {
                console.error('Spawn error:', error);
                console.error('Command details:', {
                    command: config_1.default.ytDlpPath,
                    exists: fs_1.default.existsSync(config_1.default.ytDlpPath),
                    stats: fs_1.default.existsSync(config_1.default.ytDlpPath) ? fs_1.default.statSync(config_1.default.ytDlpPath) : null
                });
            });
        });
    }
    catch (error) {
        console.error('Download handler error:', error);
        next(error);
    }
};
const zipHandler = async (req, res) => {
    try {
        const { files } = req.query;
        console.log('1. Received files query:', files);
        if (!files) {
            res.status(400).json({ error: 'No files specified' });
            return;
        }
        const fileList = typeof files === 'string'
            ? files.split(',').map(f => decodeURIComponent(f))
            : files.map(f => decodeURIComponent(f));
        console.log('2. Decoded file list:', fileList);
        const zipPath = path_1.default.join(config_1.default.downloadsDir, 'videos.zip');
        console.log('3. Zip path:', zipPath);
        // Create list of full file paths and their formatted names
        const filePaths = fileList.map(videoId => {
            const videoPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.mp4`);
            const filenameMapPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.filename`);
            const fileExists = fs_1.default.existsSync(videoPath);
            const mapExists = fs_1.default.existsSync(filenameMapPath);
            console.log('4. File check:', {
                videoId,
                videoPath,
                filenameMapPath,
                fileExists,
                mapExists,
                dirContents: fs_1.default.readdirSync(config_1.default.downloadsDir)
            });
            let formattedName;
            try {
                formattedName = fs_1.default.readFileSync(filenameMapPath, 'utf8').trim();
                if (!formattedName.toLowerCase().endsWith('.mp4')) {
                    formattedName += '.mp4';
                }
            }
            catch (error) {
                console.error('5. Error reading filename map:', error);
                formattedName = `${videoId}.mp4`;
            }
            return {
                path: videoPath,
                name: formattedName
            };
        });
        console.log('6. File paths prepared:', filePaths);
        // Check if all files exist
        const missingFiles = filePaths.filter(file => !fs_1.default.existsSync(file.path));
        if (missingFiles.length > 0) {
            console.error('7. Missing files:', missingFiles);
            res.status(404).json({
                error: 'Some files are missing',
                missing: missingFiles.map(f => f.name),
                downloadsDir: config_1.default.downloadsDir,
                dirContents: fs_1.default.readdirSync(config_1.default.downloadsDir)
            });
            return;
        }
        console.log('Pre-zip file check:', {
            files: filePaths.map(file => ({
                path: file.path,
                name: file.name,
                exists: fs_1.default.existsSync(file.path),
                size: fs_1.default.existsSync(file.path) ? fs_1.default.statSync(file.path).size : 0
            })),
            downloadsDir: {
                path: config_1.default.downloadsDir,
                contents: fs_1.default.readdirSync(config_1.default.downloadsDir)
            }
        });
        console.log('8. Creating zip file...');
        await createZipFile(filePaths, zipPath);
        console.log('9. Zip file created');
        // Send the zip file
        res.download(zipPath, 'twitch-videos.zip', (err) => {
            if (err) {
                console.error('Error sending zip:', err);
                return;
            }
            // Clean up only after successful download
            setTimeout(() => {
                fs_1.default.unlink(zipPath, () => {
                    filePaths.forEach(file => {
                        fs_1.default.unlink(file.path, () => { });
                        fs_1.default.unlink(file.path.replace('.mp4', '.filename'), () => { });
                    });
                });
            }, 1000); // Give a small delay to ensure download is complete
        });
    }
    catch (error) {
        console.error('Error in zip handler:', error);
        res.status(500).json({
            error: 'Failed to create zip file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
const fileHandler = (req, res) => {
    const { videoId } = req.params;
    const { batch } = req.query;
    const outputPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.mp4`);
    const filenameMapPath = path_1.default.join(config_1.default.downloadsDir, `${videoId}.filename`);
    try {
        let downloadName = `${videoId}.mp4`;
        if (fs_1.default.existsSync(filenameMapPath)) {
            downloadName = `${fs_1.default.readFileSync(filenameMapPath, 'utf8').trim()}.mp4`;
        }
        console.log('File handler request:', {
            videoId,
            batch,
            outputPath,
            downloadName,
            exists: fs_1.default.existsSync(outputPath)
        });
        if (!fs_1.default.existsSync(outputPath)) {
            console.error('File not found:', outputPath);
            res.status(404).json({ error: 'File not found' });
            return;
        }
        // For batch downloads, just send the file without deleting
        if (batch === 'true') {
            res.download(outputPath, downloadName);
            return;
        }
        // For single downloads, delete after successful download
        res.download(outputPath, downloadName, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return;
            }
            fs_1.default.unlink(outputPath, (unlinkErr) => {
                if (unlinkErr)
                    console.error('Error deleting file:', unlinkErr);
            });
        });
    }
    catch (error) {
        console.error('Error in file handler:', error);
        res.status(500).json({ error: 'Failed to send file' });
    }
};
// First, specific routes
app.get('/api/health', async (req, res) => {
    try {
        const ytDlp = (0, child_process_1.spawn)(ytDlpPath, ['--version']);
        let version = '';
        ytDlp.stdout.on('data', (data) => {
            version += data.toString();
        });
        await new Promise((resolve) => ytDlp.on('close', resolve));
        res.json({
            status: 'ok',
            ytdlp: {
                path: ytDlpPath,
                version: version.trim(),
            },
            downloadsDir: {
                path: config_1.default.downloadsDir,
                exists: fs_1.default.existsSync(config_1.default.downloadsDir),
                writable: fs_1.default.accessSync(config_1.default.downloadsDir, fs_1.default.constants.W_OK)
            }
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            ytDlpPath
        });
    }
});
app.post('/api/videos/:videoId/download', downloadHandler);
app.get('/api/videos/download-zip', zipHandler);
app.get('/api/videos/:videoId/file', fileHandler);
// Last, catch-all route
app.get('*', (req, res) => {
    res.json({
        message: 'Server is running',
        path: req.path,
        method: req.method,
        env: process.env.NODE_ENV,
        port: port
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
// Move the server initialization to the very end of the file
server = app.listen(Number(port), '0.0.0.0', () => {
    console.log('Starting server with config:', {
        port: port,
        nodeEnv: config_1.default.nodeEnv,
        downloadsDir: config_1.default.downloadsDir,
        host: '0.0.0.0',
        ytDlpPath: config_1.default.ytDlpPath,
        corsOrigin: config_1.default.corsOrigin
    });
    console.log(`Server running at http://0.0.0.0:${port}`);
});
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
});
// Add a helper function to create zip files
async function createZipFile(files, zipPath) {
    // First verify all files exist and are readable
    const fileChecks = files.map(file => {
        try {
            const stats = fs_1.default.statSync(file.path);
            return {
                path: file.path,
                name: file.name,
                exists: true,
                size: stats.size,
                isFile: stats.isFile(),
                readable: fs_1.default.accessSync(file.path, fs_1.default.constants.R_OK)
            };
        }
        catch (error) {
            return {
                path: file.path,
                name: file.name,
                exists: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });
    console.log('Zip file preparation:', {
        files: fileChecks,
        zipPath,
        directory: config_1.default.downloadsDir,
        dirContents: fs_1.default.readdirSync(config_1.default.downloadsDir)
    });
    const missingFiles = fileChecks.filter(f => !f.exists);
    if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${JSON.stringify(missingFiles)}`);
    }
    return new Promise((resolve, reject) => {
        console.log('Creating zip file:', {
            zipPath,
            files: files.map(f => ({
                path: f.path,
                name: f.name,
                exists: fs_1.default.existsSync(f.path),
                size: fs_1.default.existsSync(f.path) ? fs_1.default.statSync(f.path).size : 0
            }))
        });
        const output = fs_1.default.createWriteStream(zipPath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 5 }
        });
        output.on('close', () => {
            console.log(`Zip file created: ${archive.pointer()} bytes`);
            resolve();
        });
        output.on('error', (err) => {
            console.error('Output stream error:', err);
            reject(err);
        });
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            reject(err);
        });
        archive.on('warning', (err) => {
            console.warn('Archive warning:', err);
        });
        archive.pipe(output);
        // Add each file to the zip with its formatted name
        files.forEach(file => {
            try {
                console.log(`Adding file to archive: ${file.path} as ${file.name}`);
                archive.file(file.path, { name: file.name });
            }
            catch (error) {
                console.error(`Error adding file to archive: ${file.path}`, error);
            }
        });
        try {
            archive.finalize();
        }
        catch (error) {
            console.error('Error finalizing archive:', error);
            reject(error);
        }
    });
}
