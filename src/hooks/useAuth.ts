import { useEffect, useState } from 'react';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica se há token armazenado
    const storedToken = authService.getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }

    // Verifica se há token na URL (callback OAuth2)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      
      if (token) {
        authService.storeToken(token);
        setAccessToken(token);
        setIsAuthenticated(true);
        
        // Remove o token da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    setLoading(false);
  }, []);

  const login = (token: string) => {
    authService.storeToken(token);
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authService.logout();
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    accessToken,
    loading,
    login,
    logout
  };
};