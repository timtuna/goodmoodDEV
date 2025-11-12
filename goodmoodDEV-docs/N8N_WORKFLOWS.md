# n8n Workflows for GoodmoodDEV Platform

Ready-to-import n8n workflows for the multi-container automation platform.

## Import Troubleshooting

If you encounter errors when importing workflows, try these solutions:

### Issue 1: "Could not find property option"

**Solution**: Use **`n8n-workflow-minimal-fixed.json`** - the most compatible workflow.

This workflow uses:
- typeVersion 3 for HTTP Request
- `sendBody: true` with `contentType: "json"` for proper JSON requests
- Simple bodyParameters structure
- No complex conditionals or error handling

### Issue 2: "The resource you are requesting could not be found"

This error occurs when the HTTP Request node sends form data instead of JSON.

**Solution**: The workflow must use:
```json
"sendBody": true,
"contentType": "json",
"bodyParameters": {
  "parameters": [...]
}
```

**Not** `bodyParametersUi` (which sends form data).

The **n8n-workflow-minimal-fixed.json** file has the correct configuration.

Once the minimal workflow imports and runs successfully, you can build upon it or try importing the more complex workflows.

### Solution 2: Manual Workflow Creation

If import continues to fail:
1. Open n8n at http://localhost:5678
2. Create a new workflow manually
3. Add nodes step by step following the flow diagrams below
4. Configure each node with the parameters shown in the workflow JSON files

## Available Workflows

### 0. Minimal Test Workflow (Start Here)

**File**: `n8n-workflow-minimal-fixed.json`

**Status**: ✅ Imported and verified working

**Description**: Simplest possible workflow to test the capture service.

**Flow**:
```
Manual Trigger → Capture Street View
```

**Use**: Import this first to verify n8n compatibility, then try the more advanced workflows below.

---

### 0.5. Complete Workflow (Recommended)

**File**: `n8n-workflow-complete-test.json`

**Status**: ✅ Imported and tested successfully

**Description**: Complete capture + AI analysis pipeline. This is the recommended workflow to start with.

**Flow**:
```
Manual Trigger
    ↓
1. Capture Street View (Brandenburg Gate, Berlin)
    ↓
2. Wait 5 seconds (for file to be written)
    ↓
3. Analyze with AI (LLaVA 13B description)
```

**Test Results**:
- Capture: ✅ Success (~20 seconds)
- Analysis: ✅ Success (~18 seconds with LLaVA 13B)
- Total time: ~43 seconds end-to-end

**Output Example**:
```json
{
  "image_id": 2,
  "filename": "streetview_Brandenburg_Gate_Berlin_2025-11-11T13-24-25.jpg",
  "model": "llava:13b",
  "results": {
    "description": "This image is a screenshot of a computer screen displaying a panoramic street view..."
  },
  "processing_time_ms": 18160
}
```

**Use**: Import this to test the complete capture + analysis pipeline. All endpoints verified working.

### 1. Street View Capture & AI Analysis

**File**: `n8n-workflow-capture-and-analyze.json`

**Description**: Complete pipeline that captures a street view image and analyzes it with AI.

**Features**:
- Manual trigger for on-demand execution
- Configurable address and capture settings
- Automatic error handling
- AI analysis with multiple analysis types
- Formatted output with all metadata

**Flow**:
```
Manual Trigger
    ↓
Set Parameters (address, quality, analyses)
    ↓
Capture Street View (HTTP Request → :3000)
    ↓
Check Success
    ↓ (success)
Extract Filename
    ↓
Wait for File Write (5s)
    ↓
Analyze with AI (HTTP Request → :8000)
    ↓
Check Success
    ↓ (success)
Format Response (complete results)
```

**Input Parameters**:
- `address`: Location to capture (e.g., "Eiffel Tower, Paris, France")
- `headless`: Run browser in headless mode (true/false)
- `quality`: JPG quality 0-100 (default: 85)
- `analyses`: Comma-separated list (description,object_detection,ocr)

**Output**:
```json
{
  "status": "success",
  "filename": "streetview_Eiffel_Tower_Paris_France_2025-11-11.jpg",
  "address": "Eiffel Tower, Paris, France",
  "image_id": 1,
  "model_used": "llava:13b",
  "processing_time_ms": 27500,
  "analysis_results": {
    "description": "...",
    "object_detection": "...",
    "ocr": "..."
  },
  "capture_metadata": {
    "coordinates": {"lat": 48.8582, "lng": 2.2945},
    "url": "https://www.google.com/maps/...",
    "capturedAt": "2025-11-11T12:00:00.000Z"
  }
}
```

