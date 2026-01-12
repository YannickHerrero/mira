import { XMLParser } from "fast-xml-parser";
import { createRealDebridClient } from "@/lib/api/realdebrid";
import type { RealDebridClient } from "@/lib/api/realdebrid";
import type { Stream } from "@/lib/types";

const NYAA_URL = "https://nyaa.si";
const NYAA_CATEGORIES = ["1_2", "1_4"];

interface NyaaItem {
  title: string;
  infoHash?: string;
  seeders?: number;
  size?: string;
  sizeBytes: number;
}

interface NyaaSearchOptions {
  queries: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: false,
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseSize(size?: string): { size?: string; sizeBytes: number } {
  if (!size) return { sizeBytes: 0 };

  const match = size.match(/([\d.]+)\s*(TiB|GiB|MiB|KiB|TB|GB|MB|KB)/i);
  if (!match) {
    return { size, sizeBytes: 0 };
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    TIB: 1024 ** 4,
    GIB: 1024 ** 3,
    MIB: 1024 ** 2,
    KIB: 1024,
    TB: 1000 ** 4,
    GB: 1000 ** 3,
    MB: 1000 ** 2,
    KB: 1000,
  };

  const sizeBytes = Math.round(value * (multipliers[unit] ?? 0));
  const normalizedUnit = unit.replace("I", "");
  return {
    size: `${value} ${normalizedUnit}`,
    sizeBytes,
  };
}

function parseQuality(title: string): string | undefined {
  const qualityMatch = title.match(/\b(2160p|4K|1080p|720p|480p|360p)\b/i);
  return qualityMatch?.[1]?.toUpperCase().replace("4K", "2160p");
}

function buildMagnet(infoHash: string, title: string): string {
  const encodedTitle = encodeURIComponent(title);
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodedTitle}`;
}

function parseFeed(xml: string): NyaaItem[] {
  const data = parser.parse(xml);
  const items = ensureArray(data?.rss?.channel?.item);

  return items
    .map((item) => {
      const title = item.title ?? "";
      const seeders = item["nyaa:seeders"]
        ? Number.parseInt(item["nyaa:seeders"], 10)
        : undefined;
      const infoHash = item["nyaa:infoHash"];
      const sizeValue = item["nyaa:size"];
      const { size, sizeBytes } = parseSize(sizeValue);

      return {
        title,
        seeders,
        infoHash,
        size,
        sizeBytes,
      };
    })
    .filter((item) => item.title.length > 0);
}

export class NyaaClient {
  private rdClient: RealDebridClient;

  constructor(rdApiKey: string) {
    this.rdClient = createRealDebridClient(rdApiKey);
  }

  async searchAnime(options: NyaaSearchOptions): Promise<Stream[]> {
    const { queries } = options;
    const querySet = queries.map((query) => query.trim()).filter(Boolean);

    if (querySet.length === 0) return [];

    const items = await this.fetchItems(querySet);
    const uniqueItems = new Map<string, NyaaItem>();

    for (const item of items) {
      const key = item.infoHash ?? item.title;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    }

    const orderedItems = Array.from(uniqueItems.values());
    const infoHashes = orderedItems.map((item) => item.infoHash).filter(Boolean) as string[];

    let availability: Record<string, boolean> = {};
    try {
      availability = await this.rdClient.getInstantAvailability(infoHashes);
    } catch {
      return orderedItems.map((item) => this.buildStream(item, false));
    }

    const streams = await Promise.all(
      orderedItems.map(async (item) => {
        const isCached = item.infoHash ? availability[item.infoHash] === true : false;
        if (!isCached || !item.infoHash) {
          return this.buildStream(item, false);
        }

        try {
          const url = await this.resolveCachedUrl(item.infoHash, item.title);
          return this.buildStream(item, true, url);
        } catch {
          return this.buildStream(item, false);
        }
      })
    );

    return streams;
  }

  private async fetchItems(queries: string[]): Promise<NyaaItem[]> {
    const responses = await Promise.all(
      queries.flatMap((query) =>
        NYAA_CATEGORIES.map(async (category) => {
          const url = `${NYAA_URL}/?page=rss&c=${category}&f=0&q=${encodeURIComponent(query)}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Nyaa RSS error: ${response.status} ${response.statusText}`);
          }
          const xml = await response.text();
          return parseFeed(xml);
        })
      )
    );

    return responses.flat();
  }

  private buildStream(item: NyaaItem, isCached: boolean, url?: string): Stream {
    return {
      provider: "Nyaa",
      title: item.title,
      quality: parseQuality(item.title),
      size: item.size,
      sizeBytes: item.sizeBytes,
      seeders: item.seeders,
      url,
      videoCodec: undefined,
      audio: undefined,
      hdr: undefined,
      sourceType: undefined,
      languages: [],
      isCached,
    };
  }

  private async resolveCachedUrl(infoHash: string, title: string): Promise<string | undefined> {
    const magnet = buildMagnet(infoHash, title);
    const { id } = await this.rdClient.addMagnet(magnet);
    await this.rdClient.selectFiles(id, "all");
    const torrentInfo = await this.rdClient.getTorrentInfo(id);

    const selectedFiles = (torrentInfo.files ?? []).filter((file) => file.selected === 1);
    const largestFileIndex = selectedFiles.reduce(
      (maxIndex, file, index) =>
        file.bytes > (selectedFiles[maxIndex]?.bytes ?? 0) ? index : maxIndex,
      0
    );

    const link = torrentInfo.links?.[largestFileIndex] ?? torrentInfo.links?.[0];
    if (!link) return undefined;

    const unrestricted = await this.rdClient.unrestrictLink(link);
    return unrestricted.download ?? unrestricted.link;
  }
}

export function createNyaaClient(rdApiKey: string): NyaaClient {
  return new NyaaClient(rdApiKey);
}
