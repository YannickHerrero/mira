/**
 * Real-Debrid API Client
 *
 * Real-Debrid is a premium link generator that provides fast,
 * unrestricted downloads and streaming from various hosters.
 *
 * API docs: https://api.real-debrid.com/
 *
 * Note: Most Real-Debrid functionality is handled by Torrentio when
 * the RD API key is included in the config string. This client is
 * primarily used for:
 * - Validating API keys
 * - Getting user account info
 * - Future features like manual link unrestriction
 */

import { Platform } from "react-native";

const RD_API_URL = "https://api.real-debrid.com/rest/1.0";
const RD_PROXY_URL = "/api/rd";
const DEFAULT_CACHE_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_CACHE_POLL_INTERVAL_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determine if we should use the proxy for Real-Debrid API calls.
 * We use the proxy on deployed web to avoid CORS issues.
 * Local development and native platforms call the API directly.
 */
function shouldUseProxy(): boolean {
  if (Platform.OS !== "web") return false;

  // Local development - no proxy needed (no CORS issues)
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;

  // Deployed web - use proxy to avoid CORS
  return true;
}

/**
 * Get the base URL for Real-Debrid API calls
 */
function getApiBaseUrl(): string {
  return shouldUseProxy() ? RD_PROXY_URL : RD_API_URL;
}

// ============================================
// Response Types
// ============================================

interface RDUser {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: string;
  premium: number; // Unix timestamp of premium expiration
  expiration: string; // ISO date string
}

interface RDError {
  error: string;
  error_code: number;
}

interface RDInstantAvailabilityResponse {
  [hash: string]: {
    rd?: Array<unknown>;
  };
}

interface RDTorrentInfoFile {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

/**
 * Video file extensions that can be played directly.
 * Based on common video formats supported by VLC and most players.
 */
const VIDEO_EXTENSIONS = [
  "3g2", "3gp", "avi", "flv", "mkv", "mk3d", "mov", "mp2", "mp4", "m4v",
  "mpe", "mpeg", "mpg", "mpv", "webm", "wmv", "ogm", "ts", "mts", "m2ts",
  "vob", "divx", "xvid", "asf", "rm", "rmvb", "f4v", "ogv", "dv"
];

/**
 * Unplayable file extensions - disc images and archives that cannot be streamed.
 */
const UNPLAYABLE_EXTENSIONS = [
  // Disc images
  "iso", "img", "bin", "nrg", "mdf", "mds", "cue", "ccd",
  // Archives
  "rar", "zip", "7z", "tar", "gz", "bz2", "xz", "cab", "ace",
  // Other
  "exe", "msi", "dmg"
];

/**
 * Get file extension category for user-friendly error messages.
 */
export type UnplayableFileType = "disc_image" | "archive" | "other";

function getUnplayableFileType(extension: string): UnplayableFileType {
  const discImageExtensions = ["iso", "img", "bin", "nrg", "mdf", "mds", "cue", "ccd"];
  const archiveExtensions = ["rar", "zip", "7z", "tar", "gz", "bz2", "xz", "cab", "ace"];
  
  if (discImageExtensions.includes(extension.toLowerCase())) {
    return "disc_image";
  }
  if (archiveExtensions.includes(extension.toLowerCase())) {
    return "archive";
  }
  return "other";
}

/**
 * Custom error for unplayable files (ISO, archives, etc.)
 */
export class UnplayableFileError extends Error {
  public readonly extension: string;
  public readonly filename: string;
  public readonly fileType: UnplayableFileType;
  
