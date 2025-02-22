import { FC, useState } from 'react';
import { Box, Select, MenuItem, Button, FormControl, Typography, Divider } from '@mui/material';
import VideoList from '../components/VideoList';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../contexts/AuthContext';
import LoginButton from '../components/LoginButton';
import { SelectChangeEvent } from '@mui/material';
import { VideoType } from '../services/twitchApi';
import LogoutIcon from '@mui/icons-material/Logout';
import { DownloadOptionsDialog } from '../components/DownloadOptionsDialog';

const HomePage: FC = () => {
  const { isAuthenticated, logout } = useAuth();
  console.log('HomePage auth state:', { isAuthenticated });
  const { 
    videos,
    selectedType,
    setSelectedType,
    selectedVideos,
    selectAllVideos,
    clearSelection,
    downloadSelectedVideos 
  } = useVideo();
  const [showDialog, setShowDialog] = useState(false);

  const handleDownload = (template: string) => {
    setShowDialog(false);
    downloadSelectedVideos(template);
  };

  if (!isAuthenticated) {
    return <LoginButton />;
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      <Box 
        sx={{ 
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(30, 30, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: 2,
          marginBottom: 2,
          borderRadius: 2,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ color: 'white' }}>
              {videos.length} videos available
            </Typography>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedType}
                onChange={(e: SelectChangeEvent) => setSelectedType(e.target.value as VideoType)}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& .MuiSelect-icon': { color: 'white' }
                }}
              >
                <MenuItem value="all">All Videos</MenuItem>
                <MenuItem value="archive">Archives</MenuItem>
                <MenuItem value="highlight">Highlights</MenuItem>
                <MenuItem value="upload">Uploads</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={selectAllVideos}
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              SELECT ALL
            </Button>
            
            <Button
              onClick={clearSelection}
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              CLEAR
            </Button>

            <Button
              variant="contained"
              onClick={() => setShowDialog(true)}
              disabled={selectedVideos.size === 0}
              sx={{
                backgroundColor: selectedVideos.size > 0 
                  ? 'rgba(179, 167, 213, 0.95)'  // Slate Lavender
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontWeight: 600,
                '&:hover': { 
                  backgroundColor: selectedVideos.size > 0 
                    ? 'rgba(179, 167, 213, 1)'   // Full opacity and brighter on hover
                    : 'rgba(255, 255, 255, 0.15)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(179, 167, 213, 0.4)'  // Subtle glow on hover
                },
                '&.Mui-disabled': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                },
                transition: 'all 0.2s ease',
                minWidth: 200,
              }}
            >
              {`DOWNLOAD SELECTED (${selectedVideos.size})`}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Button
          onClick={logout}
          startIcon={<LogoutIcon />}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.9rem',
            textTransform: 'none',
            '&:hover': {
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          Switch Twitch Account
        </Button>
      </Box>

      <DownloadOptionsDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onDownload={handleDownload}
        selectedCount={selectedVideos.size}
        selectedVideos={selectedVideos}
        videos={videos.filter(v => selectedVideos.has(v.id))}
      />

      <VideoList />
    </Box>
  );
};

export default HomePage; 