**Use Cases**:
- Manual address lookup
- Testing new locations
- On-demand analysis
- API endpoint integration

---

### 2. Batch Street View Analysis

**File**: `n8n-workflow-batch-analysis.json`

**Description**: Scheduled batch processing of multiple street view locations with AI analysis.

**Features**:
- Schedule trigger (cron: daily at 2 AM)
- Process multiple addresses sequentially
- Rate limiting between requests
- Aggregate results
- Final summary report

**Flow**:
```
Schedule Trigger (2 AM daily)
    ↓
Load Address List
    ↓
Split into Individual Addresses
    ↓
For Each Address:
    ├─> Capture Street View
    ├─> Wait 5s
    ├─> Analyze with AI
    ├─> Collect Result
    └─> Rate Limit (10s delay)
    ↓
Aggregate All Results
    ↓
Generate Final Report
```

**Configuration**:
```javascript
// Edit "Address List" node
{
  "addresses": "Eiffel Tower Paris,Brandenburg Gate Berlin,Big Ben London"
}

// Edit "Schedule Trigger" node
{
  "cronExpression": "0 2 * * *"  // Daily at 2 AM
}
```

**Output**:
```json
{
  "summary": "Processed 5 locations",
  "timestamp": "2025-11-11T02:00:00.000Z",
  "results": [
    {
      "address": "Eiffel Tower Paris",
      "filename": "streetview_Eiffel_Tower_Paris_2025-11-11.jpg",
      "image_id": 1,
      "processing_time_ms": 28000,
      "status": "processed",
      "results": {...}
    },
    ...
  ]
}
```

**Use Cases**:
- Automated daily monitoring
- Batch processing overnight
- Regular location updates
- Scheduled reporting

---

## How to Import Workflows

### Method 1: n8n Web UI

1. Open n8n: http://localhost:5678
2. Click on "Workflows" in the left menu
3. Click "+ Add workflow"
4. Click the three dots menu (⋮) in the top right
5. Select "Import from File"
6. Choose the workflow JSON file
7. Click "Save"

### Method 2: Copy JSON

1. Open the JSON file
2. Copy the entire contents
3. In n8n, click "+ Add workflow"
4. Click "Import from URL"
5. Paste the JSON
6. Click "Import"

---

## Workflow Customization

### Modify Capture Settings

**Node**: "Set Input Parameters" or "Address List"

```javascript
// Change address
"address": "Your Address Here"

// Change quality
"quality": 90  // Higher quality, larger files

// Change analysis types
"analyses": "description"  // Only description
"analyses": "description,ocr"  // Multiple types
```

### Adjust Timing

**Batch Processing Schedule**:
```javascript
// Change cron expression in "Schedule Trigger"
"0 2 * * *"   // Daily at 2 AM
"0 */6 * * *" // Every 6 hours
"0 0 * * 0"   // Weekly on Sunday midnight
```

**Wait Times**:
```javascript
// "Wait for File" node
"amount": 5  // Increase if file writes are slow

// "Rate Limit" node
"amount": 10  // Increase to be more gentle on services
```

### Error Handling

**Add Slack/Email Notification**:

1. After "Capture Error" or "Analysis Error" nodes
2. Add "Slack" or "Send Email" node
3. Configure with error message:
```javascript
{
  "message": "Error processing {{ $json.address }}: {{ $json.error_message }}"
}
```

---

## Advanced Workflows

### 3. Webhook-Triggered Analysis

**Create a webhook endpoint** that can be called externally:

1. Replace "Manual Trigger" with "Webhook" node
2. Set path: `/capture-and-analyze`
3. Configure to receive JSON:
```json
{
  "address": "Location to capture",
  "analyses": ["description"]
}
```

**Call the webhook**:
```bash
curl -X POST http://localhost:5678/webhook/capture-and-analyze \
  -H "Content-Type: application/json" \
  -d '{"address": "Times Square, New York"}'
```

---

### 4. Database Integration

**Store results in PostgreSQL**:

1. Add "Postgres" node after "Format Success Response"
2. Configure connection:
   - Host: localhost
   - Port: 5432
   - Database: streetview_analysis
   - User: imageprocessor
   - Password: securepassword123

