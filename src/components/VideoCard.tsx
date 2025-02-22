import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Video } from '../types';
import { downloadVideo } from '../services/downloadService';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';
import { TwitchVideo } from '../services/twitchApi';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDownloadClick = () => {
    setIsDialogOpen(true);
  };

  const handleDownload = async (template: string) => {
    try {
      setIsDialogOpen(false);
      const includeDate = template.includes('({date})');
      const includeType = template.includes('[{type}]');
      await downloadVideo(video.id, video.title, { includeDate, includeType });
    } catch (error) {
      console.error('Download failed:', error);
      // TODO: Add error notification here
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
          // Add other required TwitchVideo properties
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