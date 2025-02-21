import express, { Request, Response, Router, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

dotenv.config();

const app = express();
const router = Router();
const port = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins temporarily for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-batch-download']
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

// Add this check for yt-dlp path
const ytDlpPath = process.env.NODE_ENV === 'production' 
  ? 'yt-dlp'  // Use globally installed yt-dlp in production
  : '/opt/homebrew/bin/yt-dlp'; // Local path for development

// Update the handler definitions
const downloadHandler = async (
  req: Request<RouteParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const filenameMapPath = path.join(downloadsDir, `${videoId}.filename`);
    fs.writeFileSync(filenameMapPath, sanitizedFilename);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const videoUrl = `https://www.twitch.tv/videos/${videoId}`;
    const outputPath = path.join(downloadsDir, `${videoId}.mp4`);

    const ytDlp = spawn(ytDlpPath, [
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
              batchDownload: isBatchDownload === 'true',
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