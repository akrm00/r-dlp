FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

# Build stage
FROM base AS build

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install Python, pip, ffmpeg, and yt-dlp
RUN apk add --no-cache python3 py3-pip ffmpeg curl \
    && pip3 install --break-system-packages yt-dlp

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Setup yt-dlp auto-update cron (every 6 hours)
COPY cron/update-ytdlp.sh /app/cron/update-ytdlp.sh
RUN chmod +x /app/cron/update-ytdlp.sh \
    && echo "0 */6 * * * /app/cron/update-ytdlp.sh" | crontab -

EXPOSE 3001

CMD ["sh", "-c", "crond && node dist/index.js"]
