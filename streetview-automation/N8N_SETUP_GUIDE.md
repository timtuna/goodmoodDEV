# n8n Setup Guide - Step by Step

## Problem: "Address is required" Error

If you're getting this error:
```
"Address is required"
```

It means the HTTP Request node is not sending the `address` field properly.

## Solution: Configure HTTP Request Node

### Step 1: Create HTTP Request Node

1. Add an **HTTP Request** node to your workflow
2. Set **Method**: `POST`
3. Set **URL**: `http://localhost:3000/capture`

### Step 2: Configure Request Body

In the HTTP Request node:

1. **Send Body**: Enable/Toggle ON
2. **Body Content Type**: `JSON`
3. **Specify Body**: Select "Using JSON"

### Step 3: Set JSON Body

Click on "JSON" and enter:

```json
{
  "address": "Brandenburg Gate, Berlin, Germany",
  "headless": true,
  "quality": 85
}
```

**OR** if using expressions from previous nodes:

```json
{
  "address": "={{ $json.address }}",
  "headless": true,
  "quality": 85
}
```

### Step 3b: Advanced Features (Optional)

For multi-position capture or camera control:

```json
{
  "address": "={{ $json.address }}",
  "headless": true,
  "quality": 85,
  "multi_position": true,
  "position_offset": 30,
  "heading": 90,
  "pitch": 90,
  "fov": 75,
  "outdoor_only": true
}
```

**New Parameters:**
- `multi_position` (boolean): Capture left, center, right buildings
- `position_offset` (number): Distance between positions in meters (default: 30)
- `heading` (number): Viewing direction 0-359° (0=North, 90=East, 180=South, 270=West)
- `pitch` (number): Camera tilt (90=horizontal, <90=down, >90=up)
- `fov` (number): Field of view 10-120° (wider = more in frame)
- `outdoor_only` (boolean): Prefer outdoor street view (default: true)
- `street_bearing` (number): Manual street direction override

### Step 4: Alternative - Body Parameters

If you prefer using Body Parameters instead of JSON:

1. **Send Body**: Enable
2. **Body Content Type**: `JSON`
3. **Specify Body**: Select "Using Fields Below"
4. Add these parameters:

| Name | Value |
|------|-------|
| address | `={{ $json.address }}` or `"Times Square, New York"` |
| headless | `true` |
| quality | `85` |

## Complete Working Example

### Option A: Import Fixed Workflow

1. Download: `n8n-workflow-fixed.json`
2. In n8n: Workflows → Import from File
3. Select the file
4. Edit the "Set Address" node to change the address
5. Execute the workflow

### Option B: Manual Configuration

**Node 1: Manual Trigger**
- Type: Manual Trigger
- (No configuration needed)

**Node 2: Set Address**
- Type: Edit Fields (Set)
- Add Assignment:
  - Name: `address`
  - Type: String
  - Value: `Brandenburg Gate, Berlin, Germany`

**Node 3: HTTP Request**
- Method: POST
- URL: `http://localhost:3000/capture`
- Authentication: None
- Send Body: ON
- Body Content Type: JSON
- Specify Body: Using Fields Below
- Body Parameters:
  - `address`: `={{ $json.address }}`
  - `headless`: `true`
  - `quality`: `85`

**Node 4: Check Success (IF)**
- Conditions:
  - `{{ $json.success }}` equals `true`

## Test with cURL First

Before setting up n8n, test the API directly:

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Eiffel Tower, Paris, France",
    "headless": true,
    "quality": 85
  }'
```

You should get a response like:
```json
{
  "success": true,
  "message": "Screenshot captured successfully",
  "data": {
    "filename": "streetview_...",
    "metadata": {...}
  }
}
```

## Common Mistakes

### ❌ Wrong: Empty Body
```json
{}
```

### ❌ Wrong: Address not in body
Query parameters instead of body parameters

### ❌ Wrong: Wrong field name
```json
{
  "location": "Berlin"  // Should be "address"
}
```

### ✅ Correct: Proper JSON with address
```json
{
  "address": "Brandenburg Gate, Berlin",
  "headless": true,
  "quality": 85
}
```

## Troubleshooting

### Error: "Address is required"
**Cause**: The `address` field is missing or empty in the request body

**Fix**:
1. Check HTTP Request node has "Send Body" enabled
2. Verify JSON body contains `"address": "..."`
3. If using expression `={{ $json.address }}`, make sure previous node outputs an address

### Error: "Connection refused"
**Cause**: Service not running

**Fix**:
```bash
cd /home/goodmoodlab/goodmoodDEV
docker compose up -d streetview-capture
```

### Error: "Street View not available"
**Cause**: The address doesn't have Street View coverage

**Fix**:
- Try a more specific address
- Add street numbers
- Use well-known landmarks

## Testing the Setup

### Test 1: Health Check
Add an HTTP Request node:
- Method: GET
- URL: `http://localhost:3000/health`

Expected response:
```json
{
  "status": "ok",
  "service": "streetview-automation"
}
```

### Test 2: Simple Capture
Use the example above with a well-known address like:
- "Times Square, New York"
- "Eiffel Tower, Paris"
- "Big Ben, London"

### Test 3: List Captures
Add an HTTP Request node:
- Method: GET
- URL: `http://localhost:3000/captures`

Shows all captured screenshots with metadata.

## Example Workflow Flow

```
Manual Trigger
    ↓
Set Address ("Brandenburg Gate, Berlin")
    ↓
HTTP Request (POST /capture with address)
    ↓
IF (success = true)
    ↓ Yes              ↓ No
Extract Data      Log Error
    ↓
Success!
```

## Getting the Screenshot File

After successful capture, the response contains:

```json
{
  "data": {
    "filename": "streetview_Brandenburg_Gate_2025-11-10T12-00-00.jpg",
    "paths": {
      "image": "/app/screenshots/streetview_Brandenburg_Gate_2025-11-10T12-00-00.jpg"
    }
  }
}
```

The file is saved to:
```
/home/goodmoodlab/goodmoodDEV/streetview-screenshots/
```

From n8n (which has `/host-home` mounted), access via:
```
/host-home/goodmoodDEV/streetview-screenshots/{{ $json.data.filename }}
```

## Need Help?

1. Check container logs:
   ```bash
   docker logs streetview-capture --tail 50
   ```

2. Test API directly with cURL (see above)

3. Verify n8n can reach the service:
   ```bash
   # From n8n container
   curl http://localhost:3000/health
   ```

4. Check the service info:
   ```bash
   curl http://localhost:3000/info
   ```
