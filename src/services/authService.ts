interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

class AuthService {
  private readonly CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ].join(' ');

  async authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.CLIENT_ID) {
        reject(new Error('CLIENT_ID não configurado'));
        return;
      }

      // Usa o Google Identity Services para autenticação mais moderna
      if (typeof window !== 'undefined' && (window as any).google) {
        this.authenticateWithGoogleIdentity(resolve, reject);
      } else {
        // Fallback para OAuth2 tradicional
        this.authenticateWithOAuth2(resolve, reject);
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
          reject(new Error(error.message || 'Erro na autenticação'));
        }
      });

      client.requestAccessToken();
    } catch (error) {
      reject(new Error('Erro ao inicializar autenticação Google'));
    }
  }

  private authenticateWithOAuth2(resolve: (token: string) => void, reject: (error: Error) => void) {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(this.SCOPES)}&` +
      `include_granted_scopes=true`;

    // Redireciona para a página de autenticação
    window.location.href = authUrl;
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