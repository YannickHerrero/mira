# Mira MVP Task List

## Overview

**App Purpose**: A mobile streaming app that searches for movies, TV shows, and anime via TMDB, fetches torrent sources via Torrentio, streams via Real-Debrid, and tracks watch history locally.

**Target Platform**: iOS (via EAS Build)

**Status**: MVP COMPLETE (Phases 1-8)

---

## Phase 1: Project Restructure & Navigation [COMPLETED]

### 1.1 Remove Habit Tracking Code
- [x] Remove `app/(tabs)/index.tsx` content (habits list)
- [x] Remove `app/habits/` directory
- [x] Remove `app/create.tsx` (habit creation)
- [x] Remove `components/habit/` directory
- [x] Remove habit table from `db/schema.ts`
- [x] Delete habit-related migrations and regenerate

### 1.2 Set Up New Navigation Structure
- [x] Update `app/(tabs)/_layout.tsx` with new tabs
- [x] Create all tab screens (Home, Search, Library, Settings)
- [x] Add new icons for tabs

### 1.3 Create Stack Screens
- [x] `app/media/[id].tsx` - Media details
- [x] `app/player.tsx` - Video player screen

---

## Phase 2: Settings & API Key Configuration [COMPLETED]

- [x] Create `components/settings/ApiKeyItem.tsx`
- [x] Add TMDB API key input with validation
- [x] Add Real-Debrid API key input with validation
- [x] Create `stores/api-keys.ts` - Zustand store
- [x] Create `hooks/useApiKeys.ts` - Hook for API keys
- [x] Create `lib/secure-storage.ts` - Secure storage utilities

---

## Phase 3: Search Functionality [COMPLETED]

- [x] Create search input with debounced query
- [x] Add media type filter tabs (All / Movies / TV Shows)
- [x] Display search results in grid
- [x] Create `components/media/MediaCard.tsx`
- [x] Create `components/media/MediaGrid.tsx`
- [x] Create `hooks/useSearch.ts`

---

## Phase 4: Media Details Screen [COMPLETED]

- [x] Create `components/media/MediaHeader.tsx` - Backdrop, poster, metadata
- [x] "Watch Now" button for movies
- [x] Season selector for TV shows
- [x] Episode list with `components/media/EpisodeCard.tsx`
- [x] Create `hooks/useMedia.ts` - Fetch media details and IMDB ID

---

## Phase 5: Source Selection [COMPLETED]

- [x] Create `components/stream/SourceCard.tsx` - Stream info display
- [x] Create `components/stream/SourceList.tsx` - List of streams
- [x] Create `hooks/useSources.ts` - Fetch from Torrentio
- [x] Sort sources by quality/size

---

## Phase 6: Video Player [COMPLETED]

- [x] Create `components/player/VideoPlayer.tsx` - react-native-video wrapper
- [x] Create `components/player/PlayerControls.tsx` - Overlay controls
- [x] Create `components/player/PlayerGestures.tsx` - Gesture handling
- [x] Basic controls: Play/Pause, seek bar, time display
- [x] Double-tap to seek -/+10 seconds
- [x] Swipe horizontally to seek
- [x] Swipe up/down on right side for volume
- [x] Playback speed control
- [x] Background audio support configured

---

## Phase 7: Library & Watch History [COMPLETED]

- [x] Create `hooks/useLibrary.ts` - Query local database
- [x] "Continue Watching" section
- [x] "Watchlist" section
- [x] "Favorites" section
- [x] Create `components/library/MediaSection.tsx` - Horizontal scroll list

---

## Phase 8: Home Screen with Trending [COMPLETED]

- [x] Add trending endpoints to TMDB client
- [x] Create `hooks/useTrending.ts`
- [x] "Continue Watching" section (if any)
- [x] "Trending Movies" section
- [x] "Trending TV Shows" section
- [x] "Your Watchlist" preview section
- [x] Quick search bar at top

---

## Phase 9: Polish & Error Handling [PENDING]

### 9.1 Error Handling
- [ ] API error states with retry
- [ ] Network error detection
- [ ] User-friendly error messages

### 9.2 Loading States
- [ ] Skeleton loaders for media grids
- [ ] Pull-to-refresh on lists

### 9.3 Empty States
- [ ] No search results
- [ ] No sources found
- [ ] Empty library sections

### 9.4 UI Polish
- [ ] Smooth animations/transitions
- [ ] Haptic feedback on actions

---

## File Structure (Implemented)

```
app/
├── (tabs)/
│   ├── _layout.tsx        # Tab navigation [DONE]
│   ├── index.tsx          # Home screen [DONE]
│   ├── search.tsx         # Search screen [DONE]
│   ├── library.tsx        # Library screen [DONE]
│   └── settings.tsx       # Settings screen [DONE]
├── media/
│   └── [id].tsx           # Media details [DONE]
├── player.tsx             # Video player [DONE]
├── _layout.tsx            # Root layout [DONE]
└── +not-found.tsx

components/
├── media/
│   ├── MediaCard.tsx      # [DONE]
│   ├── MediaGrid.tsx      # [DONE]
│   ├── MediaHeader.tsx    # [DONE]
│   ├── SeasonPicker.tsx   # [DONE]
│   └── EpisodeCard.tsx    # [DONE]
├── stream/
│   ├── SourceList.tsx     # [DONE]
│   └── SourceCard.tsx     # [DONE]
├── player/
│   ├── VideoPlayer.tsx    # [DONE]
│   ├── PlayerControls.tsx # [DONE]
│   └── PlayerGestures.tsx # [DONE]
├── library/
│   └── MediaSection.tsx   # [DONE]
├── settings/
│   └── ApiKeyItem.tsx     # [DONE]
└── ui/                    # Existing shadcn components

hooks/
├── useApiKeys.ts          # [DONE]
├── useSearch.ts           # [DONE]
├── useMedia.ts            # [DONE]
├── useSources.ts          # [DONE]
├── useTrending.ts         # [DONE]
└── useLibrary.ts          # [DONE]

stores/
└── api-keys.ts            # [DONE]

lib/
├── api/
│   ├── tmdb.ts            # [DONE]
│   ├── torrentio.ts       # [DONE]
│   ├── realdebrid.ts      # [DONE]
│   └── index.ts           # [DONE]
├── types.ts               # [DONE]
├── secure-storage.ts      # [DONE]
└── utils.ts

db/
├── schema.ts              # [DONE]
└── migrations/            # [DONE]
```

---

## Dependencies Added

- `react-native-video` - Video playback
- `expo-secure-store` - Encrypted API key storage
- `expo-linear-gradient` - UI gradients
- `@react-native-community/slider` - Player seek bar
