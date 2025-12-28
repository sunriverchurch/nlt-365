
import { serve } from "bun";

// In-memory cache
interface CacheEntry {
  data: string;
  timestamp: number;
  date: string;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL

// Backend API key from environment variable
const API_KEY = process.env.NLT_API_KEY;

if (!API_KEY) {
  console.error("ERROR: NLT_API_KEY environment variable is required");
  process.exit(1);
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchReading(date: string): Promise<string> {
  const url = new URL("https://api.nlt.to/api/reading");
  url.searchParams.set("plan", "oycb");
  url.searchParams.set("date", date);
  url.searchParams.set("key", API_KEY!);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`NLT API error: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function getCachedReading(date: string): CacheEntry | null {
  const key = date;
  const entry = cache.get(key);

  if (!entry) return null;

  // Check if cache is expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry;
}

function setCachedReading(date: string, data: string): void {
  const key = date;
  cache.set(key, {
    data,
    timestamp: Date.now(),
    date,
  });
}

// CORS headers allowing everything
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function addCorsHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...corsHeaders,
    ...headers,
  };
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle OPTIONS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return Response.json(
        { status: "ok", cacheSize: cache.size },
        { headers: addCorsHeaders() }
      );
    }

    // Main reading endpoint
    if (url.pathname === "/reading") {
      const date = url.searchParams.get("date") || getTodayDate();

      try {
        // Check cache first
        const cached = getCachedReading(date);

        if (cached) {
          console.log(`Cache HIT for date: ${date}`);
          return new Response(cached.data, {
            headers: addCorsHeaders({
              "Content-Type": "text/html; charset=utf-8",
              "X-Cache": "HIT",
              "X-Cache-Date": cached.date,
            }),
          });
        }

        console.log(`Cache MISS for date: ${date}, fetching from NLT API...`);

        // Fetch from NLT API
        const reading = await fetchReading(date);

        // Cache the result
        setCachedReading(date, reading);

        return new Response(reading, {
          headers: addCorsHeaders({
            "Content-Type": "text/html; charset=utf-8",
            "X-Cache": "MISS",
            "X-Cache-Date": date,
          }),
        });
      } catch (error) {
        console.error("Error fetching reading:", error);
        return Response.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          { status: 500, headers: addCorsHeaders() }
        );
      }
    }

    // Cache stats endpoint
    if (url.pathname === "/cache/stats") {
      const entries = Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        date: entry.date,
        age: Math.round((Date.now() - entry.timestamp) / 1000) + "s",
      }));

      return Response.json(
        {
          size: cache.size,
          ttlMs: CACHE_TTL_MS,
          entries,
        },
        { headers: addCorsHeaders() }
      );
    }

    // Clear cache endpoint
    if (url.pathname === "/cache/clear" && req.method === "POST") {
      cache.clear();
      return Response.json(
        { message: "Cache cleared" },
        { headers: addCorsHeaders() }
      );
    }

    return Response.json(
      { error: "Not found" },
      { status: 404, headers: addCorsHeaders() }
    );
  },
});

console.log(`🚀 NLT Reading API running at http://localhost:${server.port}`);
console.log(`
Endpoints:
  GET  /reading                            - Get today's OYCB reading
  GET  /reading?date=YYYY-MM-DD            - Get reading for specific date
  GET  /health                             - Health check
  GET  /cache/stats                        - View cache statistics
  POST /cache/clear                        - Clear the cache
`);
