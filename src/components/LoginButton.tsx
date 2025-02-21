import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';

const LoginButton: React.FC = () => {
  const { login } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePosition({ x, y });

        // Calculate tilt based on mouse position
        // Reversed Y tilt (mouse below = tilt forward)
        const tiltX = -((y - 50) / 50) * 2; // Max 2 degrees tilt
        const tiltY = ((x - 50) / 50) * 2;  // Max 2 degrees tilt

        // Add constraints to limit maximum movement
        const constrainTilt = (value: number) => {
          const maxTilt = 2;
          return Math.max(Math.min(value, maxTilt), -maxTilt);
        };

        setTilt({ 
          x: constrainTilt(tiltX), 
          y: constrainTilt(tiltY)
        });
      }
    };

    const handleMouseLeave = () => {
      // Smoothly reset tilt when mouse leaves
      setTilt({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    if (containerRef.current) {
      containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '80px',
      minHeight: '100vh',
      gap: 4,
      textAlign: 'center',
      perspective: '1500px' // Increased perspective for subtler effect
    }}>
      <Box 
        ref={containerRef}
        sx={{
          position: 'relative',
          padding: '2rem',
          maxWidth: '600px',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out', // Slightly slower for smoother movement
          transformStyle: 'preserve-3d',
          '&:hover': {
            '& .shimmer': {
              opacity: 1
            }
          }
        }}
      >
        <Typography 
          variant="h2" 
          sx={{ 
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.2,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            position: 'relative',
            mixBlendMode: 'overlay',
            transform: 'translateZ(20px)', // Add some depth
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: '-20px',
              background: `radial-gradient(circle 150px at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(255,255,255,0.3), 
                transparent 50%)`,
              opacity: 0,
              transition: 'opacity 0.3s ease',
              mixBlendMode: 'overlay',
            }
          }}
        >
          One tool to download all your Twitch content
        </Typography>
      </Box>

      <Button
        onClick={login}
        variant="contained"
        size="large"
        sx={{
          backgroundColor: '#9146FF',
          color: 'white',
          padding: '16px 32px',
          fontSize: '1.2rem',
          fontWeight: 600,
          borderRadius: '12px',
          textTransform: 'none',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(145, 70, 255, 0.3)',
          '&:hover': {
            backgroundColor: '#7B2FFF',
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 25px rgba(145, 70, 255, 0.5)',
          }
        }}
      >
        Login with Twitch
      </Button>
    </Box>
  );
};

export default LoginButton; 