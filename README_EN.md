# YouTube Subscriptions Manager

A modern web application to manage your YouTube subscriptions and view the latest feeds from the channels you follow.

## 🚀 Features

- **OAuth2 Authentication**: Secure login with Google
- **Subscription Management**: View and filter all your subscribed channels
- **Custom Feeds**: See the latest videos from selected channels
- **Playlist Management**: Create, edit, and view your YouTube playlists
- **Channel Videos**: Explore videos from a specific channel
- **Channel Search**: Find new channels to subscribe to
- **Advanced Filters**: Search for videos, sort by date, views, or relevance
- **Smart Cache**: Request optimization for better performance
- **Modern Interface**: YouTube-inspired design with dark theme
- **Responsive**: Works perfectly on desktop and mobile

## 🛠️ Technologies Used

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **YouTube Data API v3** for data
- **Google OAuth2** for authentication
- **Axios** for HTTP requests
- **Lucide React** for icons

## 📋 Prerequisites

1. **Node.js** (version 16 or higher)
2. **Google Account** with YouTube access
3. **YouTube Data API v3 Key**
4. **Google OAuth2 Client ID**

## ⚙️ Configuration

### 1. Configure Google Cloud Console

1. Access [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **YouTube Data API v3**
4. Create credentials:
   - **API Key** to access YouTube API
   - **OAuth 2.0 Client ID (Web application)** for authentication
5. In OAuth Client ID (Web):
   - Authorized JavaScript origins: `http://localhost:3000`
   - (Optional, only if using OAuth fallback) Authorized redirect URIs: `http://localhost:3000`

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your credentials:
   ```env
   VITE_YOUTUBE_API_KEY=your_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Project

```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🎯 How to Use

### 1. Login

- Click "Sign in with Google"
- Authorize access to your YouTube information
- You will be redirected back to the application

### 2. Manage Subscriptions

- In the "Subscriptions" tab, view all your subscribed channels
- Use the search bar to find specific channels
- Click "Select" on channels you want to follow

### 3. View Feeds

- In the "Feeds" tab, see the latest videos from selected channels
- Use filters to:
  - Search for specific videos
  - Sort by date, views, or likes
  - Filter by period (today, week, month)

### 4. Manage Playlists

- In the "Playlists" tab, view and edit your playlists
- Create new playlists or modify existing ones

### 5. Explore Channels

- In the "Channels" tab, see videos from a specific channel
- Search for channels in the "Search" tab to discover new content

## 🔧 Project Structure

```
src/
├── components/          # React Components
│   ├── ui/             # Reusable UI Components
│   ├── LoginButton.tsx # Login Screen
│   ├── Header.tsx      # Application Header
│   ├── SubscriptionsList.tsx # Subscriptions List
│   ├── SubscriptionCard.tsx  # Channel Card
│   ├── FeedsList.tsx   # Feeds List
│   ├── PlaylistsTab.tsx # Playlist Management
│   ├── ChannelVideos.tsx # Channel Videos
│   ├── SearchChannels.tsx # Channel Search
│   └── VideoCard.tsx   # Video Card
├── services/           # API Services
│   ├── youtubeApi.ts   # YouTube API Integration
│   ├── authService.ts  # Authentication Service
│   └── cache.ts        # Cache for Optimization
├── types/              # TypeScript Type Definitions
│   └── youtube.ts      # YouTube API Types
├── hooks/              # Custom Hooks
│   └── useAuth.ts      # Authentication Hook
├── App.tsx             # Main Component
└── index.tsx           # Entry Point
```

## 🔒 Required Permissions

The application requests the following permissions:

- `https://www.googleapis.com/auth/youtube.readonly` - Read YouTube information
- `https://www.googleapis.com/auth/youtube.force-ssl` - Secure YouTube access

## 🐛 Troubleshooting

### CORS Error

- Your credentials are correct
- The domain is authorized in Google Cloud Console
- YouTube Data API v3 is enabled

### Authentication Error

- Check if the Client ID is correct
- Confirm the domain is configured in Google Cloud Console
- Clear browser cache and try again

## 📝 Important Notes

- The application only works with public channels
- Some channels may not have recent videos
- YouTube API has daily request limits
- Data is stored locally in the browser

## 🤝 Contribution

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Send pull requests

## 📄 License

This project is under the MIT license. See the LICENSE file for more details.
