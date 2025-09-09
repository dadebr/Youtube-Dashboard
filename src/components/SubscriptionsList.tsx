import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Eye, EyeOff } from 'lucide-react';
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

  useEffect(() => {
    loadSubscriptions();
  }, [accessToken]);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchTerm, showHidden]);

  const loadSubscriptions = async (pageToken?: string) => {
    try {
      setLoading(pageToken ? false : true);
      setLoadingMore(!!pageToken);
      
      const response = await youtubeApi.getSubscriptions(pageToken);
      
      if (pageToken) {
        setSubscriptions(prev => [...prev, ...response.items]);
      } else {
        setSubscriptions(response.items);
      }
      
      setNextPageToken(response.nextPageToken);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      alert('Erro ao carregar inscrições. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

    setFilteredSubscriptions(filtered);
  };

  const loadMore = () => {
    if (nextPageToken && !loadingMore) {
      loadSubscriptions(nextPageToken);
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
        </div>
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
      </div>

      {/* Lista de Inscrições */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      {nextPageToken && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-youtube-gray hover:bg-gray-600 text-white px-6 py-3 rounded-lg border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? 'Carregando...' : 'Carregar Mais'}
          </button>
        </div>
      )}

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