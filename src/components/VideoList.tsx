import { Box, Card, CardContent, Typography, Checkbox, LinearProgress, Link, Chip } from '@mui/material';
import { CalendarMonth, AccessTime, VideoLibrary, VideoFile, Archive, Highlight } from '@mui/icons-material';
import { useVideo } from '../contexts/VideoContext';
import { formatDate, formatDuration } from '../utils/formatters';

// Add these type definitions at the top
type VideoType = 'upload' | 'archive' | 'highlight';

const typeColors: Record<VideoType, string> = {
  upload: 'rgba(102, 255, 102, 0.3)',    // Softer Lime Green
  archive: 'rgba(0, 223, 252, 0.3)',     // Softer Cyan
  highlight: 'rgba(255, 0, 127, 0.3)'    // Softer Magenta
};

const VideoList: React.FC = () => {
  const { 
    videos, 
    selectedVideos, 
    toggleVideoSelection,
    downloadProgress 
  } = useVideo();

  if (videos.length === 0) {
    return (
      <Typography variant="body1" sx={{ color: 'white', textAlign: 'center', py: 4 }}>
        No videos found
      </Typography>
    );
  }

  // Update the getTypeIcon function
  const getTypeIcon = (type: VideoType) => {
    switch (type.toLowerCase()) {
      case 'upload':
        return <VideoFile sx={{ fontSize: 16 }} />;
      case 'archive':
        return <Archive sx={{ fontSize: 16 }} />;
      case 'highlight':
        return <Highlight sx={{ fontSize: 16 }} />;
      default:
        return <VideoFile sx={{ fontSize: 16 }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {videos.map((video) => {
        const progress = downloadProgress[video.id];
        const isSelected = selectedVideos.has(video.id);

        // Format thumbnail URL
        const thumbnailUrl = video.thumbnail_url
          .replace('%{width}', '160')
          .replace('%{height}', '90');

        return (
          <Card 
            key={video.id}
            onClick={() => toggleVideoSelection(video.id)}
            sx={{
              backgroundColor: isSelected
                ? 'rgba(20, 20, 30, 0.6)'
                : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: isSelected 
                ? '1px solid rgba(179, 167, 213, 0.6)'  // Matching Slate Lavender
                : '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-2px)',
                backgroundColor: isSelected
                  ? 'rgba(20, 20, 30, 0.7)'
                  : 'rgba(255, 255, 255, 0.15)',
                '&::after': {
                  opacity: 1
                }
              },
              '&::after': {  // Selection indicator
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 2,
                border: '2px solid rgba(179, 167, 213, 0.4)',  // Matching Slate Lavender
                opacity: isSelected ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none'
              }
            }}
          >
            <CardContent sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 2,
              '&:last-child': { pb: 2 }
            }}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleVideoSelection(video.id);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  '&.Mui-checked': {
                    color: 'white',
                  }
                }}
              />
              
              <Link 
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{ 
                  display: 'block',
                  position: 'relative',
                  '&:hover': {
                    '.thumbnail-overlay': {
                      opacity: 1
                    },
                    '.thumbnail-image': {
                      transform: 'scale(1.03)',
                      filter: 'brightness(0.7)'
                    }
                  }
                }}
              >
                <Box 
                  component="img"
                  src={thumbnailUrl}
                  alt={video.title}
                  className="thumbnail-image"
                  sx={{
                    width: 160,
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 1,
                    transition: 'all 0.2s ease'
                  }}
                />
                <Box
                  className="thumbnail-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: 1,
                    opacity: 0,
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  <Typography
                    sx={{
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}
                  >
                    View on Twitch
                  </Typography>
                </Box>
              </Link>
              
              <Box sx={{ flexGrow: 1 }}>
                <Link
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ 
                    textDecoration: 'none',
                    width: 'fit-content',
                    display: 'block',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      '.video-title': {
                        color: 'rgba(122, 0, 247, 0.9)',  // Matching Hyper Purple
                        textDecoration: 'underline'
                      }
                    }
                  }}
                >
                  <Typography 
                    className="video-title"
                    variant="h6" 
                    sx={{ 
                      color: 'white', 
                      mb: 1,
                      fontFamily: '"Urbanist", sans-serif',
                      fontWeight: 400,
                      fontSize: '1.1rem',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {video.title}
                  </Typography>
                </Link>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <Chip
                    icon={getTypeIcon(video.type as VideoType)}
                    label={video.type}
                    size="small"
                    sx={{
                      backgroundColor: typeColors[video.type.toLowerCase() as VideoType],
                      color: 'white',
                      fontFamily: '"Urbanist", sans-serif',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      height: 26,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      backdropFilter: 'blur(8px)',  // Increased blur for better blending
                      border: '1px solid rgba(255, 255, 255, 0.1)',  // Subtle border
                      '& .MuiChip-icon': {
                        color: 'white',
                        opacity: 0.9,
                        marginLeft: '8px',
                      },
                      '& .MuiChip-label': {
                        paddingLeft: '8px',
                        paddingRight: '12px',
                      },
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: typeColors[video.type.toLowerCase() as VideoType].replace('0.3', '0.4')  // Slightly more opaque on hover
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                    <CalendarMonth sx={{ fontSize: 16, opacity: 0.7 }} />
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontFamily: '"Urbanist", sans-serif',
                        fontWeight: 400
                      }}
                    >
                      {formatDate(video.created_at)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                    <AccessTime sx={{ fontSize: 16, opacity: 0.7 }} />
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontFamily: '"Urbanist", sans-serif',
                        fontWeight: 400
                      }}
                    >
                      {formatDuration(video.duration)}
                    </Typography>
                  </Box>
                </Box>

                {progress && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress.percent}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        height: 12,
                        borderRadius: 6,
                        position: 'relative',
                        overflow: 'hidden',
                        '& .MuiLinearProgress-bar': {
                          background: progress.status === 'completed'
                            ? 'linear-gradient(45deg, #2ecc71, #27ae60, #2ecc71)'
                            : 'linear-gradient(90deg, rgba(100, 65, 165, 0.9), rgba(183, 60, 255, 0.9))',
                          borderRadius: 6,
                          transition: 'transform 0.2s linear, background 0.5s ease',
                          ...(progress.status !== 'completed' && {
                            maskImage: `repeating-linear-gradient(
                              45deg,
                              #000 0px,
                              #000 10px,
                              rgba(0, 0, 0, 0.8) 10px,
                              rgba(0, 0, 0, 0.8) 20px
                            )`,
                            maskSize: '28px 28px',
                            animation: 'moveStripesMask 1s linear infinite',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.25))',
                              filter: 'blur(2px)',
                            }
                          }),
                          ...(progress.status === 'completed' && {
                            animation: 'completeGradient 1s ease forwards',
                            backgroundSize: '200% 200%',
                          })
                        },
                        '@keyframes moveStripesMask': {
                          '0%': {
                            maskPosition: '-28px 0'
                          },
                          '100%': {
                            maskPosition: '0 0'
                          }
                        },
                        '@keyframes completeGradient': {
                          '0%': {
                            opacity: 0.8,
                            transform: 'scale(1)'
                          },
                          '50%': {
                            opacity: 1,
                            transform: 'scale(1.02)'
                          },
                          '100%': {
                            opacity: 1,
                            transform: 'scale(1)'
                          }
                        }
                      }}
                    />
                    
                    {progress.status === 'completed' ? (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(46, 204, 113, 0.9)',
                          mt: 0.5, 
                          display: 'block',
                          fontSize: '0.85rem',
                          transition: 'color 0.5s ease'
                        }}
                      >
                        ✓ Download Complete!
                      </Typography>
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        mt: 0.5,
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.85rem'
                      }}>
                        <Typography variant="caption">
                          {`${progress.percent.toFixed(1)}% - ${progress.status}`}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {progress.speed && progress.eta && 
                            `${progress.speed} - ${progress.eta} remaining`
                          }
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default VideoList; 