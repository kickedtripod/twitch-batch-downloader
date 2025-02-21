import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ServerConfig {
  port: number;
  nodeEnv: string;
  downloadsDir: string;
  ytDlpPath: string;
  corsOrigin: string;
}

const config: ServerConfig = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  downloadsDir: path.resolve(__dirname, '../downloads'),
  ytDlpPath: '/usr/local/bin/yt-dlp',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
};

export default config; 