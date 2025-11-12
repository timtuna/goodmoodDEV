FROM node:20-bullseye-slim

# Install dependencies for Playwright and Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    tzdata \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set timezone
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev

# Install Playwright browsers and dependencies
# Set browser path to a location accessible by all users
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy entrypoint script first
COPY entrypoint.sh /app/entrypoint.sh

# Copy application code
COPY . .

# Create screenshots directory
RUN mkdir -p /app/screenshots

# Use the existing 'node' user (UID 1000:1000) from base image
# This matches host user goodmoodlab, ensuring correct file ownership
RUN usermod -a -G audio,video node && \
    chown -R node:node /app && \
    chmod -R 755 /opt/ms-playwright && \
    chmod +x /app/entrypoint.sh

USER node

# Set browser path for runtime
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

# Set DISPLAY for xvfb
ENV DISPLAY=:99

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server with xvfb (virtual display) to support both headless modes
# Entrypoint script starts Xvfb and then the Node.js server
CMD ["/app/entrypoint.sh"]
