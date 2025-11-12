# GoodmoodDEV - Multi-Container Automation Platform

Modular, n8n-orchestrated microservices platform for automated image capture and AI-powered analysis.

## Overview

This project provides a flexible, containerized platform combining street view image capture with AI-powered analysis, all orchestrated through n8n workflows.

## Architecture

6 containerized services working together:

| Service | Repository | Port | Purpose |
|---------|-----------|------|---------|
| **n8n** | [n8nio/n8n](https://github.com/n8n-io/n8n) | 5678 | Workflow orchestration |
| **Ollama** | [ollama/ollama](https://github.com/ollama/ollama) | 11434 | AI model inference (GPU) |
| **PostgreSQL** | [postgres](https://hub.docker.com/_/postgres) | 5432 | Database |
| **Streetview Capture** | [timtuna/streetview-automation](https://github.com/timtuna/streetview-automation) | 3000 | Screenshot automation |
| **Image Processor** | [timtuna/image-processor](https://github.com/timtuna/image-processor) | 8000 | AI image analysis |
| **Open WebUI** | [open-webui](https://github.com/open-webui/open-webui) | 12000 | Ollama web interface |

## Quick Start

### 1. Clone Repositories

```bash
# Create project directory
mkdir -p goodmoodDEV
cd goodmoodDEV

# Clone service repositories
git clone https://github.com/timtuna/streetview-automation
git clone https://github.com/timtuna/image-processor

# Download docker-compose.yml
wget https://raw.githubusercontent.com/timtuna/goodmoodDEV-docs/master/docker-compose.yml
```

### 2. Start Services

```bash
# Start all services
docker compose up -d

# Check status
docker ps

# View logs
docker compose logs -f
```

### 3. Verify Services

```bash
# n8n workflow engine
curl http://localhost:5678

# Streetview capture
curl http://localhost:3000/health

# Image processor
curl http://localhost:8000/health

# Ollama AI models
curl http://localhost:11434/api/tags
```

## Features

### Street View Capture
- Automated Google Street View screenshots
- Playwright-based browser automation
- Geocoding via OpenStreetMap
- Headless & visible modes (X11 support)
- Automatic consent handling
- JPG output with metadata

### AI Image Analysis
- LLaVA 13B vision model
- Scene description
- Object detection
- Text extraction (OCR)
- Custom prompts
- GPU accelerated
- PostgreSQL storage

### Workflow Automation
- n8n visual workflow builder
- Webhooks and triggers
- Schedule-based automation
- Data transformation
- Error handling

## Example Workflows

### Capture & Analyze

```bash
# 1. Capture street view
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{"address": "Eiffel Tower, Paris"}'

# 2. Analyze image
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "streetview_Eiffel_Tower_Paris_2025-11-11.jpg",
    "analyses": ["description", "object_detection"]
  }'
```

### Batch Processing via n8n

1. Create n8n workflow with schedule trigger
2. Read list of addresses
3. For each address:
   - Call streetview-capture
   - Call image-processor
   - Store results in PostgreSQL
4. Generate report
5. Send notification

## AI Models

**Included Models:**
- `llava:13b` (8.0 GB) - Vision language model for image analysis
- `deepseek-r1:32b` (19 GB) - Advanced language model
- `gpt-oss:120b` (65 GB) - Large language model

**Add More Models:**
```bash
docker exec ollama ollama pull llava:7b      # Faster, smaller
docker exec ollama ollama pull llava:34b     # Highest accuracy
```

## Documentation

### n8n Workflows

- **[N8N_WORKFLOWS.md](./N8N_WORKFLOWS.md)** - Complete workflow documentation and troubleshooting

**Available Workflow Files:**
- **n8n-workflow-minimal-fixed.json** - ✅ Simple capture test (verified working)
- **n8n-workflow-complete-test.json** - ✅ Complete capture + AI analysis pipeline (verified working)
- **n8n-workflow-capture-and-analyze.json** - Full pipeline with error handling
- **n8n-workflow-batch-analysis.json** - Scheduled batch processing

**Status**: All workflows imported and tested successfully in n8n!

**Having import issues?** See the Import Troubleshooting section in N8N_WORKFLOWS.md


- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details
- **[docker-compose.yml](./docker-compose.yml)** - Service configuration

**Service Documentation:**
- [Streetview Capture README](https://github.com/timtuna/streetview-automation)
- [Image Processor README](https://github.com/timtuna/image-processor)

## Requirements

### Minimum
- Docker & Docker Compose
- 8 GB RAM
- 100 GB disk space
- NVIDIA GPU (for AI models)
- Linux (tested on Ubuntu/Debian)

### Recommended
- 16 GB RAM
- 200 GB disk space
- NVIDIA RTX series GPU
- High-speed internet

## Volume Structure

```
goodmoodDEV/
├── ai-models/              # Ollama AI models (92 GB)
├── n8n-data/               # n8n workflows and credentials
├── postgres-data/          # PostgreSQL database
├── streetview-screenshots/ # Captured images
├── processed-results/      # Analysis results
├── streetview-automation/  # Service source
├── image-processor/        # Service source
└── docker-compose.yml      # Configuration
```

## API Endpoints

### Streetview Capture (port 3000)
- `POST /capture` - Capture screenshot
- `GET /captures` - List captures
- `GET /health` - Health check

### Image Processor (port 8000)
- `POST /analyze` - Analyze image
- `POST /analyze-batch` - Batch analysis
- `GET /results/{id}` - Get results
- `GET /images` - List images
- `GET /models` - List AI models

### Ollama (port 11434)
- `GET /api/tags` - List models
- `POST /api/generate` - Generate text
- `POST /api/chat` - Chat completion

## Use Cases

### Real Estate
- Property street view capture
- Building condition analysis
- Neighborhood assessment
- Automated property reports

### Urban Planning
- Infrastructure inventory
- Street condition assessment
- Accessibility analysis
- Development monitoring

### Business Intelligence
- Competitor location analysis
- Storefront identification
- Market research
- Area development tracking

## Performance

- **Street View Capture**: ~10-20 seconds per location
- **AI Image Analysis**: ~15-30 seconds per image
- **GPU Acceleration**: NVIDIA CUDA
- **Concurrent Processing**: 1-2 images recommended

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose logs <service-name>

# Restart service
docker compose restart <service-name>

# Rebuild
docker compose up -d --build <service-name>
```

### GPU not working
```bash
# Check NVIDIA drivers
nvidia-smi

# Verify Docker GPU access
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

### Database connection errors
```bash
# Check PostgreSQL
docker exec postgres pg_isready -U imageprocessor

# Reset database
docker compose down postgres
docker compose up -d postgres
```

## Security Notes

- Change default database passwords in production
- Add authentication to APIs for external access
- Use HTTPS in production
- Restrict network access as needed
- Regular backups of critical data

## Backup & Maintenance

```bash
# Backup n8n workflows
tar -czf n8n-backup.tar.gz n8n-data/

# Backup database
docker exec postgres pg_dump -U imageprocessor streetview_analysis > backup.sql

# Archive old images
tar -czf screenshots-archive.tar.gz streetview-screenshots/
```

## Contributing

This is a modular platform - each service can be enhanced independently:

1. **Streetview Capture**: [timtuna/streetview-automation](https://github.com/timtuna/streetview-automation)
2. **Image Processor**: [timtuna/image-processor](https://github.com/timtuna/image-processor)

## License

MIT License - See individual repositories for details

## Support

- Check documentation in this repository
- Review service-specific READMEs
- Examine docker-compose.yml for configuration
- View logs: `docker compose logs -f`

## Credits

Built with:
- [n8n](https://n8n.io/) - Workflow automation
- [Ollama](https://ollama.ai/) - AI model serving
- [LLaVA](https://llava-vl.github.io/) - Vision language model
- [Playwright](https://playwright.dev/) - Browser automation
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database

---

**Status**: Production-ready ✅

**Built with**: [Claude Code](https://claude.com/claude-code) 🤖
