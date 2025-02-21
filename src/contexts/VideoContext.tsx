import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TwitchApiService, TwitchVideo, VideoType } from '../services/twitchApi';
import { DownloadService, DownloadProgress } from '../services/downloadService';
import { useAuth } from './AuthContext';
import { config } from '../config/env';

interface VideoContextType {
  videos: TwitchVideo[];
  isLoading: boolean;
  error: string | null;
  downloadProgress: Record<string, DownloadProgress>;
  selectedType: VideoType;
  setSelectedType: (type: VideoType) => void;
  selectedVideos: Set<string>;
  toggleVideoSelection: (videoId: string) => void;
  selectAllVideos: () => void;
  clearSelection: () => void;
  downloadSelectedVideos: (filenameTemplate: string) => Promise<void>;
}

interface VideoProviderProps {
  children: ReactNode;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: VideoProviderProps) {
  const { accessToken } = useAuth();
  const [videos, setVideos] = useState<TwitchVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [selectedType, setSelectedType] = useState<VideoType>('all');
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (accessToken) {
      loadVideos();
    }
  }, [accessToken, selectedType]);

  const loadVideos = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = new TwitchApiService(accessToken);
      const fetchedVideos = await api.getVideos(selectedType);
      console.log('Fetched videos:', fetchedVideos);
      setVideos(fetchedVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const selectAllVideos = () => {
    setSelectedVideos(new Set(videos.map(v => v.id)));
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
  };

  const downloadSelectedVideos = async (filenameTemplate: string) => {
    if (!accessToken || selectedVideos.size === 0) return;

    const downloadService = new DownloadService(accessToken);
    const videoIds = Array.from(selectedVideos);
    const isBatch = videoIds.length > 1;

    try {
      console.log('Starting batch download for videos:', videoIds);

      // Download all videos first
      for (const videoId of videoIds) {
        const video = videos.find(v => v.id === videoId);
        if (video) {
          console.log('Downloading video:', video.id);
          const filename = formatFilename(video, filenameTemplate);
          await downloadService.downloadVideo(video, filename, updateProgress, isBatch);
          console.log('Video download complete:', video.id);
        }
      }

      // If multiple videos, download as zip
      if (isBatch) {
        try {
          // Properly encode the video IDs in the URL
          const encodedIds = videoIds.map(id => encodeURIComponent(id));
          const zipUrl = `${config.API_BASE_URL}/api/videos/download-zip?files=${encodedIds.join(',')}`;
          console.log('Requesting zip download from:', zipUrl);

          const response = await fetch(zipUrl);
          console.log('Zip download response:', response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error('Failed to download zip file');
          }

          const blob = await response.blob();
          console.log('Received blob size:', blob.size);

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'twitch-videos.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error downloading zip:', error);
          setError('Failed to download zip file. Please try again.');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download videos. Please try again.');
    }
  };

  function formatFilename(video: TwitchVideo, template: string): string {
    const date = new Date(video.created_at).toISOString().split('T')[0];
    return template
      .replace('{title}', video.title)
      .replace('{date}', date)
      .replace('{type}', video.type.charAt(0).toUpperCase() + video.type.slice(1));
  }

  const updateProgress = (progress: DownloadProgress) => {
    setDownloadProgress(prev => ({
      ...prev,
      [progress.videoId]: progress
    }));
  };

  return (
    <VideoContext.Provider value={{ 
      videos, 
      isLoading, 
      error, 
      downloadProgress, 
      selectedType,
      setSelectedType,
      selectedVideos,
      toggleVideoSelection,
      selectAllVideos,
      clearSelection,
      downloadSelectedVideos
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideos() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideos must be used within a VideoProvider');
  }
  return context;
} 