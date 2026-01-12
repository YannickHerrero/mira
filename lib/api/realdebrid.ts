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

interface RDTorrentInfo {
  id: string;
  filename?: string;
  status?: string;
  links?: string[];
  files?: RDTorrentInfoFile[];
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
   * Resolve an info hash to a streaming URL, caching if needed
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
    const link = this.pickLargestFileLink(readyInfo);

    if (!link) {
      throw new Error("No downloadable files available");
    }

    const unrestricted = await this.unrestrictLink(link);
    return unrestricted.download ?? unrestricted.link ?? link;
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

  private pickLargestFileLink(info: RDTorrentInfo): string | undefined {
    const files = info.files ?? [];
    const selectedFiles = files.filter((file) => file.selected === 1);
    const targetFiles = selectedFiles.length > 0 ? selectedFiles : files;

    if (targetFiles.length === 0) {
      return info.links?.[0];
    }

    const largestIndex = targetFiles.reduce(
      (maxIndex, file, index) =>
        file.bytes > (targetFiles[maxIndex]?.bytes ?? 0) ? index : maxIndex,
      0
    );

    const targetFile = targetFiles[largestIndex];
    const fileIndex = files.findIndex((file) => file.id === targetFile.id);
    return info.links?.[fileIndex] ?? info.links?.[0];
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
