# --- deps + build stage ---
FROM node:20-alpine AS builder
# better-sqlite3 needs to compile a native addon
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine AS runner
RUN apk add --no-cache sqlite

WORKDIR /app
ENV NODE_ENV=production
ENV CYSA_DB_PATH=/app/db-data/cysa.db

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data
COPY --from=builder /app/src/lib ./src/lib

# /app/data holds the question-bank JSON that ships WITH the image (updated on
# each rebuild via git pull). /app/db-data is where the actual SQLite progress
# file lives, and is the only path that should be volume-mounted -- keeping
# these separate means a rebuild with new questions.json content never gets
# shadowed by a stale volume, while your SRS progress/streak/exam history
# always survives rebuilds and restarts untouched.
RUN mkdir -p /app/db-data

EXPOSE 3000
CMD ["sh", "-c", "npx tsx scripts/seed.ts && npm run start"]
