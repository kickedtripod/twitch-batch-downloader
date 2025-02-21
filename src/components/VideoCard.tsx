import React, { useState } from 'react';
import { FormControlLabel, Checkbox } from '@mui/material';
import { Video } from '../types';
import { downloadVideo } from '../services/downloadService';

interface VideoCardProps {
  video: Video;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  // Add state for selected options
  const [includeDate, setIncludeDate] = useState(false);
  const [includeType, setIncludeType] = useState(false);

  // Update the download function
  const handleDownload = async () => {
    const filenameOptions = {
      includeDate,
      includeType,
    };
    await downloadVideo(video.id, video.title, filenameOptions);
    // ...
  };

  return (
    <div>
      <div>
        <FormControlLabel
          control={<Checkbox checked={includeDate} onChange={(e) => setIncludeDate(e.target.checked)} />}
          label="Include Date"
        />
        <FormControlLabel
          control={<Checkbox checked={includeType} onChange={(e) => setIncludeType(e.target.checked)} />}
          label="Include Type"
        />
      </div>
    </div>
  );
};

export default VideoCard; 