3. SQL Query:
```sql
INSERT INTO analysis_results (image_id, analysis_type, result_data)
VALUES ({{ $json.image_id }}, 'combined', {{ $json.analysis_results }})
```

---

### 5. Export to CSV

**Generate CSV report**:

1. After "Aggregate" node in batch workflow
2. Add "Spreadsheet File" node
3. Configure:
   - Operation: Write to file
   - File Format: CSV
   - File Name: `analysis-report-{{ $now.toFormat('yyyy-MM-dd') }}.csv`

---

## Workflow Monitoring

### View Execution History

1. Go to "Executions" in n8n
2. Filter by workflow name
3. Click on execution to see detailed logs
4. Review node outputs and errors

### Set Up Alerts

**For Failed Executions**:

1. Add "Error Trigger" workflow
2. Configure to watch specific workflows
3. Send notification when errors occur

---

## Performance Tips

### Optimize Batch Processing

1. **Limit Concurrent Requests**:
   - Process sequentially (current setup)
   - Add rate limiting (10s delays)
   - Monitor resource usage

2. **Adjust Timeouts**:
```javascript
// HTTP Request nodes
"timeout": 60000   // Capture (60s)
"timeout": 120000  // Analysis (120s)
```

3. **Error Recovery**:
   - Add retry logic
   - Log failures to database
   - Continue on error (don't stop batch)

---

## Testing Workflows

### Test Single Address

1. Open workflow
2. Edit "Set Input Parameters"
3. Change address to test location
4. Click "Execute Workflow"
5. Review output in each node

### Test Batch Processing

1. Start with small address list (2-3 addresses)
2. Run manually (don't wait for schedule)
3. Monitor execution time
4. Check all results

### Debug Issues

**Common Problems**:

1. **"Image not found" error**:
   - Increase wait time after capture
   - Check file actually exists
   - Verify filename format

2. **Timeout errors**:
   - Increase timeout values
   - Check service health
   - Review Ollama logs

3. **Analysis failures**:
   - Verify Ollama has llava:13b model
   - Check GPU availability
   - Test image-processor directly

---

## Workflow Templates

### Template: Location Monitoring

Monitor specific locations regularly and alert on changes:

```
Schedule Trigger (daily)
    ↓
Load Monitored Locations from DB
    ↓
For Each Location:
    ├─> Capture Current View
    ├─> Analyze Changes
    ├─> Compare with Previous
    └─> Alert if Different
```

### Template: Real Estate Pipeline

Automated property analysis:

```
Webhook (new property address)
    ↓
Capture Street View
    ↓
AI Analysis (building, surroundings)
    ↓
Store in CRM Database
    ↓
Generate Property Report (PDF)
    ↓
Email to Agent
```

### Template: Business Intelligence

Competitor monitoring:

```
Schedule (weekly)
    ↓
Load Competitor Addresses
    ↓
Capture Street Views
    ↓
OCR Extract Business Names
    ↓
Object Detection (vehicles, signage)
    ↓
Store in Analytics DB
    ↓
Generate Trend Report
```

---

## Integration Examples

### Airtable Integration

Store results in Airtable:

1. Add "Airtable" node
2. Configure base and table
3. Map fields:
```javascript
{
  "Address": "{{ $json.address }}",
  "Filename": "{{ $json.filename }}",
  "Description": "{{ $json.results.description }}",
  "Image ID": "{{ $json.image_id }}"
}
```

### Google Sheets Integration

Export to Google Sheets:

1. Add "Google Sheets" node
2. Operation: "Append"
3. Map columns from analysis results

### Slack Notifications

Send analysis results to Slack:

1. Add "Slack" node after analysis
2. Configure webhook or bot token
3. Message format:
```
New analysis complete!
📍 Location: {{ $json.address }}
🖼️ Image ID: {{ $json.image_id }}
⏱️ Time: {{ $json.processing_time_ms }}ms
📊 Results: {{ $json.results.description }}
```

---

## Support

### Workflow Issues

1. Check n8n execution logs
2. Verify service health endpoints
3. Test API calls directly with curl
4. Review error node outputs

### Getting Help

- **Documentation**: ARCHITECTURE.md
- **Service APIs**: Check service README files
- **n8n Docs**: https://docs.n8n.io/

---

## License

MIT License - Free to use and modify
