# r-dlp

A desktop video and audio downloader powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp). Built with Tauri v2, React 19, and Rust.

![r-dlp screenshot](capture.png)

## Features

- Paste any URL and analyze available formats (video, audio, or both)
- Browse detailed format info: resolution, codec, bitrate, file size
- Download directly to your chosen location via native file dialog
- Open downloaded files in your system file explorer
- Auto-installs yt-dlp on first launch
- Dark / light theme

## Supported Sites

Powered by yt-dlp, r-dlp supports **1000+ websites** including:

YouTube, Twitch, Twitter/X, Instagram, TikTok, Facebook, Reddit, Dailymotion, Vimeo, SoundCloud, Bandcamp, Bilibili, Niconico, and [many more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, TypeScript, TailwindCSS 4, shadcn/ui |
| Backend  | Rust, Tauri v2                      |
| Engine   | yt-dlp (auto-installed)             |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install)

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```