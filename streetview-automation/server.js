const express = require('express');
const { captureStreetView, listCaptures } = require('./lib/capture');

const app = express();
const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/app/screenshots';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static files
app.use('/public', express.static('public'));
app.use('/screenshots', express.static(OUTPUT_DIR));

// Serve results viewer at root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/results-viewer.html');
});

/**
 * Helper function to enhance API response with URLs
 * @param {Object} result - Capture result from captureStreetView
 * @param {Object} req - Express request object
 * @returns {Object} Enhanced result with image URLs and viewer link
 */
function enhanceResultWithUrls(result, req) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // Single position capture
  if (!result.multi_position) {
    return {
      ...result,
      image_url: `${baseUrl}/screenshots/${result.filename}`,
      thumbnail_url: `${baseUrl}/screenshots/${result.filename}`,
      viewer_url: `${baseUrl}/`
    };
  }

  // Multi-position capture
  const enhancedCaptures = result.captures.map(capture => ({
    ...capture,
    image_url: `${baseUrl}/screenshots/${capture.filename}`,
    thumbnail_url: `${baseUrl}/screenshots/${capture.filename}`
  }));

  return {
    ...result,
    captures: enhancedCaptures,
    viewer_url: `${baseUrl}/`
  };
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'streetview-automation',
    timestamp: new Date().toISOString()
  });
});

/**
 * Capture Street View screenshot
 * POST /capture
 *
 * Request body:
 * {
 *   "address": "1600 Amphitheatre Parkway, Mountain View, CA",
 *   "headless": true,        // optional, default: true
 *   "quality": 85,           // optional, default: 85
 *   "width": 1920,           // optional, default: 1920
 *   "height": 1080,          // optional, default: 1080
 *   "heading": 90,           // optional, viewing direction in degrees (0=North, 90=East, 180=South, 270=West)
 *   "pitch": 90,             // optional, default: 90 (horizontal view, <90=down, >90=up)
 *   "fov": 75,               // optional, default: 75 (field of view)
 *   "outdoor_only": true,    // optional, default: true (prefer outdoor street view)
 *   "multi_position": false, // optional, default: false (capture left, center, right positions)
 *   "position_offset": 30,   // optional, default: 30 meters (distance between positions)
 *   "street_bearing": 0      // optional, street direction override in degrees
 * }
 */
app.post('/capture', async (req, res) => {
  try {
    const {
      address,
      headless,
      quality,
      width,
      height,
      heading,
      pitch,
      fov,
      outdoor_only,
      multi_position,
      position_offset,
      street_bearing
    } = req.body;

    // Validate required parameters
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required',
        example: {
          address: '1600 Amphitheatre Parkway, Mountain View, CA',
          headless: true,
          quality: 85,
          multi_position: false
        }
      });
    }

    // Validate numeric parameters
    if (heading !== undefined && (typeof heading !== 'number' || heading < 0 || heading >= 360)) {
      return res.status(400).json({
        success: false,
        error: 'heading must be a number between 0 and 359 degrees'
      });
    }

    if (pitch !== undefined && (typeof pitch !== 'number' || pitch < 0 || pitch > 180)) {
      return res.status(400).json({
        success: false,
        error: 'pitch must be a number between 0 and 180 degrees'
      });
    }

    if (fov !== undefined && (typeof fov !== 'number' || fov < 10 || fov > 120)) {
      return res.status(400).json({
        success: false,
        error: 'fov must be a number between 10 and 120 degrees'
      });
    }

    if (position_offset !== undefined && (typeof position_offset !== 'number' || position_offset <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'position_offset must be a positive number (meters)'
      });
    }

    if (street_bearing !== undefined && (typeof street_bearing !== 'number' || street_bearing < 0 || street_bearing >= 360)) {
      return res.status(400).json({
        success: false,
        error: 'street_bearing must be a number between 0 and 359 degrees'
      });
    }

    console.log(`[API] Capture request for: ${address}${multi_position ? ' (multi-position)' : ''}`);

    // Call capture function
    const result = await captureStreetView({
      address,
      headless: headless !== undefined ? headless : true,
      quality: quality || 85,
      width: width || 1920,
      height: height || 1080,
      outputDir: OUTPUT_DIR,
      // New parameters
      heading,
      pitch,
      fov,
      outdoor_only: outdoor_only !== undefined ? outdoor_only : true,
      multi_position: multi_position || false,
      position_offset,
      street_bearing
    });

    // Enhance response with URLs and viewer link
    const enhancedResult = enhanceResultWithUrls(result, req);

    res.json({
      success: true,
      message: 'Screenshot captured successfully',
      data: enhancedResult
    });

  } catch (error) {
    console.error('[API] Capture error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      address: req.body.address
    });
  }
});

/**
 * List all captured screenshots
 * GET /captures
 */
app.get('/captures', async (req, res) => {
  try {
    const captures = await listCaptures(OUTPUT_DIR);

    res.json({
      success: true,
      count: captures.length,
      captures
    });

  } catch (error) {
    console.error('[API] List error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get service information
 * GET /info
 */
app.get('/info', (req, res) => {
  res.json({
    service: 'Street View Automation Service',
    version: '1.0.0',
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint'
      },
      capture: {
        method: 'POST',
        path: '/capture',
        description: 'Capture Street View screenshot',
        parameters: {
          address: { type: 'string', required: true, description: 'Address to capture' },
          headless: { type: 'boolean', required: false, default: true, description: 'Run in headless mode' },
          quality: { type: 'number', required: false, default: 85, description: 'JPG quality (0-100)' },
          width: { type: 'number', required: false, default: 1920, description: 'Screenshot width' },
          height: { type: 'number', required: false, default: 1080, description: 'Screenshot height' },
          heading: { type: 'number', required: false, description: 'Viewing direction in degrees (0=North, 90=East, 180=South, 270=West)' },
          pitch: { type: 'number', required: false, default: 90, description: 'Camera pitch in degrees (90=horizontal, <90=down, >90=up)' },
          fov: { type: 'number', required: false, default: 75, description: 'Field of view in degrees (10-120)' },
          outdoor_only: { type: 'boolean', required: false, default: true, description: 'Prefer outdoor street view (validated after capture)' },
          multi_position: { type: 'boolean', required: false, default: false, description: 'Capture from 3 positions: left, center, right' },
          position_offset: { type: 'number', required: false, default: 30, description: 'Distance in meters between positions (for multi_position)' },
          street_bearing: { type: 'number', required: false, description: 'Manual override for street direction in degrees (0-359)' }
        }
      },
      captures: {
        method: 'GET',
        path: '/captures',
        description: 'List all captured screenshots'
      },
      info: {
        method: 'GET',
        path: '/info',
        description: 'Get service information'
      }
    },
    outputDirectory: OUTPUT_DIR
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: ['/health', '/capture', '/captures', '/info']
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

/**
 * Start server
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Street View Automation Service                         ║
╠═══════════════════════════════════════════════════════════╣
║   Status: Running                                         ║
║   Port: ${PORT}                                           ║
║   Output: ${OUTPUT_DIR}                                   ║
╠═══════════════════════════════════════════════════════════╣
║   Endpoints:                                              ║
║   - GET  /health      Health check                       ║
║   - POST /capture     Capture screenshot                 ║
║   - GET  /captures    List screenshots                   ║
║   - GET  /info        Service information                ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
