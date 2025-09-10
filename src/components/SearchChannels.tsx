import React, { useEffect, useMemo, useState } from 'react';
import { youtubeApi } from '../services/youtubeApi';

interface SearchChannelsProps {
  accessToken: string;
}

interface SearchResult {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
}

const SearchChannels: React.FC<SearchChannelsProps> = ({ accessToken }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [displayed, setDisplayed] = useState<SearchResult[]>([]);
  const [details, setDetails] = useState<Record<string, { subscriberCount: number; videoCount: number }>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  // Opções avançadas
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title' | 'subscribers' | 'videos'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minSubscribers, setMinSubscribers] = useState<number>(0);
  const [minVideos, setMinVideos] = useState<number>(0);
  const [regionCode, setRegionCode] = useState<string>('');
  const [safeSearch, setSafeSearch] = useState<'none' | 'moderate' | 'strict'>('none');

  useEffect(() => {
    // Garante que o serviço esteja com o token atualizado
    if (accessToken) {
      youtubeApi.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const search = async (token?: string) => {
    try {
      setLoading(true);
      const orderParam = sortBy === 'date' || sortBy === 'title' || sortBy === 'relevance' ? sortBy : 'relevance';
      const resp: any = await youtubeApi.searchChannels(query, token, {
        order: orderParam,
        regionCode: regionCode || undefined,
        safeSearch
      });
      const mapped: SearchResult[] = (resp.items || []).map((it: any) => ({
        channelId: it?.id?.channelId,
        title: it?.snippet?.title,
        description: it?.snippet?.description,
        thumbnail: it?.snippet?.thumbnails?.medium?.url || it?.snippet?.thumbnails?.default?.url
      })).filter((r: SearchResult) => !!r.channelId);
      const next = token ? [...results, ...mapped] : mapped;
      setResults(next);
      await ensureDetails(next.map(r => r.channelId));
      applyFilters(next);
      setNextPageToken(resp.nextPageToken);
      setPageToken(token);
    } catch (e) {
      console.error('Erro na busca de canais', e);
      alert('Erro na busca. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const ensureDetails = async (ids: string[]) => {
    const missing = ids.filter(id => details[id] === undefined);
    if (missing.length === 0) return;
    try {
      const resp = await youtubeApi.getChannelsDetailsBatch(missing);
      const map: Record<string, { subscriberCount: number; videoCount: number }> = {};
      (resp.items || []).forEach((it: any) => {
        map[it.id] = {
          subscriberCount: parseInt(it?.statistics?.subscriberCount || '0'),
          videoCount: parseInt(it?.statistics?.videoCount || '0')
        };
      });
      setDetails(prev => ({ ...prev, ...map }));
    } catch (e) {
      console.error('Erro ao obter detalhes de canais', e);
    }
  };

  const applyFilters = (base: SearchResult[] = results) => {
    // aplica filtros
    let out = base.filter(r => {
      const st = details[r.channelId];
      const subsOk = (st?.subscriberCount ?? 0) >= (minSubscribers || 0);
      const vidsOk = (st?.videoCount ?? 0) >= (minVideos || 0);
      return subsOk && vidsOk;
    });

    // ordena
    const dir = sortOrder === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'subscribers') {
        const sa = details[a.channelId]?.subscriberCount ?? 0;
        const sb = details[b.channelId]?.subscriberCount ?? 0;
        return (sa - sb) * dir;
      }
      if (sortBy === 'videos') {
        const va = details[a.channelId]?.videoCount ?? 0;
        const vb = details[b.channelId]?.videoCount ?? 0;
        return (va - vb) * dir;
      }
      // relevance/date são do backend; mantém a ordem retornada
      return 0;
    });
    setDisplayed(out);
  };

  useEffect(() => {
    applyFilters(results);
  }, [sortBy, sortOrder, minSubscribers, minVideos, details]);

  const toggle = (id: string) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const followSelected = async () => {
    const ids = Object.keys(selected).filter(id => selected[id]);
    if (!ids.length) { alert('Selecione ao menos um canal.'); return; }
    try {
      setLoading(true);
      for (const id of ids) {
        try { await youtubeApi.subscribe(id); } catch (e) { console.error('Falha ao seguir', id, e); }
      }
      alert('Canais seguidos com sucesso!');
    } catch (e) {
      console.error('Erro ao seguir canais', e);
      alert('Erro ao seguir alguns canais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar canais..."
          className="flex-1 px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
        />
        <button onClick={() => search(undefined)} className="px-4 py-3 rounded-lg bg-youtube-red text-white">Buscar</button>
        {nextPageToken && <button onClick={() => search(nextPageToken)} className="px-4 py-3 rounded-lg bg-youtube-gray text-white border border-gray-600">Mais</button>}
        <button onClick={followSelected} disabled={loading} className="px-4 py-3 rounded-lg bg-youtube-gray text-white border border-gray-600 disabled:opacity-50">Seguir selecionados</button>
      </div>

      {/* Opções avançadas */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch">
        <div className="flex gap-2 flex-1">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600">
            <option value="relevance">Relevância (API)</option>
            <option value="date">Mais recentes (API)</option>
            <option value="title">Nome (A→Z)</option>
            <option value="subscribers">Inscritos</option>
            <option value="videos">Qtd. de vídeos</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <input type="number" min={0} value={minSubscribers} onChange={(e) => setMinSubscribers(parseInt(e.target.value || '0', 10))} placeholder="Mín. inscritos" className="w-36 px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600" />
          <input type="number" min={0} value={minVideos} onChange={(e) => setMinVideos(parseInt(e.target.value || '0', 10))} placeholder="Mín. vídeos" className="w-32 px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600" />
        </div>
        <div className="flex gap-2">
          <input value={regionCode} onChange={(e) => setRegionCode(e.target.value.toUpperCase())} placeholder="Região (ex: BR)" className="w-32 px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600" />
          <select value={safeSearch} onChange={(e) => setSafeSearch(e.target.value as any)} className="px-3 py-2 bg-youtube-gray text-white rounded border border-gray-600">
            <option value="none">SafeSearch: nenhum</option>
            <option value="moderate">moderate</option>
            <option value="strict">strict</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-youtube-red"></div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayed.map(r => (
          <label key={r.channelId} className="bg-youtube-gray rounded-lg p-4 border border-gray-700 cursor-pointer">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={!!selected[r.channelId]} onChange={() => toggle(r.channelId)} className="mt-1" />
              <img src={r.thumbnail} alt={r.title} className="w-12 h-12 rounded" />
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{r.title}</div>
                <div className="text-[11px] text-gray-500 break-all">{r.channelId}</div>
                <div className="text-gray-400 text-sm line-clamp-2 mt-1">{r.description}</div>
                <div className="text-xs text-gray-500 mt-1">Inscritos: {details[r.channelId]?.subscriberCount ?? '—'} • Vídeos: {details[r.channelId]?.videoCount ?? '—'}</div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SearchChannels;
