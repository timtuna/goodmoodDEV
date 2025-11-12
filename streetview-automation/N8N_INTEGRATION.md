# n8n Integration Guide

This guide shows you how to integrate the Street View Automation Service with n8n workflows.

## Prerequisites

- n8n running and accessible
- Street View Automation Service running (see main README.md)
- Both services can communicate (typically via localhost or Docker network)

## Quick Start

### 1. Import Example Workflow

1. Open your n8n interface (http://localhost:5678)
2. Click on "Workflows" in the left menu
3. Click "+ Add workflow" button
4. Click the three dots menu (⋮) in the top right
5. Select "Import from File"
6. Choose the `n8n-workflow-example.json` file
7. Click "Save"

### 2. Test the Workflow

1. Open the imported workflow
2. Click on the "Set Parameters" node
3. Modify the address if desired
4. Click "Execute Workflow" button
5. Check the execution results

## API Endpoints

### Capture Screenshot

**Endpoint:** `POST http://localhost:3000/capture`

**Basic Request Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "headless": true,
  "quality": 85,
  "width": 1920,
  "height": 1080
}
```

**Advanced Request Body (New Features):**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "headless": true,
  "quality": 85,
  "width": 1920,
  "height": 1080,

  // Camera control
  "heading": 90,         // viewing direction (0=North, 90=East, 180=South, 270=West)
  "pitch": 90,           // camera tilt (90=horizontal)
  "fov": 75,             // field of view (10-120)

  // View options
  "outdoor_only": true,  // prefer outdoor street view (default: true)

  // Multi-position capture
  "multi_position": true,      // capture left, center, right (default: false)
  "position_offset": 30,       // distance between positions in meters
  "street_bearing": 0          // manual street direction override
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "success": true,
    "filename": "streetview_1600_Amphitheatre_Parkway_2025-01-10T12-00-00.jpg",
    "metadata": {
      "address": "1600 Amphitheatre Parkway, Mountain View, CA",
      "url": "https://www.google.com/maps/@37.4220656,-122.0840897,3a,75y,90t/data=...",
      "coordinates": {
        "lat": 37.4220656,
        "lng": -122.0840897
      },
      "capturedAt": "2025-01-10T12:00:00.000Z",
      "screenshot": {
        "filename": "streetview_1600_Amphitheatre_Parkway_2025-01-10T12-00-00.jpg",
        "width": 1920,
        "height": 1080,
        "quality": 85,
        "format": "jpeg"
      }
    },
    "paths": {
      "image": "/app/screenshots/streetview_1600_Amphitheatre_Parkway_2025-01-10T12-00-00.jpg",
      "metadata": "/app/screenshots/streetview_1600_Amphitheatre_Parkway_2025-01-10T12-00-00.json"
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

### List Captures

**Endpoint:** `GET http://localhost:3000/captures`

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

### Health Check

**Endpoint:** `GET http://localhost:3000/health`

**Response:**
```json
{
  "status": "ok",
  "service": "streetview-automation",
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

## Advanced n8n Workflows (New Features)

### Multi-Position Property Analysis

Capture left, center, and right buildings for comprehensive property analysis.

**HTTP Request node settings:**
- **Method:** POST
- **URL:** `http://localhost:3000/capture`
- **Body:**
```json
{
  "address": "{{ $json.address }}",
  "multi_position": true,
  "position_offset": 30,
  "heading": 90,
  "headless": true
}
```

**Output:** 3 screenshots with position labels (`_left.jpg`, `_center.jpg`, `_right.jpg`)

### Custom Camera Angle Workflow

Control viewing direction for specific building facades.

**HTTP Request node:**
```json
{
  "address": "{{ $json.address }}",
  "heading": {{ $json.heading }},
  "pitch": 85,
  "fov": 90,
  "outdoor_only": true
}
```

**Input data format:**
```json
{
  "address": "Brandenburg Gate, Berlin",
  "heading": 180
}
```

### Outdoor View Only Workflow

Ensure all captures are outdoor street views (no business interiors).

**HTTP Request node:**
```json
{
  "address": "{{ $json.address }}",
  "outdoor_only": true,
  "headless": true
}
```

This automatically clicks the Street View thumbnail to avoid business interior tours.

## Common Use Cases

### 1. Single Address Capture

