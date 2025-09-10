# YouTube Subscriptions Manager

Um aplicativo web moderno para gerenciar suas inscrições do YouTube e visualizar os últimos feeds dos canais que você acompanha.

## 🚀 Funcionalidades

- **Autenticação OAuth2**: Login seguro com Google para acessar dados do YouTube
- **Gerenciamento de Inscrições**: Visualize, busque e selecione canais inscritos para acompanhar
- **Feeds Personalizados**: Veja os últimos vídeos dos canais selecionados com filtros avançados
- **Gerenciamento de Playlists**: Crie, edite e visualize suas playlists do YouTube
- **Vídeos do Canal**: Explore vídeos específicos de um canal selecionado
- **Busca de Canais**: Encontre novos canais para se inscrever
- **Filtros Avançados**: Busque por vídeos, ordene por data, visualizações ou relevância
- **Cache Inteligente**: Otimização de requisições para melhor performance
- **Interface Moderna**: Design inspirado no YouTube com tema escuro
- **Responsivo**: Funciona perfeitamente em desktop e mobile

## 🛠️ Tecnologias Utilizadas

- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **YouTube Data API v3** para dados
- **Google OAuth2** para autenticação
- **Axios** para requisições HTTP
- **Lucide React** para ícones

## 📋 Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **Conta Google** com acesso ao YouTube
3. **Chave da API do YouTube Data v3**
4. **Client ID do Google OAuth2**

## ⚙️ Configuração

### 1. Configurar Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **YouTube Data API v3**
4. Crie credenciais:
   - **API Key** para acessar a API do YouTube
   - **OAuth 2.0 Client ID (Web application)** para autenticação
5. No OAuth Client ID (Web):
   - Authorized JavaScript origins: `http://localhost:3000`
   - (Opcional, apenas se usar fallback OAuth) Authorized redirect URIs: `http://localhost:3000`
   - **OAuth 2.0 Client ID** para autenticação

### 2. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e adicione suas credenciais:
   ```env
   VITE_YOUTUBE_API_KEY=sua_chave_da_api_aqui
   VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui
   ```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Executar o Projeto

```bash
npm start
```

O aplicativo estará disponível em `http://localhost:3000`

#### 🚀 Executar com Arquivos .bat (Windows)

Para facilitar a execução no Windows, foram criados dois arquivos `.bat`:

- **`start.bat`**: Arquivo completo que verifica dependências e configurações
- **`run.bat`**: Arquivo simples para execução rápida

**Como usar:**

1. Clique duas vezes no arquivo `start.bat` (recomendado para primeira execução)
2. Ou use o `run.bat` se já tiver tudo configurado
3. A aplicação será aberta no navegador em `http://localhost:3000`

## 🎯 Como Usar

### 1. Login

- Clique em "Entrar com Google"
- Autorize o acesso às suas informações do YouTube
- Você será redirecionado de volta para o aplicativo

### 2. Gerenciar Inscrições

- Na aba "Inscrições", visualize todos os seus canais inscritos
- Use a barra de busca para encontrar canais específicos
- Clique em "Selecionar" nos canais que deseja acompanhar

### 3. Visualizar Feeds

- Na aba "Feeds", veja os últimos vídeos dos canais selecionados
- Use os filtros para:
  - Buscar vídeos específicos
  - Ordenar por data, visualizações ou curtidas
  - Filtrar por período (hoje, semana, mês)

### 4. Gerenciar Playlists

- Na aba "Playlists", visualize e edite suas playlists
- Crie novas playlists ou modifique existentes

### 5. Explorar Canais

- Na aba "Canais", veja vídeos de um canal específico
- Busque por canais na aba "Buscar" para descobrir novos conteúdos

## 🔧 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI reutilizáveis
│   ├── LoginButton.tsx # Tela de login
│   ├── Header.tsx      # Cabeçalho da aplicação
│   ├── SubscriptionsList.tsx # Lista de inscrições
│   ├── SubscriptionCard.tsx  # Card de canal
│   ├── FeedsList.tsx   # Lista de feeds
│   └── VideoCard.tsx   # Card de vídeo
├── services/           # Serviços de API
│   ├── youtubeApi.ts   # Integração com YouTube API
│   └── authService.ts  # Serviço de autenticação
├── types/              # Definições de tipos TypeScript
│   └── youtube.ts      # Tipos da API do YouTube
├── App.tsx             # Componente principal
└── index.tsx           # Ponto de entrada
```

## 🔒 Permissões Necessárias

O aplicativo solicita as seguintes permissões:
- `https://www.googleapis.com/auth/youtube.readonly` - Ler informações do YouTube
- `https://www.googleapis.com/auth/youtube.force-ssl` - Acesso seguro ao YouTube

## 🐛 Solução de Problemas

### Erro de CORS
Se encontrar erros de CORS, verifique se:
- Suas credenciais estão corretas
- O domínio está autorizado no Google Cloud Console
- A API do YouTube Data v3 está ativada

### Erro de Autenticação
- Verifique se o Client ID está correto
- Confirme se o domínio está configurado no Google Cloud Console
- Limpe o cache do navegador e tente novamente

## 📝 Notas Importantes

- O aplicativo funciona apenas com canais públicos
- Alguns canais podem não ter vídeos recentes
- A API do YouTube tem limites de requisições por dia
- Os dados são armazenados localmente no navegador

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
