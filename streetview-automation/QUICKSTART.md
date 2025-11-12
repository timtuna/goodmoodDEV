# Quick Start Guide

## ✅ Service is Running!

The Street View Automation Service is fully operational and ready to use.

## Test the Service

### 1. Check Health
```bash
curl http://localhost:3000/health
```

### 2. Capture a Screenshot
```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Times Square, New York",
    "headless": true,
    "quality": 85
  }'
```

### 3. List All Captures
```bash
curl http://localhost:3000/captures
```

### 4. Run Test Script
```bash
cd /home/goodmoodlab/goodmoodDEV/streetview-automation
node test.js
```

## Key Features

- ✅ **Geocoding**: Uses OpenStreetMap Nominatim for address resolution
- ✅ **Consent Handling**: Automatically handles Google cookie consent
- ✅ **Metadata**: Saves coordinates, timestamp, and URL with each capture
- ✅ **Quality Control**: Configurable JPG quality (0-100)
- ✅ **Headless Mode**: Fast, background execution
- ✅ **n8n Ready**: Easy workflow integration
- ✅ **🆕 Multi-Position Capture**: Capture left, center, and right views in one request
- ✅ **🆕 Outdoor View Guarantee**: Automatically selects outdoor street view (no business interiors)
- ✅ **🆕 Camera Control**: Configurable heading, pitch, and field of view

## Output Files

Screenshots are saved to:
```
/home/goodmoodlab/goodmoodDEV/streetview-screenshots/
```

Each capture produces two files:
- `streetview_<address>_<timestamp>.jpg` - The screenshot
- `streetview_<address>_<timestamp>.json` - Metadata

## n8n Integration

Import the example workflow:
```
streetview-automation/n8n-workflow-example.json
```

The workflow accepts an `address` field and returns:
- Screenshot filename
- Coordinates (lat, lng)
- Capture timestamp
- File paths

## API Endpoints

### POST /capture
Capture a Street View screenshot

**Request:**
```json
{
  "address": "Eiffel Tower, Paris, France",
  "headless": true,
  "quality": 85,
  "width": 1920,
  "height": 1080
}
```

**Response:**
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "filename": "streetview_Eiffel_Tower_Paris_France_2025-11-10T12-00-00.jpg",
    "metadata": {
      "address": "Eiffel Tower, Paris, France",
      "coordinates": {"lat": 48.8582, "lng": 2.2945},
      "capturedAt": "2025-11-10T12:00:00.000Z",
      "url": "https://www.google.com/maps/@...",
      "screenshot": {
        "width": 1920,
        "height": 1080,
        "quality": 85,
        "format": "jpeg"
      }
    }
  }
}
```

### GET /captures
List all captured screenshots with metadata

### GET /health
Health check endpoint (returns `{"status": "ok"}`)

### GET /info
Service information and endpoint documentation

## Troubleshooting

### Container Not Running
```bash
docker compose up -d streetview-capture
docker logs streetview-capture
```

### Permission Errors
```bash
chmod 777 /home/goodmoodlab/goodmoodDEV/streetview-screenshots
```

### Street View Not Available
- Verify the address exists and has Street View coverage
- Check coordinates in the error message
- Try a more specific address

## Performance

- **Average capture time**: 15-20 seconds
- **Geocoding**: ~1 second
- **Browser launch**: ~2 seconds
- **Street View load**: ~10-15 seconds
- **Screenshot**: <1 second

## Rate Limiting

Recommended limits:
- **Max 10-20 requests per minute**
- **Add 2-5 second delays** between batches
- **Respect Nominatim**: 1 request/second for geocoding

## Examples

### Multi-Position Capture (NEW!)
Capture left, center, and right buildings in one request:
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

Creates 3 files:
- `streetview_..._left.jpg` - Left neighbor building
- `streetview_..._center.jpg` - Target building
- `streetview_..._right.jpg` - Right neighbor building

### Custom Camera Angle
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

### Batch Capture Multiple Addresses
```bash
for addr in "Eiffel Tower, Paris" "Big Ben, London" "Colosseum, Rome"; do
  curl -X POST http://localhost:3000/capture \
    -H "Content-Type: application/json" \
    -d "{\"address\": \"$addr\", \"headless\": true}"
  sleep 3
done
```

### High Quality Capture
```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Grand Canyon, Arizona",
    "quality": 95,
    "width": 2560,
    "height": 1440
  }'
```

## Next Steps

1. ✅ Service is running on port 3000
2. ✅ Test with `node test.js`
3. ✅ Import n8n workflow example
4. ✅ Start automating!

For detailed documentation, see `README.md` and `N8N_INTEGRATION.md`.