Use the example workflow as-is, just modify the address in the "Set Parameters" node.

### 2. Batch Processing Multiple Addresses

**Setup:**
1. Add a "Code" or "Function" node with an array of addresses
2. Add a "Split In Batches" node to process them sequentially
3. Connect to the capture flow

**Example addresses array:**
```javascript
return [
  { json: { address: "Times Square, New York, NY" } },
  { json: { address: "Eiffel Tower, Paris, France" } },
  { json: { address: "Big Ben, London, UK" } }
];
```

### 3. Webhook-Triggered Capture

**Setup:**
1. Replace "Manual Trigger" with "Webhook" node
2. Set webhook path (e.g., `/capture-streetview`)
3. Extract address from webhook payload

**Example webhook payload:**
```json
{
  "address": "Brandenburg Gate, Berlin, Germany",
  "headless": true,
  "quality": 90
}
```

### 4. Scheduled Captures

**Setup:**
1. Replace "Manual Trigger" with "Cron" or "Schedule" node
2. Set schedule (e.g., daily at 9:00 AM)
3. Add node to fetch addresses from database/API
4. Connect to capture flow

### 5. Email Notification with Screenshot

**Setup:**
1. After successful capture, add "Read/Write Files" node
2. Read the screenshot file from the output directory
3. Add "Send Email" node with attachment

**File path:**
- Host: `/home/goodmoodlab/goodmoodDEV/streetview-screenshots/`
- Container: `/app/screenshots/`

## Accessing Captured Files

### From n8n Container

Since n8n has access to `/host-home` (mounted in docker-compose.yml), you can access screenshots:

**Path in n8n workflows:**
```
/host-home/goodmoodDEV/streetview-screenshots/
```

### From Host System

Screenshots are saved in:
```
/home/goodmoodlab/goodmoodDEV/streetview-screenshots/
```

### In n8n "Read Binary File" Node

```
/host-home/goodmoodDEV/streetview-screenshots/{{ $json.image_filename }}
```

## Headless vs Visible Mode

### Headless Mode (Default)
- Faster execution
- Lower resource usage
- No display required
- Recommended for production

### Visible Mode
- Useful for debugging
- See exactly what the browser sees
- Requires X11 forwarding (more complex setup)
- Not recommended for regular automation

**To use visible mode:**
```json
{
  "address": "Your address here",
  "headless": false
}
```

## Troubleshooting

### Error: "Connection refused"

**Solution:** Ensure the streetview-capture container is running:
```bash
docker ps | grep streetview-capture
```

If not running:
```bash
cd /home/goodmoodlab/goodmoodDEV
docker compose up -d streetview-capture
```

### Error: "Street View not available"

**Cause:** The address doesn't have Street View coverage

**Solution:**
- Check the address on Google Maps first
- Try a more specific address
- Add nearby landmarks

### Error: "Timeout"

**Cause:** Page took too long to load

**Solution:**
- Check internet connection
- Increase timeout in capture.js (default: 30s)
- Try again later (Google may be rate-limiting)

### Screenshots are blank or incomplete

**Solution:**
- Increase wait time in lib/capture.js (currently 3s + 2s)
- Check if Street View loaded properly
- Try different address

## Performance Tips

1. **Use headless mode** for better performance
2. **Batch similar addresses** to reuse browser sessions
3. **Add delays between requests** to avoid rate limiting (2-5 seconds recommended)
4. **Monitor resource usage** with `docker stats streetview-capture`
5. **Clean up old screenshots** periodically to save disk space

## Advanced: Custom Workflow Examples

### Example: Real Estate Photo Collection

1. Webhook receives property address
2. Capture Street View
3. Fetch property data from API
4. Combine screenshot + data into PDF
5. Email to real estate agent

### Example: Location Verification

1. Customer submits address via form
2. Capture Street View
3. AI analyzes image (building type, condition)
4. Store results in database
5. Send confirmation email

### Example: Travel Planner

1. User provides list of destinations
2. Capture Street View for each location
3. Generate travel guide PDF with screenshots
4. Upload to cloud storage
5. Share link with user

## Support

For issues or questions:
- Check container logs: `docker logs streetview-capture`
- Test API directly: `curl http://localhost:3000/health`
- Review service info: `curl http://localhost:3000/info`
