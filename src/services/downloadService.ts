import { TwitchVideo } from './twitchApi';
import { config } from '../config/env';

export interface DownloadProgress {
  videoId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'processing';
  error?: string;
  speed?: string;
  eta?: string;
  size?: string;
}

export interface ProgressData {
  type: string;
  percent: number;
  speed?: string;
  eta?: string;
  status?: 'downloading' | 'processing';
}

export class DownloadService {
  constructor(private accessToken: string) {}

  private sanitizeFilename(filename: string): string {
    // Only do basic sanitization on the client side
    // Server will handle the full sanitization
    return filename.trim();
  }

  async downloadVideo(
    video: TwitchVideo, 
    filename: string,
    onProgress?: (progress: DownloadProgress) => void,
    isBatchDownload: boolean = false
  ): Promise<void> {
    try {
      console.log('Starting download with config:', {
        API_BASE_URL: config.API_BASE_URL,
        videoId: video.id,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const response = await fetch(`${config.API_BASE_URL}/api/videos/${video.id}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        credentials: 'include'
      });

      console.log('Download response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        throw new Error(`Failed to start download: ${response.status} ${response.statusText}`);
      }

      // Initialize progress
      onProgress?.({
        videoId: video.id,
        progress: 0,
        status: 'downloading'
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Progress data:', data);

              if (data.type === 'progress') {
                onProgress?.({
                  videoId: video.id,
                  progress: data.percent,
                  status: data.status === 'processing' ? 'processing' : 'downloading',
                  speed: data.speed,
                  eta: data.eta
                });
              } else if (data.type === 'complete') {
                // Handle completion
                onProgress?.({
                  videoId: video.id,
                  progress: 100,
                  status: 'completed'
                });

                // If this is part of a batch download, don't download immediately
                if (!data.batchDownload) {
                  // Single file download
                  const fileResponse = await fetch(`${config.API_BASE_URL}${data.downloadUrl}`);
                  if (!fileResponse.ok) {
                    throw new Error('Failed to download file');
                  }

                  const blob = await fileResponse.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = this.sanitizeFilename(filename);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                }
                return;
              }
            } catch (e) {
              console.error('Error parsing progress:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      onProgress?.({
        videoId: video.id,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed'
      });
      throw error;
    }
  }
} 