export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatDuration(duration: string): string {
  // Convert Twitch duration format (e.g., "1h2m3s") to readable format
  const hours = duration.match(/(\d+)h/)?.[1] || '0';
  const minutes = duration.match(/(\d+)m/)?.[1] || '0';
  const seconds = duration.match(/(\d+)s/)?.[1] || '0';

  if (hours !== '0') {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.padStart(2, '0')}`;
} 