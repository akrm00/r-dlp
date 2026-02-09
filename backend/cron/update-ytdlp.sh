#!/bin/sh
OLD_VERSION=$(yt-dlp --version 2>/dev/null || echo "unknown")
pip3 install --break-system-packages --upgrade yt-dlp >/dev/null 2>&1
NEW_VERSION=$(yt-dlp --version 2>/dev/null || echo "unknown")
echo "$(date -Iseconds): yt-dlp updated from ${OLD_VERSION} to ${NEW_VERSION}" >> /var/log/ytdlp-update.log
