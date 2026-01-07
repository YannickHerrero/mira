/**
 * Torrentio Addon API Client
 *
 * Torrentio is a Stremio addon that aggregates torrent sources.
 * When configured with Real-Debrid, it returns direct streaming URLs for cached torrents.
 *
 * API format: https://torrentio.strem.fun/{config}/stream/{type}/{id}.json
 */

import {
  type Stream,
  type MediaType,
  type TorrentioConfig,
  DEFAULT_TORRENTIO_CONFIG,
} from "@/lib/types";

const TORRENTIO_URL = "https://torrentio.strem.fun";

// ============================================
// Response Types
// ============================================

interface TorrentioResponse {
  streams: TorrentioStream[];
}

interface TorrentioStream {
  name: string; // e.g., "[RD+] nyaasi" or "Torrentio\n4k DV"
  title: string; // e.g., "Movie.2024.1080p.BluRay.x264\n👤 150 💾 1.2 GB"
  url?: string; // Direct RD playback URL (if cached)
  infoHash?: string;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

// ============================================
// Regex patterns for parsing stream info
// ============================================

const PATTERNS = {
  seeders: /👤\s*(\d+)/,
  size: /💾\s*([\d.]+)\s*(GB|MB|TB)/i,
  quality: /\b(2160p|4K|1080p|720p|480p|360p)\b/i,
  hdr: /\b(HDR10\+|HDR10|DoVi|DV|Dolby[\s.]?Vision|HDR)\b/i,
  videoCodec: /\b(HEVC|x265|x264|AVC|AV1|H\.?265|H\.?264|VC-1|10bit|10-bit)\b/i,
  audio: /(DTS-HD[\s.]?MA|TrueHD|Atmos|DTS|AAC|FLAC|EAC3|E-AC-3|AC3|DD\+|DD|LPCM)[\s.]?(\d\.\d)?/i,
  sourceType: /\b(REMUX|BluRay|Blu-Ray|BDRip|BRRip|WEB-DL|WEBRip|WEBDL|HDTV|DVDRip|HDRip)\b/i,
  // Language flags
  langFlags: /(🇬🇧|🇺🇸|🇩🇪|🇫🇷|🇪🇸|🇮🇹|🇵🇹|🇧🇷|🇷🇺|🇯🇵|🇰🇷|🇨🇳|🇹🇼|🇮🇳|🇳🇱|🇵🇱|🇸🇪|🇳🇴|🇩🇰|🇫🇮|🇬🇷|🇹🇷|🇮🇱|🇸🇦|🇦🇪|🇹🇭|🇻🇳|🇮🇩|🇲🇾|🇵🇭)/g,
};

const FLAG_TO_LANGUAGE: Record<string, string> = {
  "🇬🇧": "English",
  "🇺🇸": "English",
  "🇩🇪": "German",
  "🇫🇷": "French",
  "🇪🇸": "Spanish",
  "🇮🇹": "Italian",
  "🇵🇹": "Portuguese",
  "🇧🇷": "Portuguese",
  "🇷🇺": "Russian",
  "🇯🇵": "Japanese",
  "🇰🇷": "Korean",
  "🇨🇳": "Chinese",
  "🇹🇼": "Chinese",
  "🇮🇳": "Hindi",
  "🇳🇱": "Dutch",
  "🇵🇱": "Polish",
  "🇸🇪": "Swedish",
  "🇳🇴": "Norwegian",
  "🇩🇰": "Danish",
  "🇫🇮": "Finnish",
  "🇬🇷": "Greek",
  "🇹🇷": "Turkish",
  "🇮🇱": "Hebrew",
  "🇸🇦": "Arabic",
  "🇦🇪": "Arabic",
  "🇹🇭": "Thai",
  "🇻🇳": "Vietnamese",
  "🇮🇩": "Indonesian",
  "🇲🇾": "Malay",
  "🇵🇭": "Filipino",
};

// ============================================
// Torrentio Client
// ============================================

export class TorrentioClient {
  private rdApiKey: string;
  private config: TorrentioConfig;

  constructor(rdApiKey: string, config?: Partial<TorrentioConfig>) {
    this.rdApiKey = rdApiKey;
    this.config = { ...DEFAULT_TORRENTIO_CONFIG, ...config };
  }

  /**
   * Build the Torrentio config string for the URL
   */
  private buildConfigString(showUncached = false): string {
    const providers = this.config.providers.join(",");
    const qualityFilter = this.config.qualityFilter.join(",");

    if (showUncached) {
      return `providers=${providers}|sort=${this.config.sortBy}|qualityfilter=${qualityFilter}|realdebrid=${this.rdApiKey}`;
    }

    // debridoptions=nodownloadlinks filters out uncached torrents
    return `providers=${providers}|sort=${this.config.sortBy}|qualityfilter=${qualityFilter}|debridoptions=nodownloadlinks|realdebrid=${this.rdApiKey}`;
  }

