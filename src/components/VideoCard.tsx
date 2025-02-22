import React, { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { Video } from '../types';
import { DownloadService } from '../services/downloadService';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDirectDownload = async () => {
    try {
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

      await downloadService.downloadVideo(twitchVideo, '{title}');
    } catch (error) {
      console.error('Direct download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShowDialog = () => {
    console.log('Show dialog clicked');
    alert('Opening dialog...'); // Add this to verify the click handler works
    setShowDialog(true);
  };

  return (
    <div className="relative">
      <Stack direction="row" spacing={2}>
        <Button 
          variant="contained"
          color="primary"
          onClick={handleDirectDownload}
          disabled={isDownloading}
        >
          Direct Download
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleShowDialog}
        >
          Show Options
        </Button>
      </Stack>

      <DownloadOptionsDialog
        isOpen={showDialog}
        onClose={() => {
          console.log('Dialog closing');
          alert('Dialog closing'); // Add this to verify the close handler works
          setShowDialog(false);
        }}
        onDownload={handleDirectDownload}
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