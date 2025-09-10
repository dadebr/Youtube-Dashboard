class AuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    // Escopo amplo para evitar falhas de permissão em listagens e ações (subscribe/unsubscribe)
    'https://www.googleapis.com/auth/youtube'
  ].join(' ');

  private waitForGoogleIdentity(timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
          resolve();
          return;
        }
        const start = Date.now();
        const interval = window.setInterval(() => {
          if ((window as any).google?.accounts?.oauth2) {
            window.clearInterval(interval);
            resolve();
          } else if (Date.now() - start > timeoutMs) {
            window.clearInterval(interval);
            reject(new Error('Google Identity Services não carregou. Verifique conexão e bloqueadores.'));
          }
        }, 50);
      } catch (err) {
        reject(new Error('Falha ao verificar Google Identity Services'));
      }
    });
  }

  async authenticate(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (!this.CLIENT_ID) {
        reject(new Error('CLIENT_ID não configurado. Defina VITE_GOOGLE_CLIENT_ID no .env.'));
        return;
      }
      try {
        await this.waitForGoogleIdentity();
        this.authenticateWithGoogleIdentity(resolve, reject);
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  private authenticateWithGoogleIdentity(resolve: (token: string) => void, reject: (error: Error) => void) {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID!,
        scope: this.SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('Token de acesso não recebido'));
          }
        },
        error_callback: (error: any) => {
          reject(new Error(error?.message || 'Erro na autenticação'));
        }
      });

      client.requestAccessToken();
    } catch (error) {
      reject(new Error('Erro ao inicializar autenticação Google'));
    }
  }

  logout() {
    localStorage.removeItem('youtube_access_token');
    window.location.reload();
  }

  getStoredToken(): string | null {
    return localStorage.getItem('youtube_access_token');
  }

  storeToken(token: string) {
    localStorage.setItem('youtube_access_token', token);
  }
}

export const authService = new AuthService();
