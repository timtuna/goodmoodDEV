# Street View Automation Service

Automated Google Street View screenshot capture service with HTTP API and n8n integration.

## Features

- **HTTP API** for screenshot capture
- **Playwright-based automation** (ARM64 compatible)
- **Headless & visible modes** for different use cases
- **Automatic filename sanitization**
- **Metadata generation** (coordinates, timestamp, URL)
- **JPG output** with configurable quality
- **n8n workflow integration** ready
- **Docker containerized** for easy deployment
- **Health checks** and monitoring support
- **🆕 Multi-position capture** - Capture left, center, and right neighbor buildings
- **🆕 Outdoor view guarantee** - Automatically selects outdoor street view (no business interiors)
- **🆕 Configurable viewing angles** - Control camera heading, pitch, and field of view
- **🆕 Smart street bearing detection** - Faces buildings perpendicularly

## Quick Start

### 1. Build and Start the Service

```bash
cd /home/goodmoodlab/goodmoodDEV
docker compose up -d streetview-capture
```

### 2. Verify Service is Running

```bash
# Check container status
docker ps | grep streetview-capture

# Check health
curl http://localhost:3000/health

# Get service info
curl http://localhost:3000/info
```

### 3. Capture Your First Screenshot

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Times Square, New York, NY",
    "headless": true,
    "quality": 85
  }'
```

### 4. Find Your Screenshot

Screenshots are saved in:
```
/home/goodmoodlab/goodmoodDEV/streetview-screenshots/
```

## API Reference

### POST /capture

Capture a Street View screenshot for the given address.

**Basic Request:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "headless": true,      // optional, default: true
  "quality": 85,         // optional, default: 85 (0-100)
  "width": 1920,         // optional, default: 1920
  "height": 1080         // optional, default: 1080
}
```

**Advanced Request (New Features):**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "headless": true,
  "quality": 85,
  "width": 1920,
  "height": 1080,

  // Camera Control
  "heading": 90,         // optional, viewing direction in degrees (0=North, 90=East, 180=South, 270=West)
  "pitch": 90,           // optional, default: 90 (horizontal view, <90=down, >90=up)
  "fov": 75,             // optional, default: 75 (field of view in degrees, 10-120)

  // View Options
  "outdoor_only": true,  // optional, default: true (prefer outdoor street view, no business interiors)

  // Multi-Position Capture
  "multi_position": false,     // optional, default: false (capture 3 positions: left, center, right)
  "position_offset": 30,       // optional, default: 30 (distance in meters between positions)
  "street_bearing": 0          // optional, manual street direction override in degrees (0-359)
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `address` | string | *required* | Address to capture |
| `headless` | boolean | `true` | Run browser in headless mode |
| `quality` | number | `85` | JPG quality (0-100) |
| `width` | number | `1920` | Screenshot width in pixels |
| `height` | number | `1080` | Screenshot height in pixels |
| `heading` | number | `0` | Camera viewing direction (0=North, 90=East, 180=South, 270=West) |
| `pitch` | number | `90` | Camera pitch/tilt (90=horizontal, <90=down, >90=up) |
| `fov` | number | `75` | Field of view (10-120 degrees) |
| `outdoor_only` | boolean | `true` | Prefer outdoor street view (validated after capture) |
| `multi_position` | boolean | `false` | Capture from 3 positions along street |
| `position_offset` | number | `30` | Distance in meters between multi-position captures |
| `street_bearing` | number | *auto* | Manual street direction override (0-359°) |

**Response (Success):**
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "filename": "streetview_1600_Amphitheatre_Parkway_2025-01-10T12-00-00.jpg",
    "metadata": {
      "address": "1600 Amphitheatre Parkway, Mountain View, CA",
      "url": "https://www.google.com/maps/@...",
      "coordinates": { "lat": 37.422, "lng": -122.084 },
      "capturedAt": "2025-01-10T12:00:00.000Z",
      "screenshot": {
        "width": 1920,
        "height": 1080,
        "quality": 85,
        "format": "jpeg"
      }
    },
    "paths": {
      "image": "/app/screenshots/streetview_..._2025-01-10T12-00-00.jpg",
      "metadata": "/app/screenshots/streetview_..._2025-01-10T12-00-00.json"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Street View not available for address: ...",
  "address": "..."
}
```

### GET /captures

List all captured screenshots.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "captures": [
    {
      "filename": "streetview_address_2025-01-10T12-00-00.jpg",
      "size": 245678,
      "created": "2025-01-10T12:00:00.000Z",
      "metadata": { ... }
    }
  ]
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "streetview-automation",
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

### GET /info

Get service information and available endpoints.

## Advanced Features

### Multi-Position Capture

Capture left, center, and right buildings in a single request - perfect for property analysis!

**Example:**
```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Mülgaustrasse 52, Mönchengladbach",
    "multi_position": true,
    "position_offset": 30,
    "heading": 90
  }'
