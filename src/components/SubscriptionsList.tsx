import React, { useState, useEffect } from 'react';
import { Search, Users, Eye, EyeOff } from 'lucide-react';
import { YouTubeSubscription } from '../types/youtube';
import { youtubeApi } from '../services/youtubeApi';
import SubscriptionCard from './SubscriptionCard';

interface SubscriptionsListProps {
  accessToken: string;
  onChannelSelect: (channelId: string, selected: boolean) => void;
  selectedChannels: string[];
}

const SubscriptionsList: React.FC<SubscriptionsListProps> = ({ accessToken, onChannelSelect, selectedChannels }) => {
  const [subscriptions, setSubscriptions] = useState<YouTubeSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<YouTubeSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'subscribers'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [channelStats, setChannelStats] = useState<Record<string, { subscriberCount: number }>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pageNumber, setPageNumber] = useState(1);
  const [prevToken, setPrevToken] = useState<string | undefined>(undefined);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const inFlightRef = React.useRef(false);

  // Restaura preferências do usuário ao montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem('subs_prefs_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.searchTerm === 'string') setSearchTerm(p.searchTerm);
        if (typeof p.showHidden === 'boolean') setShowHidden(p.showHidden);
        if (p.sortBy === 'name' || p.sortBy === 'date' || p.sortBy === 'subscribers') setSortBy(p.sortBy);
        if (p.sortOrder === 'asc' || p.sortOrder === 'desc') setSortOrder(p.sortOrder);
        if (p.viewMode === 'grid' || p.viewMode === 'list') setViewMode(p.viewMode);
      }
    } catch { /* ignore */ }
  }, []);

  // Persiste preferências sempre que alteradas
  useEffect(() => {
    const prefs = { searchTerm, showHidden, sortBy, sortOrder, viewMode };
    try { localStorage.setItem('subs_prefs_v1', JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [searchTerm, showHidden, sortBy, sortOrder, viewMode]);

  const selectedCount = selectedChannels.length;
  const pageSelectedCount = filteredSubscriptions.filter(s => selectedChannels.includes(s.snippet.resourceId.channelId)).length;

  const selectAllPage = () => {
    filteredSubscriptions.forEach(s => {
      const id = s.snippet.resourceId.channelId;
      if (!selectedChannels.includes(id)) onChannelSelect(id, true);
    });
  };

  const clearSelectionPage = () => {
    filteredSubscriptions.forEach(s => {
      const id = s.snippet.resourceId.channelId;
      if (selectedChannels.includes(id)) onChannelSelect(id, false);
    });
  };

  useEffect(() => {
    // Garante que o token esteja definido no serviço antes de requisitar
    if (accessToken) {
      youtubeApi.setAccessToken(accessToken);
    }
    loadSubscriptions();
  }, [accessToken]);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchTerm, showHidden, sortBy, sortOrder, channelStats]);

  const loadSubscriptions = async (pageToken?: string) => {
    if (inFlightRef.current) return;
    try {
      inFlightRef.current = true;
      setLoading(pageToken ? false : true);
      setLoadingMore(!!pageToken);
      
      const response = await youtubeApi.getSubscriptions(pageToken);
      
      const append = (prev: YouTubeSubscription[]) => dedupeByChannelId([...prev, ...(response.items || [])]);
      if (pageToken) {
        setSubscriptions(prev => append(prev));
      } else {
        setSubscriptions(dedupeByChannelId(response.items || []));
      }
      
      setNextPageToken(response.nextPageToken);
      // prevPageToken pode vir undefined na primeira página
      // @ts-ignore
      setPrevToken((response as any).prevPageToken);
      if (sortBy === 'subscribers') {
        const ids = response.items.map((s: any) => s.snippet.resourceId.channelId);
        await ensureStats(ids);
      }
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      alert('Erro ao carregar inscrições. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  };

  const ensureStats = async (ids: string[]) => {
    const missing = ids.filter(id => channelStats[id] === undefined);
    if (missing.length === 0) return;
    try {
      const details = await youtubeApi.getChannelsDetailsBatch(missing);
      const map: Record<string, { subscriberCount: number }> = {};
      (details.items || []).forEach((item: any) => {
        map[item.id] = { subscriberCount: parseInt(item.statistics?.subscriberCount || '0') };
      });
      setChannelStats(prev => ({ ...prev, ...map }));
    } catch (e) {
      console.error('Erro ao carregar estatísticas dos canais', e);
    }
  };

  const filterSubscriptions = () => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.snippet.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!showHidden) {
      // Aqui você pode implementar lógica para ocultar canais específicos
      // Por enquanto, mostra todos
    }

    // Ordenação
    const dir = sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.snippet.title.localeCompare(b.snippet.title) * dir;
      }
      if (sortBy === 'date') {
        return (new Date(a.snippet.publishedAt).getTime() - new Date(b.snippet.publishedAt).getTime()) * dir;
      }
      if (sortBy === 'subscribers') {
        const sa = channelStats[a.snippet.resourceId.channelId]?.subscriberCount ?? 0;
        const sb = channelStats[b.snippet.resourceId.channelId]?.subscriberCount ?? 0;
        return (sa - sb) * dir;
      }
      return 0;
    });

    setFilteredSubscriptions(filtered);
  };

  const loadMore = () => {
    if (nextPageToken && !loadingMore) {
      loadSubscriptions(nextPageToken);
    }
  };

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadMore();
      }
    }, { root: null, rootMargin: '300px', threshold: 0 });
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [nextPageToken, loadingMore]);

  // Compatibilidade: handlers usados pelo layout antigo
  const nextPage = () => loadMore();
  const prevPage = () => undefined;

  const handleBulkUnsubscribe = async () => {
    const selectedSet = new Set(selectedChannels);
    const toUnsub = subscriptions.filter(s => selectedSet.has(s.snippet.resourceId.channelId));
    if (!toUnsub.length) { alert('Selecione ao menos um canal.'); return; }
    if (!confirm(`Desinscrever ${toUnsub.length} canal(is)?`)) return;
    try {
      setUnsubscribing(true);
      for (const s of toUnsub) {
        try { await youtubeApi.unsubscribe(s.id); } catch (e) { console.error('Falha ao desinscrever', s.id, e); }
      }
      setSubscriptions(prev => prev.filter(s => !selectedSet.has(s.snippet.resourceId.channelId)));
      setFilteredSubscriptions(prev => prev.filter(s => !selectedSet.has(s.snippet.resourceId.channelId)));
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleUnsubscribe = async (sub: YouTubeSubscription) => {
    try {
      if (!confirm(`Desinscrever de "${sub.snippet.title}"?`)) return;
      await youtubeApi.unsubscribe(sub.id);
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      setFilteredSubscriptions(prev => prev.filter(s => s.id !== sub.id));
    } catch (e) {
      console.error('Erro ao desinscrever:', e);
      alert('Não foi possível desinscrever.');
    }
  };

  const exportCsv = () => {
    const header = ['channel_id','nome','inscritos','data_inscricao'];
    const rows = filteredSubscriptions.map(sub => {
      const id = sub.snippet.resourceId.channelId;
      const nome = sub.snippet.title.replace(/\n/g, ' ').replace(/"/g, '""');
      const inscritos = channelStats[id]?.subscriberCount ?? '';
      const data = sub.snippet.publishedAt;
      return [id, nome, inscritos, data];
    });
    const csv = [header, ...rows]
      .map(cols => cols.map(val => `"${String(val ?? '')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportCsvFilename();
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyRssUrls = async () => {
    const ids = selectedChannels.length > 0
      ? selectedChannels
      : filteredSubscriptions.map(s => s.snippet.resourceId.channelId);
    if (ids.length === 0) {
      alert('Selecione ao menos um canal ou ajuste o filtro.');
      return;
    }
    const urls = ids.map(id => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`).join('\n');
    try {
      await navigator.clipboard.writeText(urls);
      alert('URLs RSS copiadas para a área de transferência.');
    } catch {
      // Fallback
      prompt('Copie as URLs abaixo:', urls);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={28} />
            Minhas Inscrições
          </h2>
          <p className="text-gray-400">
            {subscriptions.length} canais inscritos
          </p>
          <p className="text-gray-400 text-sm">Selecionados: {selectedCount} {pageSelectedCount !== selectedCount ? `(nesta página: ${pageSelectedCount})` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAllPage}
            className="bg-youtube-gray hover:bg-gray-600 text-white px-4 py-2 rounded border border-gray-600"
          >Selecionar Página</button>
          <button
            onClick={clearSelectionPage}
            className="bg-youtube-gray hover:bg-gray-600 text-white px-4 py-2 rounded border border-gray-600"
          >Limpar Seleção</button>
          <button
            onClick={handleBulkUnsubscribe}
            disabled={unsubscribing || selectedCount === 0}
            className="bg-gray-700 hover:bg-red-700 text-white px-4 py-2 rounded border border-gray-600 disabled:opacity-50"
          >{unsubscribing ? 'Desinscrevendo...' : 'Desinscrever Selecionados'}</button>
          <button
            onClick={() => exportCsv()}
            className="bg-youtube-gray hover:bg-gray-600 text-white px-4 py-2 rounded border border-gray-600"
          >Exportar CSV</button>
          <button
            onClick={() => copyRssUrls()}
            className="bg-youtube-red hover:bg-red-700 text-white px-4 py-2 rounded"
          >Copiar RSS Selecionados</button>
        </div>
      </div>

      {/* Scroll infinito: sentinel */}
      <div ref={sentinelRef} className="h-12 flex justify-center items-center">
        {loadingMore && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-youtube-red"></div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar canais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          />
        </div>
        
        <button
          onClick={() => setShowHidden(!showHidden)}
          className={`px-4 py-3 rounded-lg border flex items-center gap-2 transition-colors ${
            showHidden 
              ? 'bg-youtube-red border-youtube-red text-white' 
              : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'
          }`}
        >
          {showHidden ? <EyeOff size={20} /> : <Eye size={20} />}
          {showHidden ? 'Ocultos' : 'Mostrar Ocultos'}
        </button>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={async (e) => {
              const val = e.target.value as 'name' | 'date' | 'subscribers';
              setSortBy(val);
              if (val === 'subscribers') {
                const ids = subscriptions.map(s => s.snippet.resourceId.channelId);
                await ensureStats(ids);
              }
            }}
            className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          >
            <option value="name">Nome</option>
            <option value="date">Data de inscrição</option>
            <option value="subscribers">Qtd. de inscritos</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-3 rounded-lg border ${viewMode==='grid' ? 'bg-youtube-red border-youtube-red text-white' : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'}`}
            >Quadros</button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-3 rounded-lg border ${viewMode==='list' ? 'bg-youtube-red border-youtube-red text-white' : 'bg-youtube-gray border-gray-600 text-gray-300 hover:border-youtube-red'}`}
            >Lista</button>
          </div>
        </div>
      </div>

      {/* Lista de Inscrições */}
      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
        {filteredSubscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
            isSelected={selectedChannels.includes(subscription.snippet.resourceId.channelId)}
            onSelect={(selected) => onChannelSelect(subscription.snippet.resourceId.channelId, selected)}
          />
        ))}
      </div>

      {/* Botão Carregar Mais */}
      <div className="hidden">
        <button onClick={prevPage} disabled={!prevToken || loadingMore || pageNumber===1} className="bg-youtube-gray hover:bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-600 disabled:opacity-50">Anterior</button>
        <span className="text-gray-400">Página {pageNumber}</span>
        <button onClick={nextPage} disabled={!nextPageToken || loadingMore} className="bg-youtube-gray hover:bg-gray-600 text-white px-4 py-2 rounded-lg border border-gray-600 disabled:opacity-50">Próxima</button>
      </div>

      {filteredSubscriptions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            Nenhum canal encontrado
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Tente ajustar sua busca' : 'Você ainda não tem inscrições'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsList;
// Funções utilitárias no escopo do módulo
function exportCsvFilename(prefix = 'subscriptions') {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}

// Remove duplicatas considerando o channelId (cada canal apenas uma vez)
function dedupeByChannelId(items: YouTubeSubscription[]): YouTubeSubscription[] {
  const seen = new Set<string>();
  const out: YouTubeSubscription[] = [];
  for (const s of items) {
    const id = s?.snippet?.resourceId?.channelId;
    if (!id) continue;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(s);
    }
  }
  return out;
}
