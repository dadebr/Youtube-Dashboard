import React from 'react';
import { ExternalLink, Play, Eye, ThumbsUp, MessageCircle, Calendar, Clock } from 'lucide-react';
import { ProcessedVideo } from '../types/youtube';

interface VideoCardProps {
  video: ProcessedVideo;
  onSave?: () => void;
  isSaved?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSave, isSaved }) => {
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
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} meses atrás`;
    return `${Math.ceil(diffDays / 365)} anos atrás`;
  };

  const formatDuration = (duration: string) => {
    if (!duration) return '';
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="bg-youtube-gray rounded-lg overflow-hidden hover:bg-gray-700 transition-colors">
      {/* Thumbnail */}
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-48 object-cover"
        />
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <Play className="text-white opacity-0 hover:opacity-100 transition-opacity duration-200" size={48} />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-2 mb-2">
          {video.title}
        </h3>
        
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
          {video.description}
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-medium">{video.channelTitle}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye size={14} />
              <span>{formatNumber(video.viewCount)} visualizações</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp size={14} />
              <span>{formatNumber(video.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle size={14} />
              <span>{formatNumber(video.commentCount)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={14} />
            <span>{formatDate(video.publishedAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <a
            href={`https://youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-youtube-red hover:text-red-400 text-sm flex items-center gap-1"
          >
            <ExternalLink size={14} />
            Assistir
          </a>
          {onSave && (
            <button
              onClick={onSave}
              className={`text-sm px-3 py-1 rounded ${isSaved ? 'bg-youtube-red text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            >{isSaved ? 'Salvo' : 'Ver depois'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
