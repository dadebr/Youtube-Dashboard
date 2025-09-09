import React from 'react';
import { LogOut, Settings, Youtube } from 'lucide-react';
import { authService } from '../services/authService';

interface HeaderProps {
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <header className="bg-youtube-dark border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube size={32} className="text-youtube-red" />
          <h1 className="text-xl font-bold text-white">
            YouTube Subscriptions Manager
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
          
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;