  constructor(filename: string, extension: string) {
    const fileType = getUnplayableFileType(extension);
    const typeLabel = fileType === "disc_image" ? "disc image" 
      : fileType === "archive" ? "archive" 
      : "file";
    
    super(`This source contains a ${typeLabel} (${extension.toUpperCase()}) that cannot be streamed`);
    this.name = "UnplayableFileError";
    this.extension = extension.toLowerCase();
    this.filename = filename;
    this.fileType = fileType;
  }
}

/**
 * Check if a file path has an unplayable extension.
 * Returns the extension if unplayable, undefined otherwise.
 */
function getUnplayableExtension(path: string): string | undefined {
  const match = path.toLowerCase().match(/\.(\w+)$/);
  if (match && UNPLAYABLE_EXTENSIONS.includes(match[1])) {
    return match[1];
  }
  return undefined;
}

/**
 * Check if a file path is a playable video file.
 */
function isVideoFile(path: string): boolean {
  const extensionMatch = path.toLowerCase().match(/\.(\w{2,4})$/);
  return extensionMatch ? VIDEO_EXTENSIONS.includes(extensionMatch[1]) : false;
}

interface RDTorrentInfo {
  id: string;
  filename?: string;
  status?: string;
  links?: string[];
  files?: RDTorrentInfoFile[];
}

interface RDTorrentListItem {
  id: string;
  filename?: string;
  hash: string;
  status: string;
}

interface RDAddMagnetResponse {
  id: string;
}

interface RDUnrestrictResponse {
  download?: string;
  link?: string;
}

// ============================================
// Real-Debrid Client
// ============================================

export class RealDebridClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make an authenticated request to the Real-Debrid API
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: RDError = await response.json().catch(() => ({
        error: "Unknown error",
        error_code: response.status,
      }));
      throw new Error(`Real-Debrid API error: ${error.error} (${error.error_code})`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Get user account information
   */
  async getUser(): Promise<RDUser> {
    return this.fetch<RDUser>("/user");
  }

  /**
   * Validate the API key by attempting to get user info
   */
  async validateApiKey(): Promise<{
    valid: boolean;
    username?: string;
    isPremium?: boolean;
    expiresAt?: Date;
  }> {
    try {
      const user = await this.getUser();
      const expiresAt = user.premium ? new Date(user.premium * 1000) : undefined;
      const isPremium = expiresAt ? expiresAt > new Date() : false;

      return {
        valid: true,
        username: user.username,
        isPremium,
        expiresAt,
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Check if the user has active premium
   */
  async hasPremium(): Promise<boolean> {
    try {
      const user = await this.getUser();
      const expiresAt = new Date(user.premium * 1000);
      return expiresAt > new Date();
    } catch {
      return false;
    }
  }

  /**
   * Check instant availability for torrent hashes
   */
  async getInstantAvailability(infoHashes: string[]): Promise<Record<string, boolean>> {
    if (infoHashes.length === 0) return {};

    const hashPath = infoHashes.join("/");
    const response = await this.fetch<RDInstantAvailabilityResponse>(
      `/torrents/instantAvailability/${hashPath}`
    );

    return infoHashes.reduce<Record<string, boolean>>((acc, hash) => {
      const data = response[hash];
      acc[hash] = Array.isArray(data?.rd) && data.rd.length > 0;
      return acc;
    }, {});
  }

  /**
   * List torrents in the user account
   */
  async getTorrents(): Promise<RDTorrentListItem[]> {
    return this.fetch<RDTorrentListItem[]>("/torrents");
  }

  /**
   * Resolve an info hash to a streaming URL, caching if needed.
   * @throws {UnplayableFileError} if the file is an ISO, archive, or other unplayable format
   */
  async resolveInfoHashToStreamUrl(
    infoHash: string,
    title: string,
    options?: {
      timeoutMs?: number;
      pollIntervalMs?: number;
    }
  ): Promise<string> {
    const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}`;
    const { id } = await this.addMagnet(magnet);
    await this.selectFiles(id, "all");

    const timeoutMs = options?.timeoutMs ?? DEFAULT_CACHE_TIMEOUT_MS;
    const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_CACHE_POLL_INTERVAL_MS;
    const readyInfo = await this.waitForTorrentReady(id, timeoutMs, pollIntervalMs);
    
    // This will throw UnplayableFileError if only unplayable files are found
    const link = this.pickLargestFileLink(readyInfo);

    const unrestricted = await this.unrestrictLink(link);
    const finalUrl = unrestricted.download ?? unrestricted.link ?? link;
    
    // Double-check the final URL for unplayable extensions
    // This catches cases where the torrent file list didn't reveal the extension
    const unplayableExt = getUnplayableExtension(finalUrl);
    if (unplayableExt) {
      throw new UnplayableFileError(finalUrl, unplayableExt);
    }
    
    return finalUrl;
  }

  /**
   * Add a magnet to Real-Debrid
   */
  async addMagnet(magnet: string): Promise<RDAddMagnetResponse> {
    const body = new URLSearchParams({ magnet }).toString();
    return this.fetch<RDAddMagnetResponse>("/torrents/addMagnet", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  }

  /**
   * Select files for a torrent
   */
  async selectFiles(torrentId: string, files: "all" | string[]): Promise<void> {
    const filesValue = files === "all" ? "all" : files.join(",");
    const body = new URLSearchParams({ files: filesValue }).toString();
    await this.fetch<void>(`/torrents/selectFiles/${torrentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  }

  /**
   * Get torrent info
   */
  async getTorrentInfo(torrentId: string): Promise<RDTorrentInfo> {
    return this.fetch<RDTorrentInfo>(`/torrents/info/${torrentId}`);
  }

  private async waitForTorrentReady(
    torrentId: string,
    timeoutMs: number,
    pollIntervalMs: number
  ): Promise<RDTorrentInfo> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      let info: RDTorrentInfo | null = null;

      try {
        info = await this.getTorrentInfo(torrentId);
      } catch (error) {
        if (error instanceof Error && error.message.includes("(404)")) {
          await sleep(pollIntervalMs);
          continue;
        }
        throw error;
      }

      if (!info) {
        await sleep(pollIntervalMs);
        continue;
      }

      if (info.status === "downloaded" && info.links && info.links.length > 0) {
        return info;
      }

      if (info.status === "error" || info.status === "magnet_error" || info.status === "virus") {
        throw new Error(`Real-Debrid cache failed (${info.status})`);
      }

      await sleep(pollIntervalMs);
    }

    throw new Error("Real-Debrid cache timeout");
  }

  private pickLargestFileLink(info: RDTorrentInfo): string {
    const files = info.files ?? [];
    const selectedFiles = files.filter((file) => file.selected === 1);
    const targetFiles = selectedFiles.length > 0 ? selectedFiles : files;

    if (targetFiles.length === 0) {
      const firstLink = info.links?.[0];
      if (!firstLink) {
        throw new Error("No downloadable files available");
      }
      return firstLink;
    }

    // Separate files into playable video files and unplayable files
    const videoFiles: RDTorrentInfoFile[] = [];
    const unplayableFiles: { file: RDTorrentInfoFile; extension: string }[] = [];

    for (const file of targetFiles) {
      const unplayableExt = getUnplayableExtension(file.path);
      if (unplayableExt) {
        unplayableFiles.push({ file, extension: unplayableExt });
      } else if (isVideoFile(file.path)) {
        videoFiles.push(file);
      }
    }

    // If no video files found, check if we have unplayable files to report
    if (videoFiles.length === 0) {
      if (unplayableFiles.length > 0) {
        // Find the largest unplayable file to report
        const largest = unplayableFiles.reduce((max, curr) => 
          curr.file.bytes > max.file.bytes ? curr : max
        );
        throw new UnplayableFileError(largest.file.path, largest.extension);
      }
      throw new Error("No downloadable files available");
    }

    // Find the largest video file
    const largestIndex = videoFiles.reduce(
      (maxIndex, file, index) =>
        file.bytes > (videoFiles[maxIndex]?.bytes ?? 0) ? index : maxIndex,
      0
    );

    const targetFile = videoFiles[largestIndex];
    const fileIndex = files.findIndex((file) => file.id === targetFile.id);
    const link = info.links?.[fileIndex] ?? info.links?.[0];
    
    if (!link) {
      throw new Error("No downloadable files available");
    }
    
    return link;
  }

  /**
   * Unrestrict a download link
   */
  async unrestrictLink(link: string): Promise<RDUnrestrictResponse> {
    const body = new URLSearchParams({ link }).toString();
    return this.fetch<RDUnrestrictResponse>("/unrestrict/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

/**
 * Create a Real-Debrid client instance
 */
export function createRealDebridClient(apiKey: string): RealDebridClient {
  return new RealDebridClient(apiKey);
}
