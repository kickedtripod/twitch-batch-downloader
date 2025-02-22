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
    setIsDialogOpen(false);
    const includeDate = template.includes('({date})');
    const includeType = template.includes('[{type}]');
    await downloadVideo(video.id, video.title, { includeDate, includeType });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const twitchVideo: TwitchVideo = {
    id: video.id,
    user_id: '',
    user_login: '',
    user_name: '',
    title: video.title,
    description: '',
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    url: '',
    thumbnail_url: '',
    viewable: '',
    view_count: 0,
    language: 'en',
    type: 'archive',
    duration: ''
  };

  return (
    <div>
      <Button onClick={handleDownloadClick}>Download</Button>

      <DownloadOptionsDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onDownload={handleDownload}
        selectedCount={1}
        selectedVideos={new Set([video.id])}
        videos={[twitchVideo]}
      />
    </div>
  );
};

export default VideoCard; 