/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next spawns multiple worker processes to collect page data during build,
  // each of which imports src/lib/db.ts and opens its own better-sqlite3
  // connection to the same file. With more than one worker these connections
  // race on the initial CREATE TABLE/pragma statements and throw SQLITE_BUSY.
  // Forcing a single worker avoids the race (db.ts also sets a busy_timeout
  // as a second line of defense).
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
