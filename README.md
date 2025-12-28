# NLT Reading API

A simple Bun-based API that fetches daily Bible readings from the NLT API using the OYCB (One Year Chronological Bible) reading plan, with in-memory caching.

## Requirements

- [Bun](https://bun.sh/) runtime
- NLT API key from [api.nlt.to](https://api.nlt.to/Account/Register)

## Installation

```bash
# Clone or copy the project
cd nlt-reading-api

# No dependencies to install - Bun has everything built-in!
```

## Running

```bash
# Start the server
bun run start

# Or with hot reload for development
bun run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

### Get Today's Reading

```bash
GET /reading?key=YOUR_API_KEY
```

Returns the current day's OYCB reading as HTML.

### Get Reading for Specific Date

```bash
GET /reading?key=YOUR_API_KEY&date=2025-01-15
```

### Health Check

```bash
GET /health
```

### Cache Statistics

```bash
GET /cache/stats
```

### Clear Cache

```bash
POST /cache/clear
```

## Example Usage

```bash
# Get today's reading
curl "http://localhost:3000/reading?key=YOUR_NLT_API_KEY"

# Get reading for a specific date
curl "http://localhost:3000/reading?key=YOUR_NLT_API_KEY&date=2025-06-15"

# Check cache stats
curl "http://localhost:3000/cache/stats"
```

## Caching

Readings are cached in memory for 1 hour (configurable via `CACHE_TTL_MS` in the source). The cache key includes both the API key and date, so different users won't share cached responses.

Response headers indicate cache status:
- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response fetched from NLT API
- `X-Cache-Date` - The date of the reading

## Notes

- The OYCB plan is hardcoded, but you can modify `src/index.ts` to accept it as a parameter
- Cache is in-memory and resets when the server restarts
- For production use, consider adding rate limiting and persistent caching (Redis, SQLite, etc.)
