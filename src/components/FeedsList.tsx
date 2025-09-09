import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Eye, ThumbsUp, MessageCircle, Calendar } from 'lucide-react';
import { YouTubeVideo, ProcessedVideo } from '../types/youtube';
import { youtubeApi } from '../services/youtubeApi';
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

  useEffect(() => {
    if (selectedChannels.length > 0) {
      loadFeeds();
    }
  }, [selectedChannels, accessToken]);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchTerm, sortBy, timeFilter]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const allVideos: YouTubeVideo[] = [];

      // Carrega vídeos de cada canal selecionado
      for (const channelId of selectedChannels) {
        try {
          const response = await youtubeApi.getChannelVideos(channelId);
          allVideos.push(...response.items);
        } catch (error) {
          console.error(`Erro ao carregar vídeos do canal ${channelId}:`, error);
        }
      }

      // Converte para o formato correto
      const formattedVideos = allVideos.map(video => ({
        id: video.id || video.snippet?.resourceId?.videoId || '',
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || '',
        channelTitle: video.snippet?.channelTitle || '',
        channelId: video.snippet?.channelId || '',
        publishedAt: video.snippet?.publishedAt || '',
        duration: video.contentDetails?.duration || '',
        viewCount: video.statistics?.viewCount || '0',
        likeCount: video.statistics?.likeCount || '0',
        commentCount: video.statistics?.commentCount || '0'
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Erro ao carregar feeds:', error);
      alert('Erro ao carregar feeds. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVideos = () => {
    let filtered = [...videos];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.channelTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tempo
    const now = new Date();
    filtered = filtered.filter(video => {
      const videoDate = new Date(video.publishedAt);
      const diffTime = now.getTime() - videoDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (timeFilter) {
        case 'today':
          return diffDays <= 1;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        default:
          return true;
      }
    });

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'views':
          return parseInt(b.viewCount) - parseInt(a.viewCount);
        case 'likes':
          return parseInt(b.likeCount) - parseInt(a.likeCount);
        default:
          return 0;
      }
    });

    setFilteredVideos(filtered);
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
            <Clock size={28} />
            Últimos Feeds
          </h2>
          <p className="text-gray-400">
            {videos.length} vídeos dos canais selecionados
          </p>
        </div>
      </div>

      {/* Filtros */}
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'views' | 'likes')}
            className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          >
            <option value="date">Mais Recentes</option>
            <option value="views">Mais Visualizados</option>
            <option value="likes">Mais Curtidos</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
            className="px-4 py-3 bg-youtube-gray text-white rounded-lg border border-gray-600 focus:border-youtube-red focus:outline-none"
          >
            <option value="all">Todos os Tempos</option>
            <option value="today">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
          </select>
        </div>
      </div>

      {/* Lista de Vídeos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
          />
        ))}
      </div>

      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <Clock size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            Nenhum vídeo encontrado
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Tente ajustar sua busca' : 'Selecione alguns canais para ver os feeds'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedsList;