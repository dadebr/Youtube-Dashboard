import axios from 'axios';
import { YouTubeApiResponse, YouTubeSubscription, YouTubeVideo } from '../types/youtube';
import { cache } from './cache';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

class YouTubeApiService {
  private accessToken: string | null = null;
  private savedPlaylistCacheKey = 'yt_saved_playlist_id_v1';

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Access token não encontrado. Faça login primeiro.');
    }

    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      params: {
        ...params
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    return response.data;
  }

  private async makeCachedRequest<T>(endpoint: string, params: Record<string, any>, ttlMs: number): Promise<T> {
    const key = cache.makeKey(endpoint, params, this.accessToken || undefined);
    const cached = cache.get<T>(key);
    if (cached) return cached;
    const data = await this.makeRequest<T>(endpoint, params);
    cache.set(key, data, ttlMs);
    return data;
  }

  async getSubscriptions(pageToken?: string): Promise<YouTubeApiResponse<YouTubeSubscription>> {
    return this.makeCachedRequest<YouTubeApiResponse<YouTubeSubscription>>('/subscriptions', {
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
      pageToken
    }, 5 * 60 * 1000);
  }

  async getChannelDetails(channelId: string) {
    return this.makeCachedRequest('/channels', {
      part: 'snippet,statistics',
      id: channelId
    }, 10 * 60 * 1000);
  }

  async getChannelsDetailsBatch(channelIds: string[]): Promise<any> {
    if (!channelIds.length) return { items: [] };
    const chunks: string[][] = [];
    for (let i = 0; i < channelIds.length; i += 50) {
      chunks.push(channelIds.slice(i, i + 50));
    }
    const results = await Promise.all(chunks.map(ids => this.makeCachedRequest('/channels', {
      part: 'snippet,statistics',
      id: ids.join(',')
    }, 10 * 60 * 1000)));
    return { items: results.flatMap((r: any) => r.items) };
  }

  async getChannelVideos(channelId: string, pageToken?: string, maxResults: number = 50): Promise<YouTubeApiResponse<YouTubeVideo>> {
    // Primeiro, obtemos os uploads do canal
    const channelResponse = await this.makeCachedRequest('/channels', {
      part: 'contentDetails',
      id: channelId
    }, 10 * 60 * 1000);

    const uploadsPlaylistId = (channelResponse as any).items[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Playlist de uploads não encontrada para este canal');
    }

    // Depois, obtemos os vídeos da playlist de uploads
    return this.makeCachedRequest<YouTubeApiResponse<YouTubeVideo>>('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults,
      pageToken
    }, 5 * 60 * 1000);
  }

  async getVideoDetails(videoId: string) {
    return this.makeCachedRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    }, 5 * 60 * 1000);
  }

  async getVideosDetailsBatch(videoIds: string[]): Promise<any> {
    if (!videoIds.length) return { items: [] };
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }
    const results = await Promise.all(chunks.map(ids => this.makeCachedRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: ids.join(',')
    }, 5 * 60 * 1000)));
    return { items: results.flatMap((r: any) => r.items) };
  }

  async getAllSubscriptionsChannelIds(): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const resp: any = await this.getSubscriptions(pageToken);
      resp.items?.forEach((s: any) => {
        const id = s?.snippet?.resourceId?.channelId;
        if (id) ids.push(id);
      });
      pageToken = resp.nextPageToken;
    } while (pageToken);
    // Garante IDs únicos
    return Array.from(new Set(ids));
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

  async searchChannels(
    query: string,
    pageToken?: string,
    opts?: { order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount'; regionCode?: string; maxResults?: number; safeSearch?: 'none' | 'moderate' | 'strict' }
  ) {
    return this.makeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'channel',
      maxResults: opts?.maxResults ?? 50,
      pageToken,
      order: opts?.order,
      regionCode: opts?.regionCode,
      safeSearch: opts?.safeSearch
    });
  }

  // Playlists
  async getMyPlaylists(pageToken?: string) {
    return this.makeRequest('/playlists', {
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: 50,
      pageToken
    });
  }

  async getPlaylistItems(playlistId: string, pageToken?: string, maxResults: number = 50) {
    return this.makeRequest('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults,
      pageToken
    });
  }

  async createPlaylist(title: string, description = '', privacyStatus: 'private' | 'public' | 'unlisted' = 'private') {
    const url = `${API_BASE_URL}/playlists`;
    const response = await axios.post(url, {
      snippet: { title, description },
      status: { privacyStatus }
    }, {
      params: { part: 'snippet,status' },
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return response.data;
  }

  async addVideoToPlaylist(playlistId: string, videoId: string) {
    const url = `${API_BASE_URL}/playlistItems`;
    const response = await axios.post(url, {
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId }
      }
    }, {
      params: { part: 'snippet' },
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return response.data;
  }

  async deletePlaylist(playlistId: string) {
    const url = `${API_BASE_URL}/playlists`;
    const response = await axios.delete(url, {
      params: { id: playlistId },
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return response.data;
  }

  async getPlaylistItemsByVideo(videoId: string, pageToken?: string) {
    return this.makeRequest('/playlistItems', {
      part: 'id,snippet,contentDetails',
      videoId,
      maxResults: 50,
      pageToken
    });
  }

  async deletePlaylistItem(playlistItemId: string) {
    const url = `${API_BASE_URL}/playlistItems`;
    const response = await axios.delete(url, {
      params: { id: playlistItemId },
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    return response.data;
  }

  async removeVideoFromPlaylist(playlistId: string, videoId: string) {
    // Primeiro tenta via cache local de items
    try {
      const mapKey = `playlist_item_map_${playlistId}`;
      const raw = localStorage.getItem(mapKey);
      if (raw) {
        const map: Record<string, string> = JSON.parse(raw);
        const itemId = map[videoId];
        if (itemId) {
          await this.deletePlaylistItem(itemId);
          delete map[videoId];
          localStorage.setItem(mapKey, JSON.stringify(map));
          return;
        }
      }
    } catch { /* ignore cache errors */ }

    // Fallback: busca os playlistItems pelo videoId e deleta os que pertencem à playlist alvo
    let token: string | undefined = undefined;
    do {
      const resp: any = await this.getPlaylistItemsByVideo(videoId, token);
      const items = (resp.items || []).filter((it: any) => it?.snippet?.playlistId === playlistId);
      for (const it of items) {
        await this.deletePlaylistItem(it.id);
      }
      token = resp.nextPageToken;
    } while (token);
  }

  async getOrCreatePlaylistByName(title: string): Promise<string> {
    // tenta cache local
    const cacheKey = `playlist_id_by_name_${title}`;
    const local = localStorage.getItem(cacheKey);
    if (local) return local;
    let token: string | undefined = undefined;
    do {
      const resp: any = await this.getMyPlaylists(token);
      const found = (resp.items || []).find((p: any) => (p?.snippet?.title || '').toLowerCase() === title.toLowerCase());
      if (found?.id) {
        localStorage.setItem(cacheKey, found.id);
        return found.id;
      }
      token = resp.nextPageToken;
    } while (token);
    const created: any = await this.createPlaylist(title, 'Playlist gerada automaticamente', 'private');
    const id = created?.id as string;
    if (id) localStorage.setItem(cacheKey, id);
    return id;
  }

  async ensureSavedPlaylist(): Promise<string> {
    const name = 'Vídeos salvos';
    return this.getOrCreatePlaylistByName(name);
  }

  async subscribe(channelId: string) {
    const url = `${API_BASE_URL}/subscriptions`;
    const response = await axios.post(url, {
      snippet: { resourceId: { kind: 'youtube#channel', channelId } }
    }, {
      params: {
        part: 'snippet'
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });
    return response.data;
  }

  async unsubscribe(subscriptionId: string) {
    const url = `${API_BASE_URL}/subscriptions`;
    const response = await axios.delete(url, {
      params: {
        id: subscriptionId
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });
    return response.data;
  }
}

export const youtubeApi = new YouTubeApiService();
