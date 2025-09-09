import React from 'react';
import { LogIn } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginButtonProps {
  onLogin: (token: string) => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({ onLogin }) => {
  const handleLogin = async () => {
    try {
      const token = await authService.authenticate();
      authService.storeToken(token);
      onLogin(token);
    } catch (error) {
      console.error('Erro na autenticação:', error);
      alert('Erro na autenticação. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-youtube-dark">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            YouTube Subscriptions Manager
          </h1>
          <p className="text-gray-300 text-lg">
            Gerencie suas inscrições e visualize os últimos feeds do YouTube
          </p>
        </div>
        
        <button
          onClick={handleLogin}
          className="bg-youtube-red hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg flex items-center gap-3 mx-auto transition-colors duration-200"
        >
          <LogIn size={24} />
          Entrar com Google
        </button>
        
        <p className="text-gray-400 text-sm mt-4">
          Você será redirecionado para o Google para autorizar o acesso
        </p>
      </div>
    </div>
  );
};

export default LoginButton;