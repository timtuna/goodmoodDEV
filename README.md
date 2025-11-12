# Good Mood Lab - Street View Analysis Platform

A comprehensive platform for capturing Google Street View images, analyzing them with AI, and processing results through automated workflows.

## Overview

This project combines multiple services to create an automated pipeline for real estate and location analysis:
- **Street View Automation**: Capture street-level imagery from Google Maps
- **AI Analysis**: Process images using local LLM (Ollama) for detailed analysis
- **Workflow Automation**: Orchestrate the entire pipeline with n8n
- **Image Processing**: Handle image transformations and storage

## Architecture

```
goodmoodDEV/
├── streetview-automation/    # Google Street View capture service
├── image-processor/          # Image processing service
├── n8n-workflows/           # Production workflow definitions
│   └── examples/            # Test and example workflows
├── docs/                    # Project documentation
└── docker-compose.yml       # Service orchestration
```

## Services

### 1. Street View Automation
- **Port**: 3000
- **Purpose**: Capture Street View images via automated browser control
- **Features**:
  - Single and multi-position capture
  - Configurable camera angles and FOV
  - Outdoor-only mode (avoids business interior tours)
  - Hybrid navigation approach for accurate positioning

**API Endpoints**:
```bash
# Health check
GET http://localhost:3000/health

# Capture single position
POST http://localhost:3000/capture
{
  "address": "Brandenburg Gate, Berlin",
  "headless": true
}

# Capture multiple positions (left, center, right)
POST http://localhost:3000/capture
{
  "address": "Mülgaustrasse 52, Mönchengladbach",
  "headless": true,
  "multi_position": true,
  "street_bearing": 90,
  "heading": 0
}

# List captures
GET http://localhost:3000/captures
```

### 2. Image Processor
- **Port**: 5000
- **Purpose**: Process and analyze captured images

### 3. n8n Workflow Automation
- **Port**: 5678
- **Purpose**: Orchestrate capture → analysis → storage workflows
- **Access**: http://localhost:5678

### 4. Ollama (Local LLM)
- **Port**: 11434
- **Purpose**: AI-powered image and text analysis
- **Model**: llama3.2-vision

### 5. PostgreSQL
- **Port**: 5432
- **Purpose**: Data storage for n8n workflows

## Quick Start

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM recommended
- Linux environment (tested on Ubuntu)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd goodmoodDEV
```

2. **Start all services**
```bash
docker compose up -d
```

3. **Check service status**
```bash
docker compose ps
```

### Usage Example

1. **Capture a Street View image**:
```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Times Square, New York",
    "headless": true
  }'
```

2. **View captured images**:
```bash
ls -lh streetview-screenshots/
```

3. **Access n8n workflows**:
   - Open http://localhost:5678
   - Import workflows from `n8n-workflows/` directory

## Configuration

### Street View Capture Options

- `address` (string, required): Location to capture
- `headless` (boolean): Run browser in headless mode (default: true)
- `multi_position` (boolean): Capture left, center, right views (default: false)
- `street_bearing` (number): Street direction in degrees (0-359)
- `heading` (number): Camera direction (0-359)
- `pitch` (number): Camera tilt (default: 90 = horizontal)
- `fov` (number): Field of view (default: 75)
- `position_offset` (number): Distance between positions in meters (default: 30)
- `outdoor_only` (boolean): Attempt to avoid interior tours (default: true)

### Environment Variables

Create a `.env` file (not tracked in git):
```bash
# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<your-password>

# Database
POSTGRES_PASSWORD=<your-db-password>
```

## Development

### Street View Automation

```bash
cd streetview-automation
npm install
npm run dev
```

### Rebuild Containers

```bash
docker compose build <service-name>
docker compose restart <service-name>
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f streetview-capture
```

## Technical Details

### Street View Capture Strategy

The system uses a hybrid approach to capture outdoor street views:

1. **Search by Address**: Navigates to Google Maps search with the target address
2. **Thumbnail Click**: Clicks the Street View thumbnail to enter outdoor view
3. **Navigation**: For multi-position, uses Street View's navigation to move along the street
4. **Validation**: Checks for outdoor vs indoor panoramas

This approach minimizes the chance of capturing business interior tours.

### Known Limitations

- Google Maps may still show interior tours if they're the only available panorama at exact coordinates
- Geocoding accuracy depends on Google's geocoding API
- Street bearing detection is basic and may require manual override
- Some locations may not have Street View coverage

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture and design decisions
- [docs/IMPLEMENTATION_SUMMARY.md](./docs/IMPLEMENTATION_SUMMARY.md) - Implementation timeline and changes
- [docs/N8N_WORKFLOWS.md](./docs/N8N_WORKFLOWS.md) - Workflow documentation
- [docs/STATUS.md](./docs/STATUS.md) - Current project status

## Troubleshooting

### Street View shows Maps view instead of panorama
- Ensure the location has Street View coverage
- Try adjusting `street_bearing` parameter
- Use `headless: false` to see what's happening

### Images show business interiors
- This can happen if the address has 360° business tours
- Try adjusting `position_offset` to move further from the building
- Manually specify coordinates instead of relying on geocoding

### Container won't start
```bash
docker compose down
docker compose up --build
```

## License

[Your License]

## Contributing

[Contributing guidelines]

## Support

[Contact information or issue tracker]
