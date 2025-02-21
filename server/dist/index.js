"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const router = (0, express_1.Router)();
const port = process.env.PORT || 3001;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express_1.default.json());
// Create downloads directory if it doesn't exist
const downloadsDir = path_1.default.join(__dirname, '../downloads');
if (!fs_1.default.existsSync(downloadsDir)) {
    fs_1.default.mkdirSync(downloadsDir, { recursive: true });
}
// Log all requests
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
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
// Add this check for yt-dlp path
const ytDlpPath = process.env.NODE_ENV === 'production'
    ? 'yt-dlp' // Use globally installed yt-dlp in production
    : '/opt/homebrew/bin/yt-dlp'; // Local path for development
// Update the handler definitions
const downloadHandler = async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const { authorization, 'x-batch-download': isBatchDownload } = req.headers;
        const { filename } = req.body;
        if (!authorization) {
            res.status(401).json({ error: 'No authorization token provided' });
            return;
        }
        // Sanitize the filename before storing
        const sanitizedFilename = sanitizeFilename(filename) + '.mp4';
        const filenameMapPath = path_1.default.join(downloadsDir, `${videoId}.filename`);
        fs_1.default.writeFileSync(filenameMapPath, sanitizedFilename);
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const videoUrl = `https://www.twitch.tv/videos/${videoId}`;
        const outputPath = path_1.default.join(downloadsDir, `${videoId}.mp4`);
        const ytDlp = (0, child_process_1.spawn)(ytDlpPath, [
            videoUrl,
            '-o', outputPath,
            '-f', 'bestvideo+bestaudio/best',
            '--merge-output-format', 'mp4',
            '--newline',
            '--no-warnings',
            '--no-colors',
            '--progress',
            '--progress-template', '[download] %(progress._percent_str)s %(progress._downloaded_bytes_str)s at %(progress._speed_str)s ETA %(progress._eta_str)s'
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
                        // Send completion event
                        res.write(`data: ${JSON.stringify({
                            type: 'complete',
                            percent: 100,
                            downloadUrl: `/api/videos/${videoId}/file`,
                            batchDownload: isBatchDownload === 'true',
                            filename: filename
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
            ytDlp.on('error', reject);
        });
    }
    catch (error) {
        next(error);
    }
};
const zipHandler = async (req, res) => {
    try {
        const { files } = req.query;
        console.log('Received files query:', files);
        if (!files) {
            res.status(400).json({ error: 'No files specified' });
            return;
        }
        const fileList = typeof files === 'string'
            ? files.split(',').map(f => decodeURIComponent(f))
            : files.map(f => decodeURIComponent(f));
        console.log('Decoded file list:', fileList);
        const zipPath = path_1.default.join(downloadsDir, 'videos.zip');
        // Create list of full file paths and their formatted names
        const filePaths = fileList.map(videoId => {
            const videoPath = path_1.default.join(downloadsDir, `${videoId}.mp4`);
            const filenameMapPath = path_1.default.join(downloadsDir, `${videoId}.filename`);
            let formattedName;
            try {
                formattedName = fs_1.default.readFileSync(filenameMapPath, 'utf8').trim();
                // Ensure the filename ends with .mp4
                if (!formattedName.toLowerCase().endsWith('.mp4')) {
                    formattedName += '.mp4';
                }
            }
            catch (error) {
                // Fallback to video ID if formatted name not found
                formattedName = `${videoId}.mp4`;
            }
            return {
                path: videoPath,
                name: formattedName
            };
        });
        // Check if all files exist
        for (const file of filePaths) {
            if (!fs_1.default.existsSync(file.path)) {
                res.status(404).json({ error: `File not found: ${file.name}` });
                return;
            }
        }
        // Create zip file with formatted names
        await createZipFile(filePaths, zipPath);
        // Send the zip file
        res.download(zipPath, 'twitch-videos.zip', (err) => {
            if (err) {
                console.error('Error sending zip file:', err);
            }
            // Clean up files after sending
            fs_1.default.unlink(zipPath, (unlinkErr) => {
                if (unlinkErr)
                    console.error('Error deleting zip file:', unlinkErr);
            });
            filePaths.forEach(file => {
                fs_1.default.unlink(file.path, (unlinkErr) => {
                    if (unlinkErr)
                        console.error('Error deleting file:', unlinkErr);
                });
                // Also delete the filename map file
                fs_1.default.unlink(file.path.replace('.mp4', '.filename'), (unlinkErr) => {
                    if (unlinkErr)
                        console.error('Error deleting filename map:', unlinkErr);
                });
            });
        });
    }
    catch (error) {
        console.error('Error in zip handler:', error);
        res.status(500).json({ error: 'Failed to create zip file' });
    }
};
const fileHandler = (req, res) => {
    const { videoId } = req.params;
    const outputPath = path_1.default.join(downloadsDir, `${videoId}.mp4`);
    res.download(outputPath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
        }
        // Clean up the file after sending
        fs_1.default.unlink(outputPath, (unlinkErr) => {
            if (unlinkErr)
                console.error('Error deleting file:', unlinkErr);
        });
    });
};
// Register routes
router.post('/api/videos/:videoId/download', downloadHandler);
router.get('/api/videos/download-zip', zipHandler);
router.get('/api/videos/:videoId/file', fileHandler);
// Use the router
app.use(router);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Downloads directory: ${downloadsDir}`);
});
// Add a helper function to create zip files
async function createZipFile(files, zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs_1.default.createWriteStream(zipPath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 5 }
        });
        output.on('close', () => {
            console.log(`Zip file created: ${archive.pointer()} bytes`);
            resolve();
        });
        archive.on('error', (err) => {
            reject(err);
        });
        archive.pipe(output);
        // Add each file to the zip with its formatted name
        files.forEach(file => {
            archive.file(file.path, { name: file.name });
        });
        archive.finalize();
    });
}
