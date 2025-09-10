import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import LoginButton from './components/LoginButton';
import Header from './components/Header';
import SubscriptionsList from './components/SubscriptionsList';
import FeedsList from './components/FeedsList';
import PlaylistsTab from './components/PlaylistsTab';
import ChannelVideos from './components/ChannelVideos';
import SearchChannels from './components/SearchChannels';
import { useAuth } from './hooks/useAuth';
import { youtubeApi } from './services/youtubeApi';

function App() {
  const { isAuthenticated, accessToken, loading, login, logout } = useAuth();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  useEffect(() => {
    if (accessToken) {
      youtubeApi.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const handleLogin = (token: string) => {
    youtubeApi.setAccessToken(token);
    login(token);
  };

  const handleLogout = () => {
    logout();
    setSelectedChannels([]);
  };

  const handleChannelSelect = (channelId: string, selected: boolean) => {
    if (selected) {
      setSelectedChannels(prev => [...prev, channelId]);
    } else {
      setSelectedChannels(prev => prev.filter(id => id !== channelId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-youtube-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-youtube-red"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginButton onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-youtube-dark">
      <Header onLogout={handleLogout} />
      
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="feeds" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="subscriptions">Inscrições</TabsTrigger>
            <TabsTrigger value="feeds">Feeds</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="channel">Canais</TabsTrigger>
            <TabsTrigger value="search">Buscar</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions">
            <SubscriptionsList 
              accessToken={accessToken!} 
              onChannelSelect={handleChannelSelect}
              selectedChannels={selectedChannels}
            />
          </TabsContent>

          <TabsContent value="feeds">
            <FeedsList 
              accessToken={accessToken!} 
              selectedChannels={selectedChannels}
            />
          </TabsContent>

          <TabsContent value="playlists">
            <PlaylistsTab />
          </TabsContent>

          <TabsContent value="channel">
            <ChannelVideos accessToken={accessToken!} />
          </TabsContent>

          <TabsContent value="search">
            <SearchChannels accessToken={accessToken!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;



