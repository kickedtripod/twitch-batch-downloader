import { useAuth } from '../contexts/AuthContext';
import { useVideos } from '../contexts/VideoContext';
import { VideoType } from '../services/twitchApi';
import { useState } from 'react';
import { DownloadOptionsDialog } from '../components/DownloadOptionsDialog';

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: 'all', label: 'All Videos' },
  { value: 'archive', label: 'Past Broadcasts' },
  { value: 'upload', label: 'Uploads' },
  { value: 'highlight', label: 'Highlights' },
];

function formatDuration(duration: string) {
  // Convert Twitch duration (e.g., "1h2m3s") to readable format
  const hours = duration.match(/(\d+)h/)?.[1] || '0';
  const minutes = duration.match(/(\d+)m/)?.[1] || '0';
  const seconds = duration.match(/(\d+)s/)?.[1] || '0';
  
  if (hours !== '0') {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

function formatViews(views: number) {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

function getProcessedThumbnailUrl(url: string): string {
  // Replace Twitch's thumbnail placeholders with actual dimensions
  return url
    .replace('%{width}', '320')
    .replace('%{height}', '180');
}

function HomePage() {
  const { isAuthenticated, login } = useAuth();
  const { 
    videos, 
    isLoading, 
    error, 
    downloadProgress, 
    selectedType,
    setSelectedType,
    selectedVideos,
    toggleVideoSelection,
    selectAllVideos,
    clearSelection,
    downloadSelectedVideos
  } = useVideos();
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  const handleDownloadClick = () => {
    if (selectedVideos.size > 0) {
      setShowDownloadOptions(true);
    }
  };

  const handleDownload = (template: string) => {
    downloadSelectedVideos(template);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Twitch Batch Downloader
        </h1>
        
        {!isAuthenticated ? (
          <button
            onClick={login}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login with Twitch
          </button>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center text-gray-600">Loading your videos...</p>
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <p className="text-lg">
                      {videos.length} videos available
                    </p>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as VideoType)}
                      className="border rounded-md px-2 py-1"
                    >
                      {VIDEO_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllVideos}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleDownloadClick}
                      disabled={selectedVideos.size === 0}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedVideos.size === 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      Download Selected ({selectedVideos.size})
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {videos.map(video => (
                    <div 
                      key={video.id} 
                      className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                        selectedVideos.has(video.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleVideoSelection(video.id)}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedVideos.has(video.id)}
                            onChange={() => toggleVideoSelection(video.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img 
                              src={getProcessedThumbnailUrl(video.thumbnail_url)} 
                              alt={video.title}
                              className="w-48 h-27 object-cover rounded-md hover:opacity-90 transition-opacity"
                            />
                          </a>
                          <span className="text-sm px-3 py-1 bg-gray-100 rounded-full capitalize w-full text-center">
                            {video.type}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-semibold text-lg hover:text-purple-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {video.title}
                              </a>
                              <div className="text-sm text-gray-600 mt-1 space-x-2">
                                <span>{formatDuration(video.duration)}</span>
                                <span>•</span>
                                <span>{formatViews(video.view_count)}</span>
                                <span>•</span>
                                <span>{new Date(video.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {video.description}
                              </p>
                            </div>
                          </div>
                          {downloadProgress[video.id] && (
                            <div className="mt-4">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    downloadProgress[video.id].status === 'completed' 
                                      ? 'bg-green-500' 
                                      : downloadProgress[video.id].status === 'error'
                                      ? 'bg-red-500'
                                      : 'bg-blue-500'
                                  }`}
                                  style={{ 
                                    width: `${downloadProgress[video.id].progress}%`
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-sm mt-1">
                                <p>
                                  {downloadProgress[video.id].status === 'completed' 
                                    ? 'Download complete' 
                                    : downloadProgress[video.id].status === 'error'
                                    ? `Error: ${downloadProgress[video.id].error}`
                                    : downloadProgress[video.id].status === 'processing'
                                    ? 'Processing video...'
                                    : `Downloading... ${downloadProgress[video.id].progress.toFixed(1)}%`}
                                </p>
                                {downloadProgress[video.id].status === 'downloading' && (
                                  <p className="text-gray-600">
                                    {downloadProgress[video.id].speed && `${downloadProgress[video.id].speed}`}
                                    {downloadProgress[video.id].eta && ` • ${downloadProgress[video.id].eta} remaining`}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <DownloadOptionsDialog
        isOpen={showDownloadOptions}
        onClose={() => setShowDownloadOptions(false)}
        onDownload={handleDownload}
        selectedCount={selectedVideos.size}
        selectedVideos={selectedVideos}
        videos={videos}
      />
    </div>
  );
}

export default HomePage; 