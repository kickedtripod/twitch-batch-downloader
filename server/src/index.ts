import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

dotenv.config();

// Add this after your imports and before app initialization
const ytDlpPath = process.env.NODE_ENV === 'production' 
  ? '/usr/local/bin/python3 ./yt-dlp'  // Explicitly use Python path
  : '/opt/homebrew/bin/yt-dlp'; // Local path for development

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
app.use(cors({
  origin: 'https://twitch-batch-downloader.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, '../downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
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
    .replace(/[\\/:"*?<>|]+/g, '-') // Replace Windows/Unix invalid chars with dash
    .replace(/\s+/g, ' ')           // Normalize spaces (but keep them as spaces)
    .replace(/\.+/g, '.')           // Replace multiple dots with single dot
    .trim();                        // Remove leading/trailing spaces
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
    const sanitizedFilename = sanitizeFilename(filename) + '.mp4';
    const filenameMapPath = path.join(downloadsDir, `${videoId}.filename`);
    fs.writeFileSync(filenameMapPath, sanitizedFilename);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const videoUrl = `https://www.twitch.tv/videos/${videoId}`;
    const outputPath = path.join(downloadsDir, `${videoId}.mp4`);

    const ytDlp = process.env.NODE_ENV === 'production'
      ? spawn('/usr/local/bin/python3', [
          './yt-dlp',
          videoUrl,
          '-o', outputPath,
          '-f', 'bestvideo+bestaudio/best',
          '--merge-output-format', 'mp4',
          '--newline',
          '--no-warnings',
          '--no-colors',
          '--progress',
          '--progress-template', '[download] %(progress._percent_str)s %(progress._downloaded_bytes_str)s at %(progress._speed_str)s ETA %(progress._eta_str)s'
        ])
      : spawn(ytDlpPath, [
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
    await new Promise<void>((resolve, reject) => {
      ytDlp.on('close', async (code) => {
        if (code === 0) {
          try {
            // Send completion event
            res.write(`data: ${JSON.stringify({ 
              type: 'complete',
              percent: 100,
              downloadUrl: `/api/videos/${videoId}/file`,
              filename: filename
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

      ytDlp.on('error', reject);
    });

  } catch (error) {
    console.error('Download handler error:', error);
    next(error);
  }
};

const zipHandler = async (
  req: Request<{}, any, any, { files?: string | string[] }>,
  res: Response
): Promise<void> => {
  try {
    const { files } = req.query;
    console.log('Received files query:', files);

    if (!files) {
      res.status(400).json({ error: 'No files specified' });
      return;
    }

    const fileList = typeof files === 'string' 
      ? files.split(',').map(f => decodeURIComponent(f))
      : (files as string[]).map(f => decodeURIComponent(f));
    
    console.log('Decoded file list:', fileList);

    const zipPath = path.join(downloadsDir, 'videos.zip');
    
    // Create list of full file paths and their formatted names
    const filePaths = fileList.map(videoId => {
      const videoPath = path.join(downloadsDir, `${videoId}.mp4`);
      const filenameMapPath = path.join(downloadsDir, `${videoId}.filename`);
      let formattedName;
      
      try {
        formattedName = fs.readFileSync(filenameMapPath, 'utf8').trim();
        // Ensure the filename ends with .mp4
        if (!formattedName.toLowerCase().endsWith('.mp4')) {
          formattedName += '.mp4';
        }
      } catch (error) {
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
      if (!fs.existsSync(file.path)) {
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
      fs.unlink(zipPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting zip file:', unlinkErr);
      });
      filePaths.forEach(file => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
        // Also delete the filename map file
        fs.unlink(file.path.replace('.mp4', '.filename'), (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting filename map:', unlinkErr);
        });
      });
    });
  } catch (error) {
    console.error('Error in zip handler:', error);
    res.status(500).json({ error: 'Failed to create zip file' });
  }
};

const fileHandler = (
  req: Request<RouteParams>,
  res: Response
): void => {
  const { videoId } = req.params;
  const outputPath = path.join(downloadsDir, `${videoId}.mp4`);

  res.download(outputPath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
    }
    // Clean up the file after sending
    fs.unlink(outputPath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting file:', unlinkErr);
    });
  });
};

// First, specific routes
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const ytDlp = spawn(ytDlpPath, ['--version']);
    
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
        path: downloadsDir,
        exists: fs.existsSync(downloadsDir),
        writable: fs.accessSync(downloadsDir, fs.constants.W_OK)
      }
    });
  } catch (error) {
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
    port: port,
    nodeEnv: process.env.NODE_ENV,
    downloadsDir: downloadsDir,
    host: '0.0.0.0',
    ytDlpPath: ytDlpPath
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
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
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