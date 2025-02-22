import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Video } from '../types';
import { DownloadService } from '../services/downloadService';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = () => {
    console.log('Opening download dialog');
    setShowDialog(true);
  };

  const handleDialogClose = () => {
    console.log('Closing dialog');
    setShowDialog(false);
  };

  const handleDownload = async (template: string) => {
    try {
      console.log('Starting download with template:', template);
      setShowDialog(false);
      setIsDownloading(true);

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const downloadService = new DownloadService(accessToken);
      const twitchVideo = {
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
      };

      await downloadService.downloadVideo(twitchVideo, template);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="contained"
        color="primary"
        onClick={handleDownloadClick}
        disabled={isDownloading}
      >
        {isDownloading ? 'Downloading...' : 'Download'}
      </Button>

      <DownloadOptionsDialog
        isOpen={showDialog}
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