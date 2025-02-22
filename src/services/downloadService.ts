import { TwitchVideo } from './twitchApi';
import config from '../config/config';
import { Video } from '../types';

export interface DownloadProgress {
  videoId: string;
  status: string;
  percent: number;
  speed?: string;
  eta?: string;
  error?: string;
}

export interface ProgressData {
  type: string;
  percent: number;
  speed?: string;
  eta?: string;
  status?: 'downloading' | 'processing';
}

interface FilenameOptions {
  includeDate: boolean;
  includeType: boolean;
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
        apiUrl: config.API_BASE_URL,
        videoId: video.id,
        filename
      });

      const response = await fetch(`${config.API_BASE_URL}/api/videos/${video.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ filename: this.sanitizeFilename(filename) })
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

      // Initial progress
      onProgress?.({
        videoId: video.id,
        percent: 0,
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
                  percent: data.percent,
                  status: data.status === 'processing' ? 'processing' : 'downloading',
                  speed: data.speed,
                  eta: data.eta
                });
              } else if (data.type === 'complete') {
                // Handle completion
                onProgress?.({
                  videoId: video.id,
                  percent: 100,
                  status: 'completed'
                });

                // Only download if not batch
                if (!isBatchDownload) {
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
        percent: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed'
      });
      throw error;
    }
  }

  async downloadSelectedVideos(videos: TwitchVideo[], filenameTemplate: string): Promise<void> {
    try {
      // Download each video first
      for (const video of videos) {
        await this.downloadVideo(
          video, 
          filenameTemplate,
          undefined,  // No progress callback needed
          true        // Mark as batch download
        );
      }

      console.log('All videos processed, requesting zip...');

      // Then request the zip
      const response = await fetch(`${config.API_BASE_URL}/api/videos/download-zip?files=${videos.map(v => v.id).join(',')}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Zip download failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to download zip: ${response.status} ${response.statusText}`);
      }

      // Handle the zip file download
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty zip file');
      }

      console.log('Zip file received:', {
        size: blob.size,
        type: blob.type
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'twitch-videos.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading videos:', error);
      throw error;
    }
  }

  async downloadVideoByVideoId(videoId: string, title: string, options: FilenameOptions): Promise<void> {
    try {
      // Generate the filename with the template
      let filename = title;
      if (options.includeDate) {
        const date = new Date().toISOString().split('T')[0];
        filename = `${filename} (${date})`;
      }
      if (options.includeType) {
        filename = `${filename} [Archive]`;
      }
      filename = `${filename}.mp4`;

      console.log('Downloading video with options:', { videoId, filename, options });
      
      const response = await fetch(`${config.API_BASE_URL}/api/videos/${videoId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          filename: this.sanitizeFilename(filename),
          includeDate: options.includeDate,
          includeType: options.includeType
        })
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('Download error:', errorText);
        throw new Error('Failed to download video');
      }

      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'complete') {
              // Trigger the actual file download
              const fileResponse = await fetch(`${config.API_BASE_URL}${data.downloadUrl}`);
              if (!fileResponse.ok) {
                throw new Error('Failed to download file');
              }

              const blob = await fileResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;  // Use our generated filename
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
}

export const downloadVideo = async (videoId: string, title: string, options: FilenameOptions): Promise<void> => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    throw new Error('No access token found');
  }

  const downloadService = new DownloadService(accessToken);
  await downloadService.downloadVideoByVideoId(videoId, title, options);
}; 