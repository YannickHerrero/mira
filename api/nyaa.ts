import type { VercelRequest, VercelResponse } from "@vercel/node";

const NYAA_BASE_URL = "https://nyaa.si";

/**
 * Proxy Nyaa RSS requests to avoid CORS on web.
 *
 * Example:
 *   /api/nyaa?c=1_2&f=0&q=Jujutsu%20Kaisen&page=rss
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(NYAA_BASE_URL);

  for (const [key, value] of Object.entries(req.query)) {
    if (!value) continue;
    url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
  }

  if (!url.searchParams.has("page")) {
    url.searchParams.set("page", "rss");
  }

  try {
    const response = await fetch(url.toString());
    const body = await response.text();
    res.setHeader("Content-Type", response.headers.get("Content-Type") ?? "application/xml");
    return res.status(response.status).send(body);
  } catch (error) {
    console.error("Nyaa proxy error:", error);
    return res.status(500).json({
      error: "Proxy error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
