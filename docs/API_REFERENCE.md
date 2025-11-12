# Street View Capture API Reference

Complete API documentation for the Street View Automation service.

## Base URL

```
http://localhost:3000
```

When deployed, replace `localhost:3000` with your service URL.

---

## Table of Contents

1. [Health Check](#health-check)
2. [Capture Street View](#capture-street-view)
3. [List Captures](#list-captures)
4. [Results Viewer](#results-viewer)
5. [Parameter Reference](#parameter-reference)
6. [Response Formats](#response-formats)
7. [Examples](#examples)
8. [Error Handling](#error-handling)

---

## Health Check

Check if the service is running.

### Endpoint
```
GET /health
```

### Response
```json
{
  "status": "ok",
  "service": "streetview-automation",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Capture Street View

Capture Street View images from a specified address.

### Endpoint
```
POST /capture
```

### Headers
```
Content-Type: application/json
```

### Request Body

All parameters except `address` are optional.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `address` | string | **Yes** | - | Location to capture (address or coordinates) |
| `headless` | boolean | No | `true` | Run browser in headless mode |
| `quality` | number | No | `85` | JPEG quality (0-100) |
| `width` | number | No | `1920` | Image width in pixels |
| `height` | number | No | `1080` | Image height in pixels |
| `heading` | number | No | auto | Camera direction in degrees (0-360) |
| `pitch` | number | No | `90` | Camera tilt (0-180, 90=horizontal) |
| `fov` | number | No | `75` | Field of view (10-120 degrees) |
| `outdoor_only` | boolean | No | `true` | Avoid business interior tours |
| `multi_position` | boolean | No | `false` | Capture 3 positions (left, center, right) |
| `position_offset` | number | No | `30` | Distance between positions in meters |
| `street_bearing` | number | No | auto | Street direction override (0-360) |

### Response (Single Position)

```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "success": true,
    "filename": "streetview_Times_Square_2025-11-12T10-30-00.jpg",
    "metadata": {
      "address": "Times Square, New York, NY",
      "coordinates": {
        "lat": 40.758896,
        "lng": -73.985130
      },
      "heading": 45,
      "pitch": 90,
      "fov": 75,
      "timestamp": "2025-11-12T10:30:00.000Z",
      "dimensions": {
        "width": 1920,
        "height": 1080,
        "quality": 85,
        "format": "jpeg"
      }
    },
    "paths": {
      "image": "/app/screenshots/streetview_Times_Square_2025-11-12T10-30-00.jpg",
      "metadata": "/app/screenshots/streetview_Times_Square_2025-11-12T10-30-00.json"
    },
    "image_url": "http://localhost:3000/screenshots/streetview_Times_Square_2025-11-12T10-30-00.jpg",
    "thumbnail_url": "http://localhost:3000/screenshots/streetview_Times_Square_2025-11-12T10-30-00.jpg",
    "viewer_url": "http://localhost:3000/"
  }
}
```

### Response (Multi-Position)

```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "success": true,
    "multi_position": true,
    "target_address": "Mülgaustrasse 52, Mönchengladbach",
    "street_bearing": 90,
    "building_heading": 0,
    "position_offset": 30,
    "captures": [
      {
        "position": "left",
        "heading": 0,
        "coordinates": { "lat": 51.2134, "lng": 6.4321 },
        "description": "Left neighbor property",
        "success": true,
        "filename": "streetview_Mülgaustrasse_52_2025-11-12T10-30-00_left.jpg",
        "metadata": { ... },
        "paths": { ... },
        "image_url": "http://localhost:3000/screenshots/..._left.jpg",
        "thumbnail_url": "http://localhost:3000/screenshots/..._left.jpg"
      },
      {
        "position": "center",
        "heading": 0,
        "coordinates": { "lat": 51.2135, "lng": 6.4322 },
        "description": "Target property",
        "success": true,
        "filename": "streetview_Mülgaustrasse_52_2025-11-12T10-30-01_center.jpg",
        "metadata": { ... },
        "paths": { ... },
        "image_url": "http://localhost:3000/screenshots/..._center.jpg",
        "thumbnail_url": "http://localhost:3000/screenshots/..._center.jpg"
      },
      {
        "position": "right",
        "heading": 0,
        "coordinates": { "lat": 51.2136, "lng": 6.4323 },
        "description": "Right neighbor property",
        "success": true,
        "filename": "streetview_Mülgaustrasse_52_2025-11-12T10-30-02_right.jpg",
        "metadata": { ... },
        "paths": { ... },
        "image_url": "http://localhost:3000/screenshots/..._right.jpg",
        "thumbnail_url": "http://localhost:3000/screenshots/..._right.jpg"
      }
    ],
    "viewer_url": "http://localhost:3000/"
  }
}
```

---

## List Captures

Get a list of all captured screenshots.

### Endpoint
```
GET /captures
```

### Response
```json
{
  "success": true,
  "count": 15,
  "captures": [
    {
      "filename": "streetview_Times_Square_2025-11-12T10-30-00.jpg",
      "size": 245678,
      "created": "2025-11-12T10:30:00.000Z",
      "metadata": {
        "address": "Times Square, New York",
        "coordinates": { "lat": 40.758896, "lng": -73.985130 },
        ...
      }
    },
    ...
  ]
}
```

---

## Results Viewer

Interactive web interface to view captured images and analysis results.

### Access
```
GET /
```

Opens the HTML results viewer with thumbnail gallery, image viewer, and analysis results panel.

### Features
- Thumbnail grid of captured images
- Click to expand and view full image
- Display AI analysis results alongside image
- Keyboard navigation (arrow keys)
- Responsive design

---

## Parameter Reference

### Address (required)

**Type:** `string`
**Example:** `"Brandenburg Gate, Berlin"` or `"40.758896,-73.985130"`

The location to capture. Can be:
- Full address: `"1600 Amphitheatre Parkway, Mountain View, CA"`
- Landmark name: `"Eiffel Tower, Paris"`
- Coordinates: `"48.8584,2.2945"`

---

### Headless

**Type:** `boolean`
**Default:** `true`
**Example:** `false`

Run browser in headless mode:
- `true`: Browser runs without visible window (faster, for production)
- `false`: Browser window visible (useful for debugging)

---

### Quality

**Type:** `number`
**Range:** `0-100`
**Default:** `85`
**Example:** `95`

JPEG compression quality:
- `100`: Maximum quality, larger file size
- `85`: Good balance of quality and size
- `50`: Lower quality, smaller file size

---

### Width & Height

**Type:** `number`
**Default:** `1920` x `1080`
**Example:** `3840` x `2160`

Image dimensions in pixels. Common sizes:
- HD: `1280` x `720`
- Full HD: `1920` x `1080`
- 4K: `3840` x `2160`

---

### Heading

**Type:** `number`
**Range:** `0-360`
**Default:** Auto-calculated (perpendicular to street)
**Example:** `180`

Camera rotation angle in degrees:
- `0`: North
- `90`: East
- `180`: South
- `270`: West

---

### Pitch

**Type:** `number`
**Range:** `0-180`
**Default:** `90` (horizontal)
**Example:** `80`

Camera tilt angle:
- `0`: Looking straight down
- `90`: Looking horizontally (eye level)
- `180`: Looking straight up

---

### FOV (Field of View)

**Type:** `number`
**Range:** `10-120`
**Default:** `75`
**Example:** `90`

Camera zoom level:
- `120`: Wide angle (zoomed out)
- `75`: Normal view
- `10`: Narrow view (zoomed in)

---

### Outdoor Only

**Type:** `boolean`
**Default:** `true`
**Example:** `true`

Attempt to capture outdoor street views:
- `true`: Avoids business interior tours
- `false`: May capture indoor 360° tours

---

### Multi-Position

**Type:** `boolean`
**Default:** `false`
**Example:** `true`

Capture multiple viewpoints:
- `false`: Single image at target address
- `true`: Three images (left neighbor, target, right neighbor)

---

### Position Offset

**Type:** `number`
**Unit:** meters
**Default:** `30`
**Example:** `50`

Distance between multi-position captures:
- Smaller values: Captures closer together
- Larger values: Wider coverage
- Recommended: 20-50 meters

---

### Street Bearing

**Type:** `number`
**Range:** `0-360`
**Default:** Auto-detected
**Example:** `90`

Street direction override:
- `0`: Street runs north-south
- `90`: Street runs east-west
- Manual override if auto-detection is incorrect

---

## Examples

### 1. Basic Single Capture

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Eiffel Tower, Paris"
  }'
```

### 2. High-Quality Single Capture

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Times Square, New York",
    "quality": 95,
    "width": 3840,
    "height": 2160
  }'
```

### 3. Multi-Position Real Estate Capture

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Mülgaustrasse 52, Mönchengladbach",
    "multi_position": true,
    "position_offset": 30,
    "street_bearing": 90,
    "heading": 0
  }'
```

### 4. Custom Camera Angle

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Golden Gate Bridge, San Francisco",
    "heading": 270,
    "pitch": 100,
    "fov": 90
  }'
```

### 5. Debugging with Visible Browser

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Brandenburg Gate, Berlin",
    "headless": false
  }'
```

### 6. Wide Area Multi-Position

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Main Street, Downtown",
    "multi_position": true,
    "position_offset": 50,
    "outdoor_only": true
  }'
```

---

## Use Cases

### Real Estate Property Analysis

Capture target property and neighboring properties for comparison:

```json
{
  "address": "123 Oak Street, Chicago, IL",
  "multi_position": true,
  "position_offset": 25,
  "quality": 90,
  "width": 2560,
  "height": 1440
}
```

### Traffic and Pedestrian Analysis

Capture busy intersections for traffic studies:

```json
{
  "address": "Broadway & 7th Ave, New York",
  "heading": 45,
  "fov": 90,
  "quality": 85
}
```

### Architectural Documentation

High-resolution captures for building documentation:

```json
{
  "address": "Notre-Dame Cathedral, Paris",
  "quality": 95,
  "width": 3840,
  "height": 2160,
  "heading": 180,
  "pitch": 95,
  "fov": 75
}
```

### Street Condition Monitoring

Regular captures to monitor infrastructure:

```json
{
  "address": "Highway 101, Mile Marker 45",
  "multi_position": true,
  "position_offset": 100
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "address": "requested address"
}
```

### Common Errors

#### 1. Invalid Address

```json
{
  "success": false,
  "error": "Failed to geocode address: INVALID_ADDRESS",
  "address": "nonexistent place"
}
```

**Solution:** Verify the address exists and is correctly formatted.

---

#### 2. No Street View Coverage

```json
{
  "success": false,
  "error": "No Street View coverage at this location",
  "address": "Remote Location, Antarctica"
}
```

**Solution:** Check if Google Street View covers the area.

---

#### 3. Parameter Validation Errors

```json
{
  "success": false,
  "error": "quality must be a number between 0 and 100"
}
```

**Solution:** Ensure all parameters are within valid ranges.

---

#### 4. Timeout Errors

```json
{
  "success": false,
  "error": "Capture timeout after 60000ms"
}
```

**Solution:** Try again, or increase timeout in configuration.

---

## Best Practices

### 1. Headless Mode for Production

Always use `headless: true` in production environments for better performance.

```json
{
  "address": "...",
  "headless": true
}
```

### 2. Appropriate Quality Settings

Balance quality and file size:
- Real estate: `quality: 90`
- Analysis/ML: `quality: 85`
- Quick preview: `quality: 70`

### 3. Multi-Position Parameters

For best results with multi-position captures:
- Specify `street_bearing` manually if auto-detection is wrong
- Use `position_offset` between 20-50 meters
- Set `outdoor_only: true` to avoid interiors

### 4. Error Handling

Always check `success` field before processing results:

```javascript
const response = await fetch('/capture', { method: 'POST', body: JSON.stringify(params) });
const result = await response.json();

if (!result.success) {
  console.error('Capture failed:', result.error);
  return;
}

// Process successful result
const imageUrl = result.data.image_url;
```

### 5. Rate Limiting

Be respectful of Google's services:
- Add delays between consecutive requests
- Don't make excessive requests for the same location
- Use cached results when possible

---

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function captureStreetView(address) {
  try {
    const response = await axios.post('http://localhost:3000/capture', {
      address,
      multi_position: true,
      quality: 85
    });

    if (response.data.success) {
      console.log('Capture successful!');
      console.log('View results:', response.data.data.viewer_url);
      return response.data.data;
    }
  } catch (error) {
    console.error('Capture failed:', error.message);
  }
}

captureStreetView('Eiffel Tower, Paris');
```

### Python

```python
import requests

def capture_street_view(address):
    url = 'http://localhost:3000/capture'
    payload = {
        'address': address,
        'multi_position': True,
        'quality': 85
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result['success']:
        print('Capture successful!')
        print(f"View results: {result['data']['viewer_url']}")
        return result['data']
    else:
        print(f"Capture failed: {result['error']}")

capture_street_view('Eiffel Tower, Paris')
```

### cURL

```bash
#!/bin/bash

ADDRESS="Eiffel Tower, Paris"

curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$ADDRESS\",
    \"multi_position\": true,
    \"quality\": 85
  }" | jq '.'
```

---

## Troubleshooting

### Problem: Images show business interiors instead of street

**Solution:**
1. Set `outdoor_only: true`
2. Use `multi_position: false` for single captures
3. Try adjusting `position_offset` to move away from building entrance

---

### Problem: Camera pointing wrong direction

**Solution:**
1. Manually specify `heading` (0-360 degrees)
2. Override `street_bearing` if street direction is incorrect
3. Experiment with heading values in non-headless mode

---

### Problem: Multi-position images are identical

**Solution:**
1. Increase `position_offset` (try 40-50 meters)
2. Check if Street View has coverage at offset positions
3. Verify `street_bearing` is correctly oriented along the street

---

### Problem: Capture timeout

**Solution:**
1. Check internet connection
2. Verify Google Maps is accessible
3. Try with `headless: false` to see what's happening
4. Some locations may have slow-loading Street View data

---

## Advanced Configuration

### Docker Environment Variables

```yaml
services:
  streetview-capture:
    environment:
      - PORT=3000
      - OUTPUT_DIR=/app/screenshots
      - NODE_ENV=production
```

### Volume Mounts

```yaml
volumes:
  - ./streetview-screenshots:/app/screenshots
  - ./streetview-automation/public:/app/public
```

---

## API Versioning

Current version: **v1**

All endpoints are currently unversioned. Future versions will use URL prefixing:
- v1: `/api/v1/capture`
- v2: `/api/v2/capture`

---

## Support & Feedback

For issues, suggestions, or contributions:
- GitHub: https://github.com/timtuna/goodmoodDEV
- Create an issue with detailed information about your use case

---

**Last Updated:** 2025-11-12
**API Version:** 1.0.0
