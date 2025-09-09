import axios from 'axios';
import { YouTubeApiResponse, YouTubeSubscription, YouTubeVideo } from '../types/youtube';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

class YouTubeApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Access token não encontrado. Faça login primeiro.');
    }

    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      params: {
        ...params,
        access_token: this.accessToken,
        key: process.env.REACT_APP_YOUTUBE_API_KEY
      }
    });

    return response.data;
  }

  async getSubscriptions(pageToken?: string): Promise<YouTubeApiResponse<YouTubeSubscription>> {
    return this.makeRequest<YouTubeApiResponse<YouTubeSubscription>>('/subscriptions', {
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
      pageToken
    });
  }

  async getChannelDetails(channelId: string) {
    return this.makeRequest('/channels', {
      part: 'snippet,statistics',
      id: channelId
    });
  }

  async getChannelVideos(channelId: string, pageToken?: string): Promise<YouTubeApiResponse<YouTubeVideo>> {
    // Primeiro, obtemos os uploads do canal
    const channelResponse = await this.makeRequest('/channels', {
      part: 'contentDetails',
      id: channelId
    });

    const uploadsPlaylistId = (channelResponse as any).items[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Playlist de uploads não encontrada para este canal');
    }

    // Depois, obtemos os vídeos da playlist de uploads
    return this.makeRequest<YouTubeApiResponse<YouTubeVideo>>('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken
    });
  }

  async getVideoDetails(videoId: string) {
    return this.makeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });
  }

  async searchVideos(query: string, channelId?: string) {
    return this.makeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      channelId,
      maxResults: 50
    });
  }
}

export const youtubeApi = new YouTubeApiService();