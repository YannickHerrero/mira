type AniListTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

type AniListCoverImage = {
  medium: string | null;
};

export type AniListSearchResult = {
  id: number;
  title: AniListTitle;
  format: string | null;
  seasonYear: number | null;
  episodes: number | null;
  coverImage: AniListCoverImage | null;
};

type AniListSearchResponse = {
  Page: {
    media: AniListSearchResult[];
  };
};

type AniListMutationResponse = {
  SaveMediaListEntry: {
    id: number;
    status: string | null;
    progress: number | null;
  };
};

type AniListProgressResponse = {
  Media: {
    mediaListEntry: {
      progress: number | null;
    } | null;
  } | null;
};

export type AniListMediaListEntry = {
  id: number;
  progress: number;
  media: {
    id: number;
    title: AniListTitle;
    episodes: number | null;
    coverImage: AniListCoverImage | null;
    format: string | null;
    status: string | null;
  };
};

type AniListViewerResponse = {
  Viewer: {
    id: number;
  };
};

type AniListMediaListCollectionResponse = {
  MediaListCollection: {
    lists: Array<{
      entries: AniListMediaListEntry[];
    }>;
  } | null;
};

const ANILIST_API_URL = "https://graphql.anilist.co";

export class AniListClient {
  private viewerId: number | null = null;

  constructor(private accessToken: string | null) {}

  private async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AniList API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(", "));
    }

    if (!payload.data) {
      throw new Error("AniList API error: Missing response data");
    }

    return payload.data;
  }

  async searchMedia({
    search,
    format,
  }: {
    search: string;
    format?: "MOVIE" | "TV" | "TV_SHORT" | "OVA" | "ONA" | "SPECIAL" | null;
  }): Promise<AniListSearchResult[]> {
    const baseFields = `
      id
      title { romaji english native }
      format
      seasonYear
      episodes
      coverImage { medium }
    `;

    const queryWithFormat = `
      query ($search: String!, $format: MediaFormat) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME, format: $format, sort: SEARCH_MATCH) {
            ${baseFields}
          }
        }
      }
    `;

    const queryWithoutFormat = `
      query ($search: String!) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            ${baseFields}
          }
        }
      }
    `;

    const data = await this.request<AniListSearchResponse>(
      format ? queryWithFormat : queryWithoutFormat,
      format ? { search, format } : { search }
    );

    return data.Page.media ?? [];
  }

  async getProgress(mediaId: number) {
    const query = `
      query ($id: Int!) {
        Media(id: $id, type: ANIME) {
          mediaListEntry {
            progress
          }
        }
      }
    `;

    const data = await this.request<AniListProgressResponse>(query, { id: mediaId });
    return data.Media?.mediaListEntry?.progress ?? 0;
  }

  async saveProgress({
    mediaId,
    progress,
    status,
  }: {
    mediaId: number;
    progress: number;
    status?: "CURRENT" | "COMPLETED";
  }) {
    const mutation = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
        SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
          id
          status
          progress
        }
      }
    `;

    return this.request<AniListMutationResponse>(mutation, {
      mediaId,
      progress,
      status: status ?? null,
    });
  }

  async getViewerId(): Promise<number> {
    if (this.viewerId !== null) return this.viewerId;

    const query = `
      query {
        Viewer {
          id
        }
      }
    `;

    const data = await this.request<AniListViewerResponse>(query);
    this.viewerId = data.Viewer.id;
    return this.viewerId;
  }

  async getWatchingList(): Promise<AniListMediaListEntry[]> {
    const userId = await this.getViewerId();

    const query = `
      query ($userId: Int!, $status: MediaListStatus) {
        MediaListCollection(userId: $userId, type: ANIME, status: $status) {
          lists {
            entries {
              id
              progress
              media {
                id
                title { romaji english native }
                episodes
                coverImage { medium }
                format
                status
              }
            }
          }
        }
      }
    `;

    const data = await this.request<AniListMediaListCollectionResponse>(query, {
      userId,
      status: "CURRENT",
    });

    return data.MediaListCollection?.lists.flatMap((list) => list.entries) ?? [];
  }
}

export function createAniListClient(accessToken: string | null) {
  return new AniListClient(accessToken);
}
