import { config } from '../config/env';

export type VideoType = 'archive' | 'upload' | 'highlight' | 'all';

export interface TwitchVideo {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  url: string;
  thumbnail_url: string;
  duration: string;
  type: VideoType;
  view_count: number;
  download_url?: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

export class TwitchApiService {
  private readonly baseUrl = 'https://api.twitch.tv/helix';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-Id': config.TWITCH_CLIENT_ID,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  }

  private async getCurrentUser(): Promise<TwitchUser> {
    const response = await this.fetchWithAuth<{data: TwitchUser[]}>('/users');
    return response.data[0];
  }

  async getVideos(type: VideoType = 'all'): Promise<TwitchVideo[]> {
    const user = await this.getCurrentUser();
    const typeParam = type === 'all' ? '' : `&type=${type}`;
    const response = await this.fetchWithAuth<{data: TwitchVideo[]}>(`/videos?user_id=${user.id}${typeParam}`);
    
    // Add download URLs to each video
    const videosWithUrls = response.data.map(video => ({
      ...video,
      download_url: `https://www.twitch.tv/videos/${video.id}`
    }));

    return videosWithUrls;
  }
} 