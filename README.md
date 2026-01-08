# Mira

A cross-platform media streaming app that allows users to search and stream movies and TV shows. Built with Expo and React Native.

## Features

- Search movies and TV shows via TMDB
- Stream content via Real-Debrid integration
- Track watch progress across episodes
- Download content for offline viewing
- Manage watchlist and favorites
- Multiple audio track and subtitle support
- Streaming preferences (preferred audio/subtitle languages with priority ordering)
- Source filtering (quality and language filters for stream sources)
- Gesture controls (seek, volume, brightness)
- Screen lock during playback
- Dark and light mode support
- Cross-platform (Android, iOS, Web)

## Tech Stack

- **Framework**: Expo v54 + React Native 0.81.4
- **Routing**: Expo Router (file-based routing)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **Database**: Expo SQLite (native) + sql.js (web) with Drizzle ORM
- **State**: Zustand for global state
- **Video**: VLC Media Player (react-native-vlc-media-player)
- **APIs**: TMDB (metadata), Real-Debrid (streaming), Torrentio (sources)

## Requirements

- Node.js 20+ and Bun
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/) (for iOS development)
- [Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/) (for Android development)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/YannickHerrero/mira.git
cd mira
```

2. Install dependencies:

```bash
bun install
```

3. Configure API keys in the app settings:
   - TMDB API key (for movie/TV metadata)
   - Real-Debrid API key (for streaming)

4. Run the app:

```bash
# Start Expo development server
bun run dev

# Run on Android
bun run android

# Run on iOS
bun run ios

# Build for web
bun run build:web
```

## Project Structure

```
app/                    # Expo Router pages (file-based routing)
  (tabs)/              # Tab navigation (home, search, library, settings)
  media/[id].tsx       # Media detail screen
  player.tsx           # Video player screen

components/
  media/               # Media cards, grids, episode pickers
  player/              # VLC player, controls, gestures
  ui/                  # Reusable UI components

lib/
  api/                 # API clients (TMDB, Real-Debrid, Torrentio)

db/                    # Database schema and providers
stores/                # Zustand stores
hooks/                 # Custom React hooks
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
