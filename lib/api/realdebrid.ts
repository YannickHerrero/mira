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

const RD_API_URL = "https://api.real-debrid.com/rest/1.0";

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
    const url = `${RD_API_URL}${endpoint}`;

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

    return response.json();
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