```

**How it works:**
1. Geocodes the target address
2. Calculates 3 positions along the street (30m apart by default)
3. Captures from each position facing perpendicular to the street
4. Returns 3 screenshots with position labels: `_left.jpg`, `_center.jpg`, `_right.jpg`

**Response:**
```json
{
  "success": true,
  "multi_position": true,
  "captures": [
    {
      "position": "left",
      "filename": "streetview_address_timestamp_left.jpg",
      "coordinates": {"lat": 51.1400, "lng": 6.4545}
    },
    {
      "position": "center",
      "filename": "streetview_address_timestamp_center.jpg",
      "coordinates": {"lat": 51.1398, "lng": 6.4545}
    },
    {
      "position": "right",
      "filename": "streetview_address_timestamp_right.jpg",
      "coordinates": {"lat": 51.1396, "lng": 6.4545}
    }
  ]
}
```

### Configurable Camera Angles

Control the viewing direction to capture specific building facades.

**Example:**
```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Brandenburg Gate, Berlin",
    "heading": 180,
    "pitch": 85,
    "fov": 90
  }'
```

**Camera Parameters:**
- `heading`: 0° = North, 90° = East, 180° = South, 270° = West
- `pitch`: 90° = horizontal (eye level), <90° = looking down, >90° = looking up
- `fov`: Wider angle = more in frame (10-120°)

### Outdoor View Guarantee

The service automatically selects outdoor street view by clicking the Street View thumbnail, avoiding business interior tours.

**How it works:**
1. Navigates to Google Maps search with address
2. Waits for Street View thumbnail (bottom right corner)
3. Clicks thumbnail to enter outdoor Street View
4. Validates the view is outdoor (not interior)
5. Takes screenshot

This ensures you always get street-level outdoor imagery, even for addresses with business listings.

**Manual control:**
```json
{
  "address": "Business Address",
  "outdoor_only": true  // default: true
}
```

## n8n Integration

See [N8N_INTEGRATION.md](./N8N_INTEGRATION.md) for detailed integration guide.

**Quick Import:**
1. Open n8n (http://localhost:5678)
2. Import workflow from `n8n-workflow-example.json`
3. Execute workflow to test

## Project Structure

```
streetview-automation/
├── server.js              # HTTP API server
├── lib/
│   └── capture.js         # Core Street View capture logic
├── package.json           # Node.js dependencies
├── Dockerfile             # Container definition
├── README.md              # This file
├── N8N_INTEGRATION.md     # n8n integration guide
└── n8n-workflow-example.json  # Example workflow
```

## Configuration

### Environment Variables

- `PORT` - API server port (default: 3000)
- `OUTPUT_DIR` - Screenshot output directory (default: /app/screenshots)
- `TZ` - Timezone (default: Europe/Berlin)

### Docker Compose

The service is configured in the main `docker-compose.yml`:

```yaml
streetview-capture:
  build:
    context: ./streetview-automation
  ports:
    - "3000:3000"
  volumes:
    - ./streetview-screenshots:/app/screenshots
  shm_size: 2gb  # Required for Chromium
```

## Headless vs Visible Mode

### Headless (Recommended)

- Faster execution
- Lower resource usage
- Production-ready
- Set `"headless": true` in API request

### Visible Mode - X11 Setup (For Linux Desktop)

Visible mode displays the browser on your desktop during capture - perfect for debugging and development.

**Requirements:**
- X11 display server (most Linux desktops)
- Docker with X11 socket access

**Setup Steps:**

1. **Update docker-compose.yml** to add X11 socket forwarding:

```yaml
streetview-capture:
  environment:
    - DISPLAY=${DISPLAY}
    - QT_X11_NO_MITSHM=1
  volumes:
    - /tmp/.X11-unix:/tmp/.X11-unix:rw
  ipc: host
```

2. **Grant X11 access** (run once per session):

```bash
xhost +local:docker
```

3. **Rebuild and restart** the container:

```bash
docker compose up -d --build streetview-capture
```

4. **Test visible mode:**

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{"address": "Eiffel Tower, Paris", "headless": false}'
```

The browser window will appear on your desktop showing the entire capture process!

**Check your display type:**
```bash
echo $XDG_SESSION_TYPE  # Should show "x11"
echo $DISPLAY           # Should show ":0" or ":1"
```

**Troubleshooting:**
- **"Cannot open display"**: Run `xhost +local:docker` again
- **Wayland users**: Install XWayland compatibility layer
- **No window appears**: Check `docker logs streetview-capture` for errors

**Security Note:** The `xhost +local:docker` command allows local Docker containers to access your X11 display. This is safe for local development but use with caution on multi-user systems.

