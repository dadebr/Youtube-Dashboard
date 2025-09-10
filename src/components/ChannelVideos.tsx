import React, { useEffect, useState } from 'react';
import { youtubeApi } from '../services/youtubeApi';
import VideoCard from './VideoCard';

interface ChannelVideosProps {
  accessToken: string;
}

interface ChannelOption { id: string; title: string; }

const ChannelVideos: React.FC<ChannelVideosProps> = ({ accessToken }) => {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_videos') || '[]'); } catch { return []; }
  });
  const [playlists, setPlaylists] = useState<{id: string; title: string}[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('__DEFAULT__');
  const [videoPlaylists, setVideoPlaylists] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (accessToken) youtubeApi.setAccessToken(accessToken);
    loadChannels();
  }, [accessToken]);

  useEffect(() => {
    if (selectedLocal.length) loadVideosMulti(selectedLocal);
  }, [selectedLocal, pageSize]);

  const loadChannels = async () => {
    try {
      const list: ChannelOption[] = [];
      let token: string | undefined = undefined;
      do {
        const resp: any = await youtubeApi.getSubscriptions(token);
        resp.items?.forEach((s: any) => {
          const id = s?.snippet?.resourceId?.channelId;
          const title = s?.snippet?.title;
          if (id && title) list.push({ id, title });
        });
        token = resp.nextPageToken;
      } while (token);
      const uniq = Array.from(new Map(list.map(ch => [ch.id, ch])).values());
      setChannels(uniq);
    } catch (e) { console.error('Erro ao carregar canais', e); }
    try {
      const resp: any = await youtubeApi.getMyPlaylists();
      const items = (resp.items || []).map((p: any) => ({ id: p.id, title: p?.snippet?.title || '' }));
      setPlaylists(items);
    } catch { /* ignore */ }
  };

  const loadVideosMulti = async (ids: string[]) => {
    try {
      setLoading(true);
      const all: any[] = [];
      for (const id of ids) {
        try {
          const resp: any = await youtubeApi.getChannelVideos(id, undefined, Math.min(pageSize, 50));
          all.push(...(resp.items || []));
        } catch (e) { console.error('Canal falhou', id, e); }
      }
      setVideos(all);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => setSelectedLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const refreshVideoMembership = async (videoId: string) => {
    try {
      const resp: any = await youtubeApi.getPlaylistItemsByVideo(videoId);
      const ids: string[] = (resp.items || []).map((it: any) => it?.snippet?.playlistId).filter(Boolean) as string[];
      const nameMap: Record<string, string> = Object.fromEntries(playlists.map(p => [p.id, p.title]));
      const list = Array.from(new Set(ids.map((pid: string) => nameMap[pid]).filter(Boolean))) as string[];
      setVideoPlaylists(prev => ({ ...prev, [videoId]: list as string[] }));
    } catch {}
  };

  const toggleSave = (vid: any) => {
    const id = (vid as any).contentDetails?.videoId || vid.id || vid.snippet?.resourceId?.videoId;
    if (!id) return;
    let next = [...savedIds];
    const isSaved = next.includes(id);
    if (isSaved) next = next.filter(v => v !== id); else next.push(id);
    setSavedIds(next);
    localStorage.setItem('saved_videos', JSON.stringify(next));
    if (!isSaved) {
      queueMicrotask(async () => {
        try {
          let playlistId = selectedPlaylistId === '__DEFAULT__' ? await youtubeApi.ensureSavedPlaylist() : selectedPlaylistId;
          const key = `playlist_added_${playlistId}`;
          const added = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
          if (!added.has(id)) {
            const res: any = await youtubeApi.addVideoToPlaylist(playlistId, id);
            added.add(id);
            localStorage.setItem(key, JSON.stringify(Array.from(added)));
            try {
              const mapKey = `playlist_item_map_${playlistId}`;
              const map: Record<string, string> = JSON.parse(localStorage.getItem(mapKey) || '{}');
              const itemId = res?.id; if (itemId) { map[id] = itemId; localStorage.setItem(mapKey, JSON.stringify(map)); }
            } catch { /* ignore */ }
          }
          await refreshVideoMembership(id);
        } catch (e) { console.error('Falha ao adicionar à playlist', e); }
      });
    } else {
      queueMicrotask(async () => {
        try {
          let playlistId = selectedPlaylistId === '__DEFAULT__' ? await youtubeApi.ensureSavedPlaylist() : selectedPlaylistId;
          await youtubeApi.removeVideoFromPlaylist(playlistId, id);
          await refreshVideoMembership(id);
        } catch (e) { console.error('Falha ao remover da playlist', e); }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 max-h-64 overflow-auto bg-youtube-gray border border-gray-700 rounded p-2">
            {channels.map(ch => (
              <label key={ch.id} className="flex items-center gap-2 text-gray-300 text-sm py-1">
                <input type="checkbox" checked={selectedLocal.includes(ch.id)} onChange={() => toggle(ch.id)} />
                <span className="truncate">{ch.title}</span>
              </label>
            ))}
          </div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          >
            {[5,10,20,50].map(n => (
              <option key={n} value={n}>{n} por canal</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Salvar em:</span>
            <select value={selectedPlaylistId} onChange={(e) => setSelectedPlaylistId(e.target.value)} className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600">
              <option value="__DEFAULT__">Vídeos salvos (padrão)</option>
              {playlists.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadVideosMulti(selectedLocal)} disabled={!selectedLocal.length} className="px-4 py-3 rounded-lg border bg-youtube-gray text-white disabled:opacity-50">Carregar</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-youtube-red"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map((v: any) => (
            <div key={(v as any).contentDetails?.videoId || v.id}>
              <VideoCard
              video={{
                id: (v as any).contentDetails?.videoId || v.id || v.snippet?.resourceId?.videoId,
                title: v.snippet?.title || '',
                description: v.snippet?.description || '',
                thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || '',
                channelTitle: v.snippet?.channelTitle || '',
                channelId: v.snippet?.channelId || '',
                publishedAt: v.snippet?.publishedAt || '',
                duration: '',
                viewCount: '0',
                likeCount: '0',
                commentCount: '0'
              }}
              onSave={() => toggleSave(v)}
              isSaved={savedIds.includes((v as any).contentDetails?.videoId || v.id)}
            />
            {(() => { const id = (v as any).contentDetails?.videoId || v.id; return videoPlaylists[id]?.length ? (<div className="mt-1 text-xs text-gray-400">Em playlists: {videoPlaylists[id].join(', ')}</div>) : null; })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelVideos;
