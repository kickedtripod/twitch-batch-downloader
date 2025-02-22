import { useState } from 'react';
import { TwitchVideo } from '../services/twitchApi';
import { Dialog, DialogContent, Checkbox, FormControlLabel } from '@mui/material';
import config from '../config/config';

interface DownloadOption {
  id: keyof FilenameComponents;
  label: string;
  description: string;
}

interface FilenameComponents {
  date: boolean;
  type: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (template: string) => void;
  selectedCount: number;
  selectedVideos: Set<string>;
  videos: TwitchVideo[];
}

const FILENAME_OPTIONS: DownloadOption[] = [
  {
    id: 'date',
    label: 'Include Date',
    description: 'Adds upload date in (YYYY-MM-DD) format'
  },
  {
    id: 'type',
    label: 'Include Type',
    description: 'Adds video type (Archive/Upload/Highlight)'
  }
];

export function DownloadOptionsDialog({ isOpen, onClose, onDownload, selectedCount, selectedVideos, videos }: Props) {
  console.log('DownloadOptionsDialog rendered with props:', { isOpen, selectedCount });

  const [components, setComponents] = useState<FilenameComponents>({
    date: false,
    type: false
  });

  // Get the first selected video for the example
  const exampleVideo = videos.find(v => selectedVideos.has(v.id));

  const generateFilename = (video: TwitchVideo, components: FilenameComponents): string => {
    let filename = video.title;
    
    if (components.date) {
      const date = new Date(video.created_at).toISOString().split('T')[0];
      filename += ` (${date})`;
    }
    
    if (components.type) {
      const type = video.type.charAt(0).toUpperCase() + video.type.slice(1);
      filename += ` [${type}]`;
    }
    
    return `${filename}.mp4`;
  };

  const generateTemplate = (components: FilenameComponents): string => {
    let template = '{title}';
    
    if (components.date) {
      template += ' ({date})';
    }
    
    if (components.type) {
      template += ' [{type}]';
    }
    
    return template;
  };

  const handleDownload = () => {
    const template = generateTemplate(components);
    onDownload(template);
    onClose();
  };

  const toggleComponent = (id: keyof FilenameComponents) => {
    setComponents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(30, 30, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
          color: 'white',
          width: '400px',
          margin: 2
        }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <h2 className="text-xl font-bold mb-4" style={{ 
          fontFamily: '"Urbanist", sans-serif',
          fontSize: '1.5rem',
          marginBottom: '1rem'
        }}>
          Download Options
        </h2>

        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '1.5rem',
          fontFamily: '"Urbanist", sans-serif'
        }}>
          Downloading {selectedCount} video{selectedCount !== 1 ? 's' : ''}
        </p>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ 
            fontFamily: '"Urbanist", sans-serif',
            marginBottom: '1rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            Filename Components:
          </p>
          {FILENAME_OPTIONS.map(option => (
            <FormControlLabel
              key={option.id}
              control={
                <Checkbox
                  checked={components[option.id]}
                  onChange={() => toggleComponent(option.id)}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    '&.Mui-checked': {
                      color: 'rgba(179, 167, 213, 0.95)'
                    },
                    padding: '9px'
                  }}
                />
              }
              label={
                <div>
                  <p style={{ 
                    fontFamily: '"Urbanist", sans-serif',
                    color: 'white',
                    marginBottom: '2px'
                  }}>
                    {option.label}
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: '"Urbanist", sans-serif'
                  }}>
                    {option.description}
                  </p>
                </div>
              }
              sx={{ 
                mb: 2, 
                display: 'flex',
                alignItems: 'flex-start',
                marginLeft: 0,
                '& .MuiCheckbox-root': {
                  marginRight: '12px'
                }
              }}
            />
          ))}

          {exampleVideo && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1.5rem'
            }}>
              <p style={{ 
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '0.5rem',
                fontFamily: '"Urbanist", sans-serif'
              }}>
                Example filename:
              </p>
              <p style={{ 
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: 'white'
              }}>
                {generateFilename(exampleVideo, components)}
              </p>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              fontFamily: '"Urbanist", sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            CANCEL
          </button>
          <button
            onClick={() => {
              const template = generateTemplate(components);
              onDownload(template);
            }}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'rgba(179, 167, 213, 0.95)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontFamily: '"Urbanist", sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.backgroundColor = 'rgba(179, 167, 213, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.backgroundColor = 'rgba(179, 167, 213, 0.95)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            DOWNLOAD
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 