import React, { useEffect, useState } from 'react';
import { Search, Clock, RefreshCw } from 'lucide-react';
import { ProcessedVideo, YouTubeVideo } from '../types/youtube';
import { youtubeApi } from '../services/youtubeApi';
import { cache } from '../services/cache';
import VideoCard from './VideoCard';

interface FeedsListProps {
  accessToken: string;
  selectedChannels: string[];
}

const FeedsList: React.FC<FeedsListProps> = ({ accessToken, selectedChannels }) => {
  const [videos, setVideos] = useState<ProcessedVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<ProcessedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'likes'>('date');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_videos') || '[]'); } catch { return []; }
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [playlists, setPlaylists] = useState<{id: string; title: string}[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('__DEFAULT__');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [videoPlaylists, setVideoPlaylists] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Define o token no serviço antes de carregar os feeds
    if (accessToken) {
      youtubeApi.setAccessToken(accessToken);
    }
    loadFeeds();
    loadPlaylists();
  }, [selectedChannels, accessToken]);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchTerm, sortBy, timeFilter, showSaved, savedIds]);

  const buildAndCacheFeeds = async (channels: string[], limit: number): Promise<ProcessedVideo[]> => {
    const allVideos: YouTubeVideo[] = [];
    for (const channelId of channels) {
      try {
        const resp = await youtubeApi.getChannelVideos(channelId, undefined, limit);
        allVideos.push(...resp.items);
      } catch (e) {
        console.error('Erro ao carregar vídeos do canal', channelId, e);
      }
    }
    const ids = Array.from(new Set(
      allVideos
        .map(v => (v as any).contentDetails?.videoId || (v as any).id || v.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[]
    ));
    const details = await youtubeApi.getVideosDetailsBatch(ids);
    const map: Record<string, any> = {};
    (details.items || []).forEach((it: any) => { map[it.id] = it; });

    const formatted: ProcessedVideo[] = allVideos.map(v => {
      const id = (v as any).contentDetails?.videoId || (v as any).id || v.snippet?.resourceId?.videoId || '';
      const d = map[id];
      return {
        id,
        title: v.snippet?.title || d?.snippet?.title || '',
        description: v.snippet?.description || d?.snippet?.description || '',
        thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || d?.snippet?.thumbnails?.high?.url || '',
        channelTitle: v.snippet?.channelTitle || d?.snippet?.channelTitle || '',
        channelId: v.snippet?.channelId || d?.snippet?.channelId || '',
        publishedAt: v.snippet?.publishedAt || d?.snippet?.publishedAt || '',
        duration: d?.contentDetails?.duration || '',
        viewCount: d?.statistics?.viewCount || '0',
        likeCount: d?.statistics?.likeCount || '0',
        commentCount: d?.statistics?.commentCount || '0'
      };
    }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    try {
      const key = cache.makeKey('feeds-computed', { channels: [...channels].sort(), limit }, undefined);
      cache.set(key, formatted, 10 * 60 * 1000);
      if (selectedChannels.length === 0) {
        cache.set('feeds-computed-all', formatted, 10 * 60 * 1000);
      }
    } catch { /* ignore */ }

    return formatted;
  };

  const loadFeeds = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const limit = 5;

      // 1) Caso "todos os canais" e haja cache pronto, mostra imediatamente antes de qualquer chamada à API
      let usedCachedAll = false;
      if (selectedChannels.length === 0 && !forceRefresh) {
        try {
          const cachedAll = cache.get<ProcessedVideo[]>('feeds-computed-all');
          if (cachedAll && cachedAll.length) {
            setVideos(cachedAll);
            setLoading(false);
            usedCachedAll = true;
          }
        } catch { /* ignore */ }
      }

      const channels = selectedChannels.length > 0 ? selectedChannels : await youtubeApi.getAllSubscriptionsChannelIds();

      if (usedCachedAll) {
        // Atualiza em background sem bloquear a UI
        buildAndCacheFeeds(channels, limit).catch(() => {});
        return;
      }

      // 2) Cache específico do conjunto de canais
      if (!forceRefresh) {
        try {
          const key = cache.makeKey('feeds-computed', { channels: [...channels].sort(), limit }, undefined);
          const cached = cache.get<ProcessedVideo[]>(key);
          if (cached && cached.length) {
            setVideos(cached);
            setLoading(false);
            // Atualiza em background
            buildAndCacheFeeds(channels, limit).catch(() => {});
            return;
          }
        } catch { /* ignore */ }
      }

      // 3) Fluxo normal
      const formatted = await buildAndCacheFeeds(channels, limit);
      setVideos(formatted);
    } catch (error) {
      console.error('Erro ao carregar feeds:', error);
      alert('Erro ao carregar feeds. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVideos = () => {
    let filtered = [...videos];
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.channelTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const now = new Date();
    filtered = filtered.filter(v => {
      const d = new Date(v.publishedAt);
      const days = Math.ceil((now.getTime() - d.getTime()) / (1000*60*60*24));
      if (timeFilter === 'today') return days <= 1;
      if (timeFilter === 'week') return days <= 7;
      if (timeFilter === 'month') return days <= 30;
      return true;
    });
    filtered.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (sortBy === 'views') return parseInt(b.viewCount) - parseInt(a.viewCount);
      if (sortBy === 'likes') return parseInt(b.likeCount) - parseInt(a.likeCount);
      return 0;
    });
    if (showSaved) filtered = filtered.filter(v => savedIds.includes(v.id));
    setFilteredVideos(filtered);
    // carregar membership de playlists para os primeiros itens visíveis
    void ensurePlaylistsMembership(filtered.slice(0, 24).map(v => v.id));
  };

  const toggleSave = (video: ProcessedVideo) => {
    let next = [...savedIds];
    if (next.includes(video.id)) next = next.filter(id => id !== video.id);
    else next.push(video.id);
    setSavedIds(next);
    localStorage.setItem('saved_videos', JSON.stringify(next));

    // Se marcou como salvo, adiciona a playlist escolhida (ou padrão)
    const justSaved = !savedIds.includes(video.id);
    if (justSaved) {
      queueMicrotask(async () => {
        try {
          let playlistId = selectedPlaylistId;
          if (playlistId === '__DEFAULT__') {
            playlistId = await youtubeApi.ensureSavedPlaylist();
          }
          // evita duplicar se já adicionamos recentemente
          const key = `playlist_added_${playlistId}`;
          const added = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
          if (!added.has(video.id)) {
            const res: any = await youtubeApi.addVideoToPlaylist(playlistId, video.id);
            added.add(video.id);
            localStorage.setItem(key, JSON.stringify(Array.from(added)));
            try {
              const mapKey = `playlist_item_map_${playlistId}`;
              const map: Record<string, string> = JSON.parse(localStorage.getItem(mapKey) || '{}');
              const itemId = res?.id;
              if (itemId) { map[video.id] = itemId; localStorage.setItem(mapKey, JSON.stringify(map)); }
            } catch { /* ignore */ }
          }
          // atualiza badges
          await refreshVideoMembership(video.id);
        } catch (e) {
          console.error('Falha ao adicionar vídeo à playlist', e);
        }
      });
    } else {
      // des-salvar: remover da playlist selecionada (ou padrão)
      queueMicrotask(async () => {
        try {
          let playlistId = selectedPlaylistId;
          if (playlistId === '__DEFAULT__') playlistId = await youtubeApi.ensureSavedPlaylist();
          await youtubeApi.removeVideoFromPlaylist(playlistId, video.id);
          await refreshVideoMembership(video.id);
        } catch (e) { console.error('Falha ao remover da playlist', e); }
      });
    }
  };

  const loadPlaylists = async () => {
    try {
      const resp: any = await youtubeApi.getMyPlaylists();
      const items = (resp.items || []).map((p: any) => ({ id: p.id, title: p?.snippet?.title || '' }));
      setPlaylists(items);
    } catch (e) {
      console.error('Erro ao carregar playlists', e);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const created: any = await youtubeApi.createPlaylist(newPlaylistName.trim(), 'Criada pelo app');
      const id = created?.id as string;
      if (id) {
        setPlaylists(prev => [{ id, title: newPlaylistName.trim() }, ...prev]);
        setSelectedPlaylistId(id);
        setNewPlaylistName('');
      }
    } catch (e) {
      console.error('Erro ao criar playlist', e);
    }
  };

  const ensurePlaylistsMembership = async (ids: string[]) => {
    const need = ids.filter(id => videoPlaylists[id] === undefined);
    if (!need.length) return;
    for (const id of need) {
      await refreshVideoMembership(id);
    }
  };

  const refreshVideoMembership = async (videoId: string) => {
    try {
      const resp: any = await youtubeApi.getPlaylistItemsByVideo(videoId);
      const titles: string[] = (resp.items || []).map((it: any) => it?.snippet?.playlistId).filter(Boolean) as string[];
      const nameMap: Record<string, string> = Object.fromEntries(playlists.map(p => [p.id, p.title]));
      const list = Array.from(new Set(titles.map((id: string) => nameMap[id]).filter(Boolean))) as string[];
      setVideoPlaylists(prev => ({ ...prev, [videoId]: list as string[] }));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-youtube-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock size={28} />
            Últimos Feeds
          </h2>
          <p className="text-gray-400">{videos.length} vídeos carregados</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar vídeos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowSaved(s => !s)} className={`px-4 py-3 rounded-lg border ${showSaved ? 'bg-youtube-red border-youtube-red text-white' : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'}`}>{showSaved ? 'Mostrando Salvos' : 'Mostrar Salvos'}</button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'views' | 'likes')} className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none">
            <option value="date">Mais Recentes</option>
            <option value="views">Mais Visualizados</option>
            <option value="likes">Mais Curtidos</option>
          </select>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as 'all' | 'today' | 'week' | 'month')} className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none">
            <option value="all">Todos os Tempos</option>
            <option value="today">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-3 rounded-lg border ${viewMode==='grid' ? 'bg-youtube-red border-youtube-red text-white' : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'}`}>Quadros</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-3 rounded-lg border ${viewMode==='list' ? 'bg-youtube-red border-youtube-red text-white' : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'}`}>Lista</button>
          </div>
          <button onClick={() => loadFeeds(true)} disabled={loading} className="px-4 py-3 rounded-lg border bg-youtube-gray text-white border-gray-600 disabled:opacity-50 flex items-center gap-2">
            <RefreshCw size={18} className={`${loading ? 'animate-spin' : ''}`}/>
            Atualizar feeds
          </button>
        </div>

        {/* Controles de playlist para salvar */}
        <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Salvar em:</span>
            <select value={selectedPlaylistId} onChange={(e) => setSelectedPlaylistId(e.target.value)} className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600">
              <option value="__DEFAULT__">Vídeos salvos (padrão)</option>
              {playlists.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="Nova playlist..." className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600" />
            <button onClick={createPlaylist} className="px-3 py-2 rounded bg-youtube-red text-white">Criar</button>
          </div>
        </div>
      </div>

      <div className={viewMode==='grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-3'}>
        {filteredVideos.map(video => (
          viewMode==='grid' ? (
            <div key={video.id}>
              <VideoCard video={video} onSave={() => toggleSave(video)} isSaved={savedIds.includes(video.id)} />
              {videoPlaylists[video.id]?.length ? (
                <div className="mt-1 text-xs text-gray-400">Em playlists: {videoPlaylists[video.id].join(', ')}</div>
              ) : null}
            </div>
          ) : (
            <div key={video.id} className="flex items-center gap-3 bg-youtube-gray border border-gray-700 rounded p-3">
              <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded" />
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold truncate">{video.title}</div>
                <div className="text-sm text-gray-400 truncate">{video.channelTitle}</div>
                <div className="text-xs text-gray-500">{new Date(video.publishedAt).toLocaleString('pt-BR')}</div>
                {videoPlaylists[video.id]?.length ? (
                  <div className="text-[11px] text-gray-400">Em playlists: {videoPlaylists[video.id].join(', ')}</div>
                ) : null}
              </div>
              <button onClick={() => toggleSave(video)} className={`text-sm px-3 py-1 rounded ${savedIds.includes(video.id) ? 'bg-youtube-red text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}>{savedIds.includes(video.id) ? 'Salvo' : 'Ver depois'}</button>
              <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-youtube-red">Abrir</a>
            </div>
          )
        ))}
      </div>

      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <Clock size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Nenhum vídeo encontrado</h3>
          <p className="text-gray-500">{searchTerm ? 'Tente ajustar sua busca' : 'Selecione alguns canais para ver os feeds'}</p>
        </div>
      )}
    </div>
  );
};

export default FeedsList;
