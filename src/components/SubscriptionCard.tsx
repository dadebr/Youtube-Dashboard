import React, { useState } from 'react';
import { ExternalLink, Play, Users, Calendar, Check } from 'lucide-react';
import { YouTubeSubscription } from '../types/youtube';
import { youtubeApi } from '../services/youtubeApi';

interface SubscriptionCardProps {
  subscription: YouTubeSubscription;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription, isSelected, onSelect }) => {
  const [channelDetails, setChannelDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadChannelDetails = async () => {
    if (channelDetails) return; // Já carregado
    
    try {
      setLoading(true);
      const details = await youtubeApi.getChannelDetails(subscription.snippet.resourceId.channelId);
      setChannelDetails((details as any).items[0]);
    } catch (error) {
      console.error('Erro ao carregar detalhes do canal:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: string) => {
    const number = parseInt(num);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div 
      className={`bg-youtube-gray rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer border-2 ${
        isSelected ? 'border-youtube-red' : 'border-transparent'
      }`}
      onClick={loadChannelDetails}
    >
      <div className="flex items-start gap-4">
        <img
          src={subscription.snippet.thumbnails.medium?.url || subscription.snippet.thumbnails.default?.url}
          alt={subscription.snippet.title}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate mb-1">
            {subscription.snippet.title}
          </h3>
          
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {subscription.snippet.description}
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-youtube-red">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-youtube-red"></div>
              <span className="text-sm">Carregando...</span>
            </div>
          )}

          {channelDetails && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{formatNumber(channelDetails.statistics.subscriberCount)} inscritos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Play size={16} />
                  <span>{formatNumber(channelDetails.statistics.videoCount)} vídeos</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={14} />
                <span>Inscrito em {formatDate(subscription.snippet.publishedAt)}</span>
              </div>
              <div className="text-[11px] text-gray-500 break-all">ID: {subscription.snippet.resourceId.channelId}</div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <a
              href={`https://youtube.com/channel/${subscription.snippet.resourceId.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-youtube-red hover:text-red-400 text-sm flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
              Ver Canal
            </a>
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => { e.stopPropagation(); onSelect(e.target.checked); }}
                className="w-4 h-4 accent-red-600"
              />
              Selecionar
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
