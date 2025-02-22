import React, { useState } from 'react';
import { FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Video } from '../types';
import { downloadVideo } from '../services/downloadService';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  // Add state for selected options
  const [includeDate, setIncludeDate] = useState(false);
  const [includeType, setIncludeType] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDownloadClick = () => {
    setIsDialogOpen(true);
  };

  const handleDownloadConfirm = async () => {
    setIsDialogOpen(false);
    const filenameOptions = {
      includeDate,
      includeType,
    };
    await downloadVideo(video.id, video.title, filenameOptions);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <div>
      <Button onClick={handleDownloadClick}>Download</Button>

      <Dialog open={isDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Download Options</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox checked={includeDate} onChange={(e) => setIncludeDate(e.target.checked)} />}
            label="Include Date"
          />
          <FormControlLabel
            control={<Checkbox checked={includeType} onChange={(e) => setIncludeType(e.target.checked)} />}
            label="Include Type"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleDownloadConfirm} variant="contained" color="primary">
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default VideoCard; 