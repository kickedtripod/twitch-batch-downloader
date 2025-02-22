import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Video } from '../types';
import { downloadVideo } from '../services/downloadService';
import { DownloadOptionsDialog } from './DownloadOptionsDialog';

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
    await downloadVideo(video.id, video.title);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
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
        videos={[video]}
      />
    </div>
  );
};

export default VideoCard; 