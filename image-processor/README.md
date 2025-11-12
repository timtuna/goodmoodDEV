# Image Processor Service

AI-powered street view image analysis using Ollama LLaVA vision models.

## Features

- **AI Image Analysis** - Powered by LLaVA 13B vision model via Ollama
- **Multiple Analysis Types** - Description, object detection, OCR, custom prompts
- **PostgreSQL Storage** - Structured metadata and analysis results
- **REST API** - Easy integration with n8n and other services
- **Shared Volume Architecture** - Read screenshots from streetview-capture
- **GPU Accelerated** - Uses existing Ollama infrastructure

## Architecture

```
┌─────────────────────┐
│ streetview-capture  │─┐
└─────────────────────┘ │
                        ├─> ./streetview-screenshots/
┌─────────────────────┐ │
│ image-processor     │←┘
└─────────────────────┘
         │
         ├─> localhost:11434 (Ollama + LLaVA)
         │
         └─> localhost:5432 (PostgreSQL)
```

## Quick Start

### 1. Service is Already Running

```bash
# Check status
docker ps | grep -E "postgres|image-processor|ollama"

# Check health
curl http://localhost:8000/health
```

### 2. Analyze an Image

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "streetview_Times_Square_New_York_2025-11-11T07-00-37.jpg",
    "analyses": ["description"]
  }'
```

### 3. View Available Models

```bash
curl http://localhost:8000/models
```

## API Endpoints

### POST /analyze
Analyze a single image with AI vision model

**Request:**
```json
{
  "filename": "streetview_Eiffel_Tower_Paris_2025-11-11.jpg",
  "analyses": ["description", "object_detection", "ocr"],
  "model": "llava:13b"
}
```

**Response:**
```json
{
  "image_id": 1,
  "filename": "streetview_Eiffel_Tower_Paris_2025-11-11.jpg",
  "model": "llava:13b",
  "results": {
    "description": "This is a street view image of the Eiffel Tower in Paris...",
    "object_detection": "Buildings: Eiffel Tower, residential buildings...",
    "ocr": "Visible text: 'Avenue Gustave Eiffel', 'Paris 75007'..."
  },
  "processing_time_ms": 25430
}
```

### POST /analyze-batch
Process multiple images in one request

**Request:**
```json
{
  "filenames": ["image1.jpg", "image2.jpg", "image3.jpg"],
  "analyses": ["description"]
}
```

### GET /results/{image_id}
Retrieve all analysis results for an image

### GET /images
List all processed images

**Query Parameters:**
- `analyzed_only` - boolean (filter to only analyzed images)
- `limit` - int (default: 100)
- `offset` - int (default: 0)

### GET /models
List available Ollama models

### GET /health
Health check endpoint

### GET /info
Service information and capabilities

## Analysis Types

### description
Detailed scene description including:
- Location type (urban, suburban, rural)
- Main buildings and structures
- Street characteristics
- Visible signage
- Weather and lighting
- Overall atmosphere

### object_detection
Lists all visible objects categorized by:
- Buildings
- Vehicles
- Street furniture
- Signs
- Vegetation
- Infrastructure

### ocr
Extracts visible text from:
- Business names and signs
- Street signs
- Building numbers
- Any readable text

### custom
Use your own prompt for specific analysis needs

**Example:**
```json
{
  "filename": "streetview_shopping_street.jpg",
  "analyses": ["custom"],
  "custom_prompt": "List all business names visible in this street view image"
}
```

## Database Schema

The service automatically creates these tables:

- **images** - Captured street view images metadata
- **analysis_results** - AI analysis outputs
- **detected_objects** - Object detection results
- **extracted_text** - OCR results
- **processing_queue** - Async job management

## Configuration

Environment variables (set in docker-compose.yml):

```yaml
environment:
  - DATABASE_URL=postgresql://imageprocessor:securepassword123@localhost:5432/streetview_analysis
  - OLLAMA_BASE_URL=http://localhost:11434
  - OLLAMA_MODEL=llava:13b
  - INPUT_DIR=/app/input
  - OUTPUT_DIR=/app/output
  - TZ=Europe/Berlin
```

## Performance

- **Processing Time**: ~15-30 seconds per image (13B model)
- **GPU**: Utilizes existing NVIDIA GPU via Ollama
- **Memory**: ~2-4GB during processing
- **Concurrent Requests**: Recommended 1-2 simultaneous

## Troubleshooting

### "Image not found" Error
Check that the image exists in `./streetview-screenshots/`

### Slow Processing
- Ollama may be processing other requests
- Try smaller model: `llava:7b`
- Check GPU availability: `docker logs ollama`

### Database Connection Error
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs postgres
```

### Ollama Not Available
```bash
# Restart Ollama
docker compose restart ollama

# Check models
docker exec ollama ollama list
```

## Development

### Local Development
```bash
cd image-processor
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Rebuild Container
```bash
docker compose up -d --build image-processor
```

### View Logs
```bash
# Follow logs
docker logs -f image-processor

# Last 100 lines
docker logs --tail 100 image-processor
```

## Integration with n8n

See `n8n-workflow-imageprocessor.json` for example workflow.

**Basic Integration:**
1. Streetview-capture creates image
2. n8n webhook triggers
3. Call image-processor API
4. Store results in database
5. Send notification with analysis

## Example Use Cases

### Real Estate
Analyze property street views for:
- Building condition
- Surrounding environment
- Nearby amenities
- Parking availability

### Business Intelligence
Extract from street views:
- Competitor locations
- Business signage
- Foot traffic indicators
- Area development

### Urban Planning
Analyze for:
- Infrastructure condition
- Street furniture inventory
- Accessibility features
- Green space assessment

## Technical Stack

- **Python 3.11** - Runtime
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **psycopg2** - PostgreSQL driver
- **OpenCV** - Image processing
- **Pillow** - Image manipulation
- **Ollama** - AI model serving
- **LLaVA 13B** - Vision language model

## License

MIT License

## Support

For issues or questions:
- Check service logs: `docker logs image-processor`
- Test API: `curl http://localhost:8000/health`
- Review database: `docker exec postgres psql -U imageprocessor -d streetview_analysis`
