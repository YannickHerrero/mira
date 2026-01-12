# PRD: Nyaa Anime Torrent Index Integration

## Summary
Add Nyaa as an anime-only torrent index alongside Torrentio. Nyaa results are resolved via Real-Debrid (magnet → cached check → stream URL) and merged into the existing source list. Uncached items remain visible but are not tagged as RD+.

## Goals
- Provide faster access to new anime releases via Nyaa.
- Preserve existing Torrentio + Real-Debrid flow for non-anime media.
- Show cached and uncached Nyaa results with clear caching signals.

## Non-Goals
- Replace Torrentio or change its provider configuration.
- Add non-anime sources to Nyaa.
- Build a full torrent client or local downloading support.

## Target Users
- Anime viewers who want faster new-episode availability.
- Existing users already using Real-Debrid as the playback backend.

## User Stories
- As an anime viewer, I can see Nyaa results in the sources list.
- As a user, I can play cached Nyaa torrents via Real-Debrid.
- As a user, I can still see uncached torrents and choose to cache them.

## Functional Requirements
### Source Discovery
- When `isAnime` is true, query Nyaa in addition to Torrentio.
- Nyaa search uses title-based queries (no TMDB/IMDb IDs).
- Episode queries include season/episode hints when available.
- Query both translated (`1_2`) and raw (`1_4`) anime categories.

### Real-Debrid Resolution
- For each Nyaa result, check instant availability by infoHash.
- If cached, resolve to a playable URL via Real-Debrid.
- If uncached, still surface the result but omit RD+ tag.

### UI/Sorting
- Merge Nyaa and Torrentio streams into a single list.
- Preserve existing scoring logic (quality, size, seeders, language, cache).
- Indicate provider as `Nyaa` for clarity.
- Continue showing uncached items (no hiding).

## Search Behavior
- Primary query: TMDB title.
- Fallback query: original title (if available).
- For episodes: include `SxxEyy` token in query when season/episode known.
- For movies: include year when available.

## Data Flow
1. Resolve TMDB title + optional original title.
2. Query Nyaa RSS with category filters.
3. Parse RSS items into internal `Stream` objects with magnet/infoHash.
4. Check Real-Debrid instant availability.
5. Resolve cached items to RD streaming URLs.
6. Merge results with Torrentio streams and score.

## Dependencies
- Add a lightweight XML/RSS parser dependency compatible with React Native and web.

## Error Handling
- If Nyaa fetch fails, continue with Torrentio results.
- If Real-Debrid checks fail, mark Nyaa items as uncached and continue.

## Telemetry (Optional)
- Count Nyaa results returned vs cached count.
- Track playback starts from Nyaa vs Torrentio.

## Rollout
- Ship behind anime-only gating (`isAnime`).
- No user-facing settings required initially.

## Risks
- RSS parsing differences across platforms if dependency isn’t fully RN-compatible.
- Title-based search may miss releases without common naming conventions.

## Open Questions
- Should we bias search toward specific release groups (SubsPlease/Erai)?
- Should we add a provider filter/toggle in settings for Nyaa?
- Should uncached items offer a “cache now” action via Real-Debrid?

## Progress
- 2026-01-12: Added Nyaa RSS fetch + Real-Debrid cache resolution for anime sources.
- 2026-01-12: Enabled uncached playback/download flows with Real-Debrid caching.
- 2026-01-12: Added retry-safe polling for Real-Debrid cache readiness.
- 2026-01-12: Handle empty/204 Real-Debrid responses during caching.