  /**
   * Get streams for a movie
   */
  async getMovieStreams(imdbId: string, showUncached = false): Promise<Stream[]> {
    return this.fetchStreams("movie", imdbId, showUncached);
  }

  /**
   * Get streams for a TV episode
   */
  async getEpisodeStreams(
    imdbId: string,
    season: number,
    episode: number,
    showUncached = false
  ): Promise<Stream[]> {
    const id = `${imdbId}:${season}:${episode}`;
    return this.fetchStreams("series", id, showUncached);
  }

  /**
   * Fetch streams from Torrentio
   */
  private async fetchStreams(
    type: "movie" | "series",
    id: string,
    showUncached: boolean
  ): Promise<Stream[]> {
    const config = this.buildConfigString(showUncached);
    const url = `${TORRENTIO_URL}/${config}/stream/${type}/${id}.json`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No streams found
      }
      throw new Error(`Torrentio API error: ${response.status} ${response.statusText}`);
    }

    const data: TorrentioResponse = await response.json();

    if (!data.streams || data.streams.length === 0) {
      return [];
    }

    return data.streams.map((stream) => this.parseStream(stream));
  }

  /**
   * Parse a Torrentio stream response into our Stream type
   */
  private parseStream(stream: TorrentioStream): Stream {
    const combinedText = `${stream.name}\n${stream.title}`;

    // Check if cached (instant playback via Real-Debrid)
    const isCached = stream.name.includes("[RD+]") || stream.name.includes("[⚡]");

    // Extract provider from name (e.g., "[RD+] nyaasi" -> "nyaasi")
    const providerMatch = stream.name.match(/\]\s*(\w+)/);
    const provider = providerMatch?.[1] ?? "unknown";

    // Parse seeders
    const seedersMatch = stream.title.match(PATTERNS.seeders);
    const seeders = seedersMatch ? parseInt(seedersMatch[1], 10) : undefined;

    // Parse size
    const sizeMatch = stream.title.match(PATTERNS.size);
    let size: string | undefined;
    let sizeBytes = 0;
    if (sizeMatch) {
      size = `${sizeMatch[1]} ${sizeMatch[2]}`;
      const sizeNum = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if (unit === "TB") sizeBytes = sizeNum * 1024 * 1024 * 1024 * 1024;
      else if (unit === "GB") sizeBytes = sizeNum * 1024 * 1024 * 1024;
      else if (unit === "MB") sizeBytes = sizeNum * 1024 * 1024;
    }

    // Parse quality
    const qualityMatch = combinedText.match(PATTERNS.quality);
    const quality = qualityMatch?.[1]?.toUpperCase().replace("4K", "2160p");

    // Parse HDR
    const hdrMatch = combinedText.match(PATTERNS.hdr);
    let hdr = hdrMatch?.[1];
    if (hdr) {
      // Normalize HDR names
      hdr = hdr
        .replace(/DoVi|Dolby[\s.]?Vision/i, "DV")
        .replace(/HDR10\+/i, "HDR10+")
        .toUpperCase();
    }

    // Parse video codec
    const videoCodecMatch = combinedText.match(PATTERNS.videoCodec);
    let videoCodec = videoCodecMatch?.[1];
    if (videoCodec) {
      // Normalize codec names
      videoCodec = videoCodec
        .replace(/x265|H\.?265/i, "HEVC")
        .replace(/x264|H\.?264/i, "AVC")
        .toUpperCase();
    }

    // Parse audio
    const audioMatch = combinedText.match(PATTERNS.audio);
    const audio = audioMatch ? audioMatch[0].trim() : undefined;

    // Parse source type
    const sourceTypeMatch = combinedText.match(PATTERNS.sourceType);
    const sourceType = sourceTypeMatch?.[1]?.replace(/-/g, "");

    // Parse languages from flags
    const flagMatches = combinedText.match(PATTERNS.langFlags) ?? [];
    const languages = [
      ...new Set(
        flagMatches.map((flag) => FLAG_TO_LANGUAGE[flag]).filter(Boolean) as string[]
      ),
    ];

    return {
      provider,
      quality,
      size,
      sizeBytes,
      seeders,
      url: stream.url,
      videoCodec,
      audio,
      hdr,
      sourceType,
      languages,
      isCached,
      title: stream.title.split("\n")[0] ?? stream.title,
    };
  }

  /**
   * Update the Torrentio config
   */
  setConfig(config: Partial<TorrentioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update the Real-Debrid API key
   */
  setRdApiKey(apiKey: string): void {
    this.rdApiKey = apiKey;
  }
}

/**
 * Create a Torrentio client instance
 */
export function createTorrentioClient(
  rdApiKey: string,
  config?: Partial<TorrentioConfig>
): TorrentioClient {
  return new TorrentioClient(rdApiKey, config);
}
