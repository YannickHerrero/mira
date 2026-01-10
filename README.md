# Mira

> Cross-platform streaming app for movies and TV shows

A media streaming application built with React Native and Expo. Search movies and TV shows via TMDB, fetch torrent sources via Torrentio, and stream content through Real-Debrid — all from a single, unified interface across Android, iOS, and Web.

## Screenshots

![Mira Demo](docs/demo.gif)

<!-- TODO: Add demo GIF or screenshots -->

## Highlights

- **Search & Discover** — Browse movies and TV shows with metadata from TMDB
- **Stream via Real-Debrid** — High-quality streaming through debrid service integration
- **Track Your Progress** — Automatic watch progress tracking across episodes
- **Release Calendar** — Track upcoming movie and TV releases
- **Full Player Controls** — Gestures for seek, volume, brightness, plus screen lock
- **Offline Support** — Download content for offline viewing
- **Cross-Platform** — Works on Android, iOS, and Web from a single codebase

## Overview

Mira bridges the gap between content discovery and streaming. It combines TMDB's extensive movie and TV database with Torrentio's source aggregation and Real-Debrid's premium streaming capabilities. The result is a seamless experience where you can search for any title, select your preferred source quality and language, and start streaming immediately.

The app handles the complexity of managing multiple services behind a clean, intuitive interface — complete with watch history, favorites, and personalized streaming preferences.

### Author

Created by [Yannick Herrero](https://github.com/YannickHerrero)

## Tech Stack

| Component | Tool | Description |
|-----------|------|-------------|
| Framework | [Expo](https://expo.dev/) v54 + React Native | Cross-platform mobile/web development |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) | File-based navigation |
| Styling | [NativeWind](https://www.nativewind.dev/) v4 | Tailwind CSS for React Native |
| Database | Expo SQLite + [Drizzle ORM](https://orm.drizzle.team/) | Local storage with sql.js for web |
| State | [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight global state management |
| Video | VLC Media Player | Hardware-accelerated playback |
| Metadata | [TMDB API](https://www.themoviedb.org/) | Movie and TV show information |
| Sources | Torrentio | Torrent source aggregation |
| Streaming | [Real-Debrid](http://real-debrid.com/?id=16544328) | Premium debrid service |

## Features

### Streaming & Sources

- Stream content via Real-Debrid integration
- Source filtering by quality (4K, 1080p, 720p, etc.)
- Language filters for stream sources
- Multiple audio track support
- Subtitle support with language selection

### Player Controls

- Gesture controls for seek, volume, and brightness
- Screen lock during playback
- Streaming preferences with priority ordering
- Preferred audio and subtitle language settings

### Library & Progress

- Automatic watch progress tracking
- Resume playback across episodes
- Manage watchlist and favorites
- Release calendar for upcoming movies and episodes
- Download content for offline viewing

### Appearance

- Dark and light mode support
- Clean, intuitive interface

## Repository Structure

```
mira/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (tabs)/             # Tab navigation (home, search, library, settings)
│   ├── media/[id].tsx      # Media detail screen
│   └── player.tsx          # Video player screen
├── components/
│   ├── media/              # Media cards, grids, episode pickers
│   ├── player/             # VLC player, controls, gestures
│   └── ui/                 # Reusable UI components
├── lib/
│   └── api/                # API clients (TMDB, Real-Debrid, Torrentio)
├── db/                     # Database schema and providers
├── stores/                 # Zustand stores
└── hooks/                  # Custom React hooks
```

## Installation

### Prerequisites

- Node.js 20+ and [Bun](https://bun.sh/)
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/) (for iOS development)
- [Android Studio Emulator](https://docs.expo.dev/workflow/android-studio-emulator/) (for Android development)

### Setup

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
   - **TMDB API key** — Get one at [themoviedb.org](https://www.themoviedb.org/settings/api)
   - **Real-Debrid API key** — Create an account at [real-debrid.com](http://real-debrid.com/?id=16544328)

### Running

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

## Notes

- **API Keys Required**: Both TMDB and Real-Debrid API keys must be configured in the app settings before streaming
- **Real-Debrid Subscription**: A premium Real-Debrid subscription is required for streaming functionality
- **Web Platform**: Uses sql.js for SQLite compatibility in browsers

## Feedback

If you have questions or suggestions, feel free to [open an issue](https://github.com/YannickHerrero/mira/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
