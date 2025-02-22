import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Video } from '../types';
import { DownloadService } from '../services/downloadService';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';
import { TwitchVideo } from '../services/twitchApi';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const handleDownload = async (template: string) => {
    try {
      setIsDialogOpen(false);
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const downloadService = new DownloadService(accessToken);
      const includeDate = template.includes('({date})');
      const includeType = template.includes('[{type}]');
      await downloadService.downloadVideoByVideoId(video.id, video.title, { includeDate, includeType });
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <div className="relative">
      <Button 
        variant="contained"
        color="primary"
        onClick={handleDownloadClick}
        className="w-full"
      >
        Download
      </Button>

      <DownloadOptionsDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onDownload={handleDownload}
        selectedCount={1}
        selectedVideos={new Set([video.id])}
        videos={[{
          id: video.id,
          title: video.title,
          created_at: new Date().toISOString(),
          type: 'archive',
          user_id: '',
          user_login: '',
          user_name: '',
          description: '',
          published_at: new Date().toISOString(),
          url: '',
          thumbnail_url: '',
          viewable: '',
          view_count: 0,
          language: 'en',
          duration: ''
        }]}
      />
    </div>
  );
};

export default VideoCard; 