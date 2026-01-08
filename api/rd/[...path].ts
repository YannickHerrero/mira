import type { VercelRequest, VercelResponse } from "@vercel/node";

const RD_API_URL = "https://api.real-debrid.com/rest/1.0";

/**
 * Vercel serverless function that proxies requests to Real-Debrid API
 * to avoid CORS issues on the web platform.
 *
 * Routes:
 *   /api/rd/user -> https://api.real-debrid.com/rest/1.0/user
 *   /api/rd/torrents -> https://api.real-debrid.com/rest/1.0/torrents
 *   etc.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Extract the path segments after /api/rd/
  const { path } = req.query;
  const pathSegments = Array.isArray(path) ? path : [path];
  const endpoint = `/${pathSegments.join("/")}`;

  // Build the target URL with query parameters
  const url = new URL(`${RD_API_URL}${endpoint}`);

  // Forward query parameters (excluding 'path' which is the catch-all)
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== "path" && value) {
      url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  }

  // Get authorization header from the request
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  try {
    // Forward the request to Real-Debrid
    const response = await fetch(url.toString(), {
      method: req.method || "GET",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" && req.body ? JSON.stringify(req.body) : undefined,
    });

    // Get the response data
    const data = await response.json();

    // Forward the status code and response
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Real-Debrid proxy error:", error);
    return res.status(500).json({
      error: "Proxy error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
