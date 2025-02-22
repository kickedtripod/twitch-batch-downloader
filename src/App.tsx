import { FC } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoProvider } from './contexts/VideoContext';
import HomePage from './pages/HomePage';
import AuthCallback from './pages/AuthCallback';
import { Button, Typography, Box } from '@mui/material';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme/theme';
import { Analytics } from '@vercel/analytics/react';

// Add this CSS to your index.css or create a new styles.css
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600&display=swap');
  
  body {
    margin: 0;
    padding: 0;
    font-family: 'Urbanist', sans-serif;
    background: linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%);
    min-height: 100vh;
  }

  .frosted-glass {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const App: FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <style>{globalStyles}</style>
      <Box sx={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: 3,
        minHeight: '100vh'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 1,
          mb: 2
        }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 'bold',
            color: '#FFFFFF',
            mb: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
          }}>
            KT's Twitch Saver
          </Typography>
          
          <Button
            variant="contained"
            href="http://ko-fi.com/kickedtripod"
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<LocalCafeIcon />}
            sx={{
              backgroundColor: 'rgba(255, 0, 0, 0.9)',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: 'rgba(204, 0, 0, 0.9)',
              },
              borderRadius: 2,
              padding: '8px 16px',
              textTransform: 'none',
              fontWeight: 'bold',
              mb: 2,
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            Buy me a Red Bull
          </Button>
        </Box>

        <Box className="frosted-glass" sx={{ 
          padding: 2,
          '& > *': {
            margin: 0
          }
        }}>
          <Router>
            <AuthProvider>
              <VideoProvider>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/twitch" element={<AuthCallback />} />
                </Routes>
              </VideoProvider>
            </AuthProvider>
          </Router>
        </Box>
      </Box>
      <Analytics />
    </ThemeProvider>
  );
}

export default App; 