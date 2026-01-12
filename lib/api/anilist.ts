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

const ANILIST_API_URL = "https://graphql.anilist.co";

export class AniListClient {
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
}

export function createAniListClient(accessToken: string | null) {
  return new AniListClient(accessToken);
}
