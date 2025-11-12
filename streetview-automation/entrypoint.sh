#!/bin/sh
set -e

# Check if DISPLAY is already set (e.g., from host X11 socket)
# If not, start Xvfb for headless operation
if [ -z "$DISPLAY" ] || [ "$DISPLAY" = ":99" ]; then
  echo "No host display detected, starting Xvfb..."
  export DISPLAY=:99
  Xvfb $DISPLAY -screen 0 1920x1080x24 > /dev/null 2>&1 &
  XVFB_PID=$!

  # Wait for Xvfb to be ready
  sleep 2
  echo "Xvfb started on display $DISPLAY"
else
  echo "Using host display: $DISPLAY"
  echo "Browser will appear on your desktop when headless=false"
fi

echo "Starting Node.js server..."
exec node server.js
