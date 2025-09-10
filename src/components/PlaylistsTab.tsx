import React, { useEffect, useState } from 'react';
import { youtubeApi } from '../services/youtubeApi';
import { ProcessedVideo } from '../types/youtube';
import VideoCard from './VideoCard';

interface Playlist { id: string; title: string; itemCount: number; }

const PlaylistsTab: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [videos, setVideos] = useState<ProcessedVideo[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const list: Playlist[] = [];
      let token: string | undefined = undefined;
      do {
        const resp: any = await youtubeApi.getMyPlaylists(token);
        (resp.items || []).forEach((p: any) => list.push({ id: p.id, title: p?.snippet?.title || '', itemCount: p?.contentDetails?.itemCount || 0 }));
        token = resp.nextPageToken;
      } while (token);
      setPlaylists(list);
    } catch (e) { console.error('Erro ao carregar playlists', e); }
    finally { setLoading(false); }
  };

  const openPlaylist = async (id: string) => {
    try {
      setSelectedId(id);
      const list: any[] = [];
      let token: string | undefined = undefined;
      do {
        const resp: any = await youtubeApi.getPlaylistItems(id, token, 50);
        list.push(...(resp.items || []));
        token = resp.nextPageToken;
      } while (token);
      // Enriquecer com details para manter o mesmo padrão do restante
      const ids = Array.from(new Set(
        list
          .map((it: any) => it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId)
          .filter(Boolean)
      ));
      const details = await youtubeApi.getVideosDetailsBatch(ids as string[]);
      const map: Record<string, any> = {};
      (details.items || []).forEach((d: any) => { map[d.id] = d; });
      const vids: ProcessedVideo[] = list.map((it: any) => {
        const id = it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || '';
        const d = map[id] || {};
        return {
          id,
          title: it?.snippet?.title || d?.snippet?.title || '',
          description: it?.snippet?.description || d?.snippet?.description || '',
          thumbnail: it?.snippet?.thumbnails?.high?.url || it?.snippet?.thumbnails?.medium?.url || d?.snippet?.thumbnails?.high?.url || '',
          channelTitle: it?.snippet?.channelTitle || d?.snippet?.channelTitle || '',
          channelId: it?.snippet?.channelId || d?.snippet?.channelId || '',
          publishedAt: it?.snippet?.publishedAt || d?.snippet?.publishedAt || '',
          duration: d?.contentDetails?.duration || '',
          viewCount: d?.statistics?.viewCount || '0',
          likeCount: d?.statistics?.likeCount || '0',
          commentCount: d?.statistics?.commentCount || '0'
        } as ProcessedVideo;
      });
      setVideos(vids);
    } catch (e) { console.error('Erro ao carregar itens', e); }
  };

  const create = async () => {
    if (!newName.trim()) return; 
    try {
      setCreating(true);
      await youtubeApi.createPlaylist(newName.trim(), 'Criada no app');
      setNewName('');
      await loadPlaylists();
    } finally { setCreating(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-youtube-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova playlist..." className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600" />
        <button onClick={create} disabled={creating} className="px-3 py-2 rounded bg-youtube-red text-white disabled:opacity-50">Criar</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {playlists.map(p => (
          <div key={p.id} onClick={() => openPlaylist(p.id)} className={`relative cursor-pointer text-left bg-youtube-gray border border-gray-700 rounded p-4 hover:bg-gray-700 ${selectedId===p.id ? 'ring-1 ring-youtube-red' : ''}`}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{p.title}</div>
                <div className="text-gray-400 text-sm">{p.itemCount} vídeos</div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Excluir a playlist "${p.title}"?`)) return;
                  try {
                    await youtubeApi.deletePlaylist(p.id);
                    setPlaylists(prev => prev.filter(x => x.id !== p.id));
                    if (selectedId === p.id) { setSelectedId(null); setVideos([]); }
                    try {
                      localStorage.removeItem(`playlist_id_by_name_${p.title}`);
                      localStorage.removeItem(`playlist_item_map_${p.id}`);
                      localStorage.removeItem(`playlist_added_${p.id}`);
                    } catch {}
                  } catch (err) {
                    console.error('Falha ao excluir playlist', err);
                    alert('Não foi possível excluir a playlist.');
                  }
                }}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                title="Excluir playlist"
              >Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {selectedId && (
        <div className="mt-6">
          <h3 className="text-white font-semibold mb-3">Itens da playlist</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl-grid-cols-3 gap-6">
            {videos.map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistsTab;
