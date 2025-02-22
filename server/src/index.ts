import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import config from './config';

dotenv.config();

// Add this after your imports and before app initialization
const ytDlpPath = process.env.NODE_ENV === 'production' 
  ? '/usr/local/bin/yt-dlp'  // Use installed binary in production
  : '/opt/homebrew/bin/yt-dlp';

const app = express();
const port = process.env.PORT || 3001;

// Move these to the top, right after imports and before any other code
let server: ReturnType<typeof app.listen>;

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Performing graceful shutdown...');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',                                    // Development
  'https://twitch-batch-downloader.vercel.app',              // Production
  process.env.CORS_ORIGIN                                     // From environment
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

app.use(express.json());

// Create downloads directory if it doesn't exist
if (!fs.existsSync(config.downloadsDir)) {
  fs.mkdirSync(config.downloadsDir, { recursive: true });
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
function sanitizeFilename(filename: string): string {
  return filename
    // Remove any file extension
    .replace(/\.[^/.]+$/, '')
    // Remove any trailing numbers in parentheses, e.g., "(11)"
    .replace(/\s*\(\d+\)\s*$/, '')
    // Remove any other special characters
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    // Trim any remaining whitespace
    .trim();
}

// Add a helper function to parse yt-dlp progress
function parseProgress(output: string) {
  // Look for download percentage
  const progressMatch = output.match(/(\d+\.?\d*)%/);
  if (!progressMatch) return null;

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

interface RouteParams {
  videoId: string;
}

interface ZipQueryParams {
  files?: string | string[];
}

interface DownloadResponse {
  type: string;
  percent: number;
  downloadUrl?: string;
  batchDownload?: boolean;
  status?: string;
  speed?: string;
  eta?: string;
}

// Update the handler definitions
const downloadHandler = async (
  req: Request<RouteParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { videoId } = req.params;
    const { authorization } = req.headers;
    const { filename, includeDate, includeType } = req.body;

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
    let sanitizedFilename = filename
      // Then remove the numbered suffix pattern
      .replace(/\s*\(\d+\)(?=\s*-?\s*2025)/, '')
      // Finally clean up any remaining special characters
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim();

    const options = {
      includeDate,
      includeType
    };
    if (includeDate) {
      sanitizedFilename += `-${new Date().toISOString().slice(0, 10)}`;
    }
    if (includeType) {
      sanitizedFilename += '-Archive';
    }
    const filenameMapPath = path.join(config.downloadsDir, `${videoId}.filename`);
    fs.writeFileSync(filenameMapPath, `${sanitizedFilename}\n${JSON.stringify(options)}\n`);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const videoUrl = `https://www.twitch.tv/videos/${videoId}`;
    const outputPath = path.join(config.downloadsDir, `${videoId}.mp4`);

    console.log('Starting download with config:', {
      ytDlpPath: config.ytDlpPath,
      videoUrl,
      outputPath,
      nodeEnv: config.nodeEnv
    });

    console.log('Checking yt-dlp path:', config.ytDlpPath);
    console.log('yt-dlp exists:', fs.existsSync(config.ytDlpPath));
    console.log('yt-dlp stats:', fs.existsSync(config.ytDlpPath) ? fs.statSync(config.ytDlpPath) : null);

    const ytDlp = spawn(config.ytDlpPath, [
      '--no-check-certificates',  // Add this to avoid SSL issues
      '--no-cache-dir',          // Don't try to use cache
      videoUrl,
      '-o', outputPath,
      '-f', 'best',              // Simplify format selection
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
    await new Promise<void>((resolve, reject) => {
      ytDlp.on('close', async (code) => {
        if (code === 0) {
          try {
            // Verify file exists and has size
            const fileStats = fs.statSync(outputPath);
            console.log('Download verification:', {
              videoId,
              outputPath,
              exists: fs.existsSync(outputPath),
              size: fileStats.size,
              isFile: fileStats.isFile(),
              permissions: fileStats.mode,
              directory: config.downloadsDir,
              dirContents: fs.readdirSync(config.downloadsDir)
            });

            if (!fs.existsSync(outputPath) || fileStats.size === 0) {
              reject(new Error('Download completed but file is missing or empty'));
              return;
            }

            // Send completion event
            const isBatchDownload = req.query.batch === 'true';
            console.log('Download complete:', {
              videoId,
              isBatchDownload,
              outputPath,
              exists: fs.existsSync(outputPath)
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
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });

      ytDlp.on('error', (error) => {
        console.error('Spawn error:', error);
        console.error('Command details:', {
          command: config.ytDlpPath,
          exists: fs.existsSync(config.ytDlpPath),
          stats: fs.existsSync(config.ytDlpPath) ? fs.statSync(config.ytDlpPath) : null
        });
      });
    });

  } catch (error) {
    console.error('Download handler error:', error);
    next(error);
  }
};

const zipHandler = async (req: Request<{}, any, any, { files?: string | string[] }>, res: Response): Promise<void> => {
  try {
    const { files } = req.query;
    console.log('1. Received files query:', files);

    if (!files) {
      res.status(400).json({ error: 'No files specified' });
      return;
    }

    const fileList = typeof files === 'string' 
      ? files.split(',').map(f => decodeURIComponent(f))
      : (files as string[]).map(f => decodeURIComponent(f));
    
    console.log('2. Decoded file list:', fileList);

    const zipPath = path.join(config.downloadsDir, 'videos.zip');
    console.log('3. Zip path:', zipPath);
    
    // Create list of full file paths and their formatted names
    const filePaths = fileList.map(videoId => {
      const videoPath = path.join(config.downloadsDir, `${videoId}.mp4`);
      const filenameMapPath = path.join(config.downloadsDir, `${videoId}.filename`);
      
      const fileExists = fs.existsSync(videoPath);
      const mapExists = fs.existsSync(filenameMapPath);
      
      console.log('4. File check:', {
        videoId,
        videoPath,
        filenameMapPath,
        fileExists,
        mapExists,
        dirContents: fs.readdirSync(config.downloadsDir)
      });

      let formattedName;
      try {
        formattedName = fs.readFileSync(filenameMapPath, 'utf8').trim();
        if (!formattedName.toLowerCase().endsWith('.mp4')) {
          formattedName += '.mp4';
        }
      } catch (error) {
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
    const missingFiles = filePaths.filter(file => !fs.existsSync(file.path));
    if (missingFiles.length > 0) {
      console.error('7. Missing files:', missingFiles);
      res.status(404).json({ 
        error: 'Some files are missing',
        missing: missingFiles.map(f => f.name),
        downloadsDir: config.downloadsDir,
        dirContents: fs.readdirSync(config.downloadsDir)
      });
      return;
    }

    console.log('Pre-zip file check:', {
      files: filePaths.map(file => ({
        path: file.path,
        name: file.name,
        exists: fs.existsSync(file.path),
        size: fs.existsSync(file.path) ? fs.statSync(file.path).size : 0
      })),
      downloadsDir: {
        path: config.downloadsDir,
        contents: fs.readdirSync(config.downloadsDir)
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
        fs.unlink(zipPath, () => {
          filePaths.forEach(file => {
            fs.unlink(file.path, () => {});
            fs.unlink(file.path.replace('.mp4', '.filename'), () => {});
          });
        });
      }, 1000); // Give a small delay to ensure download is complete
    });
  } catch (error) {
    console.error('Error in zip handler:', error);
    res.status(500).json({ 
      error: 'Failed to create zip file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

const fileHandler = (
  req: Request<RouteParams>,
  res: Response
): void => {
  const { videoId } = req.params;
  const { batch } = req.query;
  const outputPath = path.join(config.downloadsDir, `${videoId}.mp4`);
  const filenameMapPath = path.join(config.downloadsDir, `${videoId}.filename`);

  try {
    let baseFilename = `${videoId}`;
    if (fs.existsSync(filenameMapPath)) {
      console.log('Reading filename from:', filenameMapPath);
      let filename = fs.readFileSync(filenameMapPath, 'utf8').trim();
      console.log('Original filename:', filename);
      // Sanitize the filename
      filename = sanitizeFilename(filename);
      console.log('Sanitized filename:', filename);
      
      baseFilename = filename;
    }

    // Construct the final filename
    let downloadName = baseFilename;
    const { includeDate, includeType } = JSON.parse(fs.readFileSync(filenameMapPath, 'utf8').split('\n')[1]);
    if (includeDate) {
      downloadName += `-${new Date().toISOString().slice(0, 10)}`;
    }
    if (includeType) {
      downloadName += '-Archive';
    }
    // Always ensure the file ends with .mp4
    if (!downloadName.toLowerCase().endsWith('.mp4')) {
      downloadName += '.mp4';
    }
    console.log('Final download name:', downloadName);

    console.log('File handler request:', {
      videoId,
      batch,
      outputPath,
      downloadName,
      exists: fs.existsSync(outputPath)
    });

    if (!fs.existsSync(outputPath)) {
      console.error('File not found:', outputPath);
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // For batch downloads, just send the file without deleting
    if (batch === 'true') {
      res.attachment(downloadName);
      res.sendFile(outputPath);
      return;
    }

    // For single downloads, delete after successful download
    res.attachment(downloadName);
    res.sendFile(outputPath, (err) => {
      if (err) console.error('Error sending file:', err);
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Error in file handler:', error);
    res.status(500).json({ error: 'Failed to send file' });
  }
};

// First, specific routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/videos/:videoId/download', downloadHandler);
app.get('/api/videos/download-zip', zipHandler);
app.get('/api/videos/:videoId/file', fileHandler);

// Last, catch-all route
app.get('*', (req: Request, res: Response) => {
  res.json({
    message: 'Server is running',
    path: req.path,
    method: req.method,
    env: process.env.NODE_ENV,
    port: port
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
    port,
    nodeEnv: process.env.NODE_ENV,
    downloadsDir: config.downloadsDir
  });
  console.log(`Server running at http://0.0.0.0:${port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
  process.exit(1);
});

// Add a helper function to create zip files
async function createZipFile(files: { path: string; name: string }[], zipPath: string): Promise<void> {
  // First verify all files exist and are readable
  const fileChecks = files.map(file => {
    try {
      const stats = fs.statSync(file.path);
      return {
        path: file.path,
        name: file.name,
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
        readable: fs.accessSync(file.path, fs.constants.R_OK)
      };
    } catch (error) {
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
    directory: config.downloadsDir,
    dirContents: fs.readdirSync(config.downloadsDir)
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
        exists: fs.existsSync(f.path),
        size: fs.existsSync(f.path) ? fs.statSync(f.path).size : 0
      }))
    });

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
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
      } catch (error) {
        console.error(`Error adding file to archive: ${file.path}`, error);
      }
    });

    try {
      archive.finalize();
    } catch (error) {
      console.error('Error finalizing archive:', error);
      reject(error);
    }
  });
} 