### Visible Mode - Alternative (VNC)

For remote access or non-X11 environments, VNC server support can be added. Contact for implementation details.

## Output Files

For each capture, two files are created:

### 1. Screenshot (JPG)

**Filename format:** `streetview_<address>_<timestamp>.jpg`

**Example:** `streetview_Times_Square_New_York_2025-01-10T12-30-45.jpg`

### 2. Metadata (JSON)

**Filename format:** `streetview_<address>_<timestamp>.json`

**Content:**
```json
{
  "address": "Times Square, New York, NY",
  "url": "https://www.google.com/maps/@40.758,-73.985,3a...",
  "coordinates": {
    "lat": 40.758,
    "lng": -73.985
  },
  "capturedAt": "2025-01-10T12:30:45.000Z",
  "screenshot": {
    "filename": "streetview_Times_Square_New_York_2025-01-10T12-30-45.jpg",
    "width": 1920,
    "height": 1080,
    "quality": 85,
    "format": "jpeg"
  }
}
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs streetview-capture
```

**Rebuild container:**
```bash
docker compose up -d --build streetview-capture
```

### "Street View not available"

**Causes:**
- Address has no Street View coverage
- Address is too vague

**Solutions:**
- Verify address on Google Maps first
- Try more specific address
- Add landmarks or street numbers

### Timeout Errors

**Causes:**
- Slow internet connection
- Google rate limiting

**Solutions:**
- Wait and retry
- Check internet connection
- Increase timeout in `lib/capture.js`

### Screenshots Show Interior Views

**Cause:**
Address has both outdoor street view and business interior tour available.

**Solution:**
The service automatically selects outdoor views by default. If you're still seeing interiors:
```json
{
  "address": "Your Address",
  "outdoor_only": true  // Ensures outdoor view selection
}
```

### Container Uses Too Much Memory

**Solution:**
Chromium needs significant memory. Ensure:
- `shm_size: 2gb` is set in docker-compose.yml
- Host has sufficient RAM available
- Not running too many simultaneous captures

## Performance Considerations

### Resource Usage

- **Memory:** ~500MB-1GB per capture (due to Chromium)
- **CPU:** Moderate usage during capture (1-5 seconds)
- **Disk:** ~100-500KB per screenshot (depends on quality)

### Optimization Tips

1. **Use headless mode** for production
2. **Limit concurrent requests** (1-2 recommended)
3. **Add delays** between batch captures (2-5 seconds)
4. **Clean up old screenshots** regularly
5. **Monitor with:** `docker stats streetview-capture`

### Rate Limiting

Google may rate-limit requests. Recommended:
- **Max 10-20 captures per minute**
- **Add 2-5 second delays** between requests
- **Implement retry logic** for failures

## Development

### Local Development

```bash
# Install dependencies
cd streetview-automation
npm install

# Run locally
npm start

# Test
npm test
```

### Testing API

```bash
# Test health
curl http://localhost:3000/health

# Test capture
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{"address": "Brandenburg Gate, Berlin"}'

# List captures
curl http://localhost:3000/captures
```

### Viewing Logs

```bash
# Follow logs
docker logs -f streetview-capture

# Last 100 lines
docker logs --tail 100 streetview-capture
```

## Technical Details

### Technology Stack

- **Node.js 20** - Runtime
- **Playwright** - Browser automation
- **Express** - HTTP API server
- **Chromium** - Browser engine
- **Docker** - Containerization

### Browser Configuration

- User agent: Chrome 120 on Linux
- Viewport: 1920x1080 (configurable)
- Arguments: `--no-sandbox`, `--disable-dev-shm-usage`
- Timeout: 30 seconds for page load

### Error Handling

The service handles:
- Invalid addresses
- Street View unavailable
- Network timeouts
- Browser crashes
- File system errors

All errors are logged and returned with appropriate HTTP status codes.

## Security Notes

- Container runs as non-root user `playwright`
- No unnecessary ports exposed
- File access limited to `/app/screenshots`
- Input sanitization for filenames
- No shell command execution

## License

MIT License - See LICENSE file for details

## Support

### Check Service Status

```bash
# Container status
docker ps | grep streetview-capture

# Service health
curl http://localhost:3000/health

# View logs
docker logs streetview-capture
```

### Common Commands

```bash
# Restart service
docker compose restart streetview-capture

# Stop service
docker compose stop streetview-capture

# View real-time logs
docker logs -f streetview-capture

# Clean up old screenshots
rm /home/goodmoodlab/goodmoodDEV/streetview-screenshots/*.jpg
```

## Credits

Built with:
- [Playwright](https://playwright.dev/) - Browser automation
- [Express](https://expressjs.com/) - Web framework
- [Docker](https://www.docker.com/) - Containerization
