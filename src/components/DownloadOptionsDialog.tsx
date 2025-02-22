import { useState } from 'react';
import { TwitchVideo } from '../services/twitchApi';
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
  console.log('Dialog props:', { isOpen, selectedCount, selectedVideos });

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
        <h2 className="text-xl font-bold mb-4">Download Options</h2>
        <p className="text-gray-600 mb-4">
          Downloading {selectedCount} video{selectedCount !== 1 ? 's' : ''}
        </p>
        
        <div className="space-y-4 mb-6">
          <p className="font-medium">Filename Components:</p>
          {FILENAME_OPTIONS.map(option => (
            <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={components[option.id]}
                onChange={() => toggleComponent(option.id)}
                className="mt-1"
              />
              <div>
                <p>{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}

          {exampleVideo && (
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Example filename:</p>
              <p className="text-sm font-mono break-all mt-1">
                {generateFilename(exampleVideo, components)}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
} 