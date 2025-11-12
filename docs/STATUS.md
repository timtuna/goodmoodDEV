# System Status Report

**Generated**: $(date)
**Status**: ✅ ALL SYSTEMS OPERATIONAL

## Running Services

$(docker ps --format "- **{{.Names}}**: {{.Status}}")

## Quick Access

- **n8n Workflows**: http://localhost:5678
- **Streetview Capture API**: http://localhost:3000
- **Image Processor API**: http://localhost:8000
- **Ollama API**: http://localhost:11434
- **Open WebUI**: http://localhost:12000

## Test Commands

\`\`\`bash
# Test streetview capture
curl -X POST http://localhost:3000/capture -H "Content-Type: application/json" -d '{"address": "Eiffel Tower, Paris"}'

# Test image analysis
curl -X POST http://localhost:8000/analyze -H "Content-Type: application/json" -d '{"filename": "streetview_Times_Square_New_York_2025-11-11T07-00-37.jpg", "analyses": ["description"]}'

# List all images
curl http://localhost:8000/images
\`\`\`

## Documentation

- **Architecture Overview**: ./ARCHITECTURE.md
- **Implementation Details**: ./IMPLEMENTATION_SUMMARY.md
- **Image Processor**: ./image-processor/README.md
- **Streetview Capture**: ./streetview-automation/README.md
