#!/bin/bash
set -e

PORT=${PORT:-18115}

EXPO_PACKAGER_PROXY_URL="https://$REPLIT_EXPO_DEV_DOMAIN" \
EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN" \
EXPO_PUBLIC_REPL_ID="$REPL_ID" \
REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_EXPO_DEV_DOMAIN" \
pnpm exec expo start --localhost --port "$PORT" &

EXPO_PID=$!

echo "[prewarm] Waiting for Metro to be ready..."
for i in $(seq 1 30); do
  STATUS=$(curl -s --max-time 2 "http://localhost:$PORT/status" 2>/dev/null || echo "")
  if echo "$STATUS" | grep -q "running"; then
    echo "[prewarm] Metro is ready after ${i}s"
    break
  fi
  sleep 1
done

prewarm_platform() {
  PLATFORM=$1
  echo "[prewarm] Fetching $PLATFORM manifest..."
  MANIFEST=$(curl -s --max-time 10 "http://localhost:$PORT/" \
    -H "expo-platform: $PLATFORM" \
    -H "expo-protocol-version: 1" 2>/dev/null)

  if [ -z "$MANIFEST" ]; then
    echo "[prewarm] No manifest for $PLATFORM, skipping"
    return
  fi

  BUNDLE_PATH=$(echo "$MANIFEST" | node -e "
    try {
      const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
      const url = d.launchAsset && d.launchAsset.url;
      if (!url) { process.exit(1); }
      const path = url.replace(/^https?:\/\/[^\/]+\//, '/');
      process.stdout.write(path);
    } catch(e) { process.exit(1); }
  " 2>/dev/null)

  if [ -z "$BUNDLE_PATH" ]; then
    echo "[prewarm] Could not extract bundle path for $PLATFORM"
    return
  fi

  echo "[prewarm] Pre-warming $PLATFORM bundle (background)..."
  curl -s "http://localhost:$PORT$BUNDLE_PATH" \
    -o /tmp/prewarm_${PLATFORM}.js \
    --max-time 300 \
    -w "[prewarm] $PLATFORM done: HTTP %{http_code}, %{size_download} bytes, %{time_total}s\n" \
    2>/dev/null &
  echo "[prewarm] $PLATFORM compilation started (PID=$!)"
}

prewarm_platform android
prewarm_platform ios

wait $EXPO_PID
