const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const sanitize = require('sanitize-filename');
const https = require('https');

/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number}>} Coordinates
 */
async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;

    const options = {
      headers: {
        'User-Agent': 'StreetViewAutomation/1.0'
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({
              lat: parseFloat(results[0].lat),
              lng: parseFloat(results[0].lon)
            });
          } else {
            reject(new Error(`Could not geocode address: ${address}`));
          }
        } catch (error) {
          reject(new Error(`Geocoding error: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Geocoding request failed: ${error.message}`));
    });
  });
}

/**
 * Calculate new coordinates given a starting point, distance, and bearing
 * @param {Object} coords - Starting coordinates {lat, lng}
 * @param {number} distanceMeters - Distance to move in meters
 * @param {number} bearing - Direction to move in degrees (0=North, 90=East, 180=South, 270=West)
 * @returns {Object} New coordinates {lat, lng}
 */
function calculateNewCoords(coords, distanceMeters, bearing) {
  const R = 6371000; // Earth radius in meters
  const lat1 = coords.lat * Math.PI / 180;
  const lng1 = coords.lng * Math.PI / 180;
  const brng = bearing * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
    Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
    Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * 180 / Math.PI,
    lng: lng2 * 180 / Math.PI
  };
}

/**
 * Detect street direction at given coordinates
 * Currently uses a simple approach: tries 4 cardinal directions
 * @param {Object} coords - Coordinates to check
 * @returns {Promise<number>} Street bearing in degrees (0-360)
 */
async function detectStreetDirection(coords) {
  // For now, we return 0 (North) as default
  // In production, this could query OpenStreetMap or Google Roads API
  // The user can override with street_bearing parameter
  console.log(`[Street Direction] Using default bearing 0° (can be overridden with street_bearing parameter)`);
  return 0;
}

/**
 * Build Street View URL with given parameters
 * @param {Object} coords - Coordinates {lat, lng}
 * @param {Object} options - URL options
 * @param {number} [options.heading=0] - Camera heading (0-360)
 * @param {number} [options.pitch=85] - Camera pitch/tilt (90=horizontal, 85=slightly up)
 * @param {number} [options.fov=75] - Field of view/zoom
 * @param {boolean} [options.outdoor_only=true] - Force outdoor street-level imagery
 * @returns {string} Google Maps Street View URL
 */
function buildStreetViewUrl(coords, options = {}) {
  const {
    heading = 0,
    pitch = 90,  // 90 = horizontal view
    fov = 75,
    outdoor_only = true
  } = options;

  // Source type: !2e0 = all imagery (default), outdoor filtering done by validation
  // Note: !2e1 can cause loading issues, so we use !2e0 and validate after
  const sourceType = '!2e0';

  // Build URL with parameters:
  // - 3a = Street View mode
  // - {fov}y = field of view
  // - {heading}h = camera heading/direction
  // - {pitch}t = camera pitch/tilt (90 = horizontal)
  const url = `https://www.google.com/maps/@${coords.lat},${coords.lng},3a,${fov}y,${heading}h,${pitch}t/data=!3m6!1e1!3m4!1s0${sourceType}!7i16384!8i8192`;

  return url;
}

/**
 * Validate that current view is outdoor street-level (not interior)
 * @param {Object} page - Playwright page object
 * @returns {Promise<boolean>} True if outdoor, false if interior
 */
async function validateOutdoorView(page) {
  try {
    const viewInfo = await page.evaluate(() => {
      // Check URL for indoor/business tour indicators
      const url = window.location.href;
      const isBusinessTour = url.includes('!1s') && url.includes('!3m');
      const hasIndoorIndicator = url.includes('!4m') || url.includes('data=!4m');

      return {
        url,
        isBusinessTour,
        hasIndoorIndicator,
        isOutdoor: !isBusinessTour && !hasIndoorIndicator
      };
    });

    console.log(`[Outdoor Validation] ${viewInfo.isOutdoor ? 'Outdoor' : 'Indoor'} view detected`);
    return viewInfo.isOutdoor;
  } catch (e) {
    console.log(`[Outdoor Validation] Error: ${e.message}, assuming outdoor`);
    return true; // Assume outdoor if validation fails
  }
}

/**
 * Get available panorama links from current Street View position
 * @param {Object} page - Playwright page object
 * @returns {Promise<Array>} Array of link objects with { pano, heading, description }
 */
async function getPanoramaLinks(page) {
  console.log('[Panorama Links] Fetching available links...');

  try {
    const links = await page.evaluate(() => {
      // Access Google Maps panorama data
      const panorama = window.panorama || window.gPanorama;
      if (panorama && panorama.getLinks) {
        return panorama.getLinks();
      }

      // Alternative: Check for links in the DOM
      const linkElements = document.querySelectorAll('[data-pano-id]');
      if (linkElements.length > 0) {
        return Array.from(linkElements).map(el => ({
          pano: el.getAttribute('data-pano-id'),
          heading: parseFloat(el.getAttribute('data-heading') || '0'),
          description: el.getAttribute('aria-label') || ''
        }));
      }

      return [];
    });

    console.log(`[Panorama Links] Found ${links.length} links`);
    return links || [];
  } catch (error) {
    console.log(`[Panorama Links] Could not fetch links: ${error.message}`);
    return [];
  }
}

/**
 * Navigate to adjacent panorama using panorama ID (more reliable than arrow keys)
 * @param {Object} page - Playwright page object
 * @param {string} direction - 'forward' or 'back' relative to street bearing
 * @param {number} streetBearing - Current street direction in degrees
 * @param {number} clicks - Number of panoramas to traverse
 * @param {number} heading - Final camera heading to set
 * @returns {Promise<boolean>} Success status
 */
async function navigateWithPanoramaLinks(page, direction, streetBearing, clicks, heading) {
  console.log(`[Pano Navigation] Moving ${direction} ${clicks} panoramas along street bearing ${streetBearing}°`);

  try {
    for (let i = 0; i < clicks; i++) {
      console.log(`[Pano Navigation] Step ${i + 1}/${clicks}`);

      // Get available links from current position
      const links = await getPanoramaLinks(page);

      if (links.length === 0) {
        console.log('[Pano Navigation] No links available, falling back to arrow navigation');
        return false;
      }

      // Determine target direction based on street bearing and direction
      const targetHeading = direction === 'forward' ? streetBearing : (streetBearing + 180) % 360;

      // Find the link with heading closest to our target direction
      let bestLink = null;
      let smallestDiff = 360;

      links.forEach(link => {
        const diff = Math.abs(normalizeHeadingDiff(link.heading, targetHeading));
        if (diff < smallestDiff) {
          smallestDiff = diff;
          bestLink = link;
        }
      });

      if (!bestLink) {
        console.log('[Pano Navigation] No suitable link found');
        return false;
      }

      console.log(`[Pano Navigation] Selected link: heading ${bestLink.heading}° (${bestLink.description || 'unnamed'})`);

      // Navigate to the selected panorama using setPano()
      const navigated = await page.evaluate((panoId) => {
        const panorama = window.panorama || window.gPanorama;
        if (panorama && panorama.setPano) {
          panorama.setPano(panoId);
          return true;
        }
        return false;
      }, bestLink.pano);

      if (!navigated) {
        console.log('[Pano Navigation] Could not navigate using setPano(), falling back');
        return false;
      }

      // Wait for panorama to load
      await page.waitForTimeout(3000);
      console.log(`[Pano Navigation] Moved to panorama ${bestLink.pano}`);
    }

    // Set final camera heading
    await setStreetViewHeading(page, heading);
    console.log('[Pano Navigation] Navigation complete');
    return true;

  } catch (error) {
    console.log(`[Pano Navigation] Error: ${error.message}`);
    return false;
  }
}

/**
 * Calculate the smallest angular difference between two headings
 * @param {number} heading1 - First heading (0-360)
 * @param {number} heading2 - Second heading (0-360)
 * @returns {number} Difference in degrees (-180 to 180)
 */
function normalizeHeadingDiff(heading1, heading2) {
  let diff = heading1 - heading2;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

/**
 * Navigate Street View using arrow keys/buttons (fallback method)
 * @param {Object} page - Playwright page object
 * @param {string} direction - 'forward' or 'back'
 * @param {number} clicks - Number of times to click the arrow
 * @param {number} heading - Camera heading to set after navigation
 * @returns {Promise<void>}
 */
async function navigateWithArrows(page, direction, clicks, heading) {
  console.log(`[Arrow Navigation] Moving ${direction} ${clicks} times`);

  // Arrow button selectors in Street View
  const arrowSelectors = {
    forward: [
      'button[aria-label*="Forward"]',
      'button[aria-label*="Move forward"]',
      'button[jsaction*="pane.svp.forward"]',
      'div[data-tooltip*="Forward"]',
      'button.widget-scene-directions-arrow[data-direction="forward"]'
    ],
    back: [
      'button[aria-label*="Back"]',
      'button[aria-label*="Move back"]',
      'button[jsaction*="pane.svp.back"]',
      'div[data-tooltip*="Back"]',
      'button.widget-scene-directions-arrow[data-direction="back"]'
    ]
  };

  const selectorsToTry = arrowSelectors[direction];

  for (let i = 0; i < clicks; i++) {
    console.log(`[Arrow Navigation] Click ${i + 1}/${clicks}`);
    let clicked = false;

    // Try each selector
    for (const selector of selectorsToTry) {
      try {
        const arrow = page.locator(selector).first();
        if (await arrow.count() > 0 && await arrow.isVisible()) {
          await arrow.click({ timeout: 2000 });
          clicked = true;
          await page.waitForTimeout(2000); // Wait for panorama transition
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Fallback: Use keyboard arrow keys
    if (!clicked) {
      console.log(`[Arrow Navigation] Using keyboard fallback`);
      const key = direction === 'forward' ? 'ArrowUp' : 'ArrowDown';
      await page.keyboard.press(key);
      await page.waitForTimeout(2000);
    }
  }

  // Set the heading after navigation
  await setStreetViewHeading(page, heading);
}

/**
 * Set Street View camera heading without changing position
 * @param {Object} page - Playwright page object
 * @param {number} heading - Desired heading in degrees (0-360)
 * @returns {Promise<void>}
 */
async function setStreetViewHeading(page, heading) {
  console.log(`[Heading] Setting camera heading to ${heading}°`);

  try {
    // Inject JavaScript to rotate the Street View camera
    await page.evaluate((targetHeading) => {
      // Try to find and modify the Street View panorama
      if (window.google && window.google.maps && window.google.maps.StreetViewPanorama) {
        // Get the Street View panorama instance
        const pano = document.querySelector('[role="region"]');
        if (pano) {
          // Dispatch mouse/touch events to rotate view
          // This is a simplified approach - Street View uses complex gesture handling
          const centerX = pano.offsetWidth / 2;
          const centerY = pano.offsetHeight / 2;

          // Calculate rotation needed
          // Note: This is an approximation and may need adjustment
          const event = new MouseEvent('mousedown', {
            bubbles: true,
            clientX: centerX,
            clientY: centerY
          });
          pano.dispatchEvent(event);
        }
      }

      // Alternative: Modify URL parameters
      const currentUrl = new URL(window.location.href);
      const urlParts = currentUrl.pathname.split(',');
      // Format: /@lat,lng,zoom,heading,tilt
      if (urlParts.length >= 5) {
        urlParts[4] = `${targetHeading}h`;
        const newPath = urlParts.join(',');
        // Note: This would require page navigation
      }
    }, heading);

    await page.waitForTimeout(1000);
  } catch (e) {
    console.log(`[Heading] Could not set heading programmatically: ${e.message}`);
    // Fallback: Use keyboard to rotate
    // Each arrow key press rotates about 22.5 degrees
    const rotations = Math.round(heading / 22.5);
    for (let i = 0; i < rotations; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
    }
  }
}

/**
 * Capture Google Street View screenshot for a given address
 * @param {Object} options - Capture options
 * @param {string} options.address - The address to capture
 * @param {boolean} [options.headless=true] - Run browser in headless mode
 * @param {number} [options.quality=85] - JPG quality (0-100)
 * @param {number} [options.width=1920] - Screenshot width
 * @param {number} [options.height=1080] - Screenshot height
 * @param {string} [options.outputDir='/app/screenshots'] - Output directory
 * @param {number} [options.heading] - Camera heading/direction (0-360°)
 * @param {number} [options.pitch=90] - Camera pitch/tilt (90=horizontal, <90=down, >90=up)
 * @param {number} [options.fov=75] - Field of view/zoom level
 * @param {boolean} [options.outdoor_only=true] - Force outdoor street-level imagery only
 * @param {boolean} [options.multi_position=false] - Capture from multiple positions (left, center, right)
 * @param {number} [options.position_offset=30] - Distance in meters between positions
 * @param {number} [options.street_bearing] - Manual street direction override (0-360°)
 * @returns {Promise<Object>} Result with filename, metadata, and status
 */
async function captureStreetView(options) {
  const {
    address,
    headless = true,
    quality = 85,
    width = 1920,
    height = 1080,
    outputDir = '/app/screenshots',
    heading,
    pitch = 90,
    fov = 75,
    outdoor_only = true,
    multi_position = false,
    position_offset = 30,
    street_bearing
  } = options;

  // If multi_position is requested, route to captureMultiPosition
  if (multi_position) {
    return await captureMultiPosition(options);
  }

  if (!address) {
    throw new Error('Address is required');
  }

  let browser = null;
  let context = null;
  let page = null;

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Launch browser with appropriate settings
    console.log(`[Capture] Launching browser (headless: ${headless})`);
    browser = await chromium.launch({
      headless,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
    });

    // Create context with viewport size
    context = await browser.newContext({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();

    // Navigate to Google Maps search with address (not direct Street View URL)
    // This allows us to click the Street View thumbnail for outdoor view
    const mapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
    console.log(`[Capture] Navigating to Google Maps search: ${address}`);
    await page.goto(mapsSearchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for initial load
    await page.waitForTimeout(3000);

    // Handle Google consent page if it appears
    const currentUrl = page.url();
    if (currentUrl.includes('consent.google.com')) {
      console.log('[Capture] Consent page detected, handling...');
      try {
        // Try to find and click consent buttons
        const consentButtons = [
          'button:has-text("Accept all")',
          'button:has-text("Alle akzeptieren")',
          'button:has-text("Reject all")',
          'button:has-text("Alle ablehnen")',
          'form[action*="save"] button',
          'button[type="submit"]'
        ];

        let clicked = false;
        for (const selector of consentButtons) {
          try {
            const button = page.locator(selector).first();
            if (await button.count() > 0) {
              await button.click();
              clicked = true;
              console.log('[Capture] Consent button clicked');
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (clicked) {
          // Wait for navigation back to Maps
          await page.waitForTimeout(5000);
          console.log('[Capture] Consent handled, returning to Maps');
        } else {
          console.log('[Capture] Could not find consent button, continuing anyway');
        }
      } catch (e) {
        console.log('[Capture] Error handling consent:', e.message);
      }
    }

    // Wait for Maps to load
    await page.waitForTimeout(3000);

    // Now find and click the Street View thumbnail (bottom right corner)
    console.log('[Capture] Looking for Street View thumbnail...');
    try {
      // Common selectors for the Street View thumbnail/pegman button
      const streetViewThumbnailSelectors = [
        'button[aria-label*="Street View"]',
        'button[aria-label*="street view"]',
        'button[jsaction*="pane.placeActions.clickStreetView"]',
        '[data-tooltip*="Street View"]',
        '[data-tooltip*="Straßenansicht"]',
        'img[src*="photosphere"]',  // The thumbnail image
        'a[href*=",3a,"]',  // Link to Street View
        // Try by position (bottom right area)
        'div[class*="app-viewcard"] button:has(img)',
        'button[class*="widget-expand-button-pegman"]'
      ];

      let thumbnailClicked = false;
      for (const selector of streetViewThumbnailSelectors) {
        try {
          const thumbnail = page.locator(selector).first();
          const count = await thumbnail.count();
          if (count > 0) {
            console.log(`[Capture] Found Street View thumbnail: ${selector}`);
            await thumbnail.click({ timeout: 3000 });
            thumbnailClicked = true;
            console.log('[Capture] Clicked Street View thumbnail, waiting for Street View to load...');
            await page.waitForTimeout(5000); // Wait for Street View to load
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!thumbnailClicked) {
        console.log('[Capture] Warning: Could not find Street View thumbnail. Street View may not be available for this location.');
      }
    } catch (e) {
      console.log('[Capture] Error clicking Street View thumbnail:', e.message);
    }

    // Wait for Street View to fully load
    await page.waitForTimeout(3000);

    // More lenient Street View detection
    const streetViewStatus = await page.evaluate(() => {
      // Check for canvas element (Street View renderer)
      const canvases = document.querySelectorAll('canvas');
      const hasCanvas = canvases.length > 0;

      // Check for specific Street View container
      const svContainer = document.querySelector('[class*="scene"], [class*="widget-scene"]');

      // Check URL to see if we're in Street View mode
      const url = window.location.href;
      const isStreetViewUrl = url.includes(',3a,') || url.includes('!1s');

      return {
        hasCanvas,
        canvasCount: canvases.length,
        hasSvContainer: svContainer !== null,
        isStreetViewUrl,
        url
      };
    });

    console.log(`[Capture] Street View status:`, streetViewStatus);

    // More lenient check - just need canvas OR street view URL pattern
    const hasStreetView = streetViewStatus.hasCanvas || streetViewStatus.isStreetViewUrl;

    if (!hasStreetView) {
      throw new Error(`Street View not available for address: ${address}`);
    }

    console.log('[Capture] Street View detected, proceeding with capture');

    // Extract coordinates from Street View URL
    const coords = await page.evaluate(() => {
      const url = window.location.href;
      // Extract lat,lng from URL like: /@51.1397783,6.4544648,3a...
      const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2])
        };
      }
      return { lat: 0, lng: 0 };
    });
    console.log(`[Capture] Coordinates from Street View: ${coords.lat}, ${coords.lng}`);

    // Validate outdoor view if requested
    if (outdoor_only) {
      const isOutdoor = await validateOutdoorView(page);
      if (!isOutdoor) {
        console.log('[Capture] Warning: Indoor view detected. Attempting to switch to outdoor street view...');

        // Try to find and click outdoor street view option
        try {
          // Look for common outdoor view selectors
          const outdoorSelectors = [
            'button[aria-label*="Street view"]',
            'button[aria-label*="street view"]',
            'button:has-text("Street view")',
            'button:has-text("Outdoor")',
            '[role="button"]:has-text("Street view")',
            // German translations
            'button[aria-label*="Straßenansicht"]',
            'button:has-text("Straßenansicht")'
          ];

          let clicked = false;
          for (const selector of outdoorSelectors) {
            try {
              const button = page.locator(selector).first();
              const count = await button.count();
              if (count > 0) {
                console.log(`[Capture] Found outdoor view button: ${selector}`);
                await button.click({ timeout: 2000 });
                clicked = true;
                console.log('[Capture] Clicked outdoor view button, waiting for switch...');
                await page.waitForTimeout(5000); // Wait for view to switch
                break;
              }
            } catch (e) {
              // Try next selector
            }
          }

          if (!clicked) {
            console.log('[Capture] No outdoor view button found. Using current view.');
          } else {
            // Re-validate after clicking
            const isOutdoorNow = await validateOutdoorView(page);
            if (isOutdoorNow) {
              console.log('[Capture] Successfully switched to outdoor view');
            } else {
              console.log('[Capture] Still showing indoor view after click attempt');
            }
          }
        } catch (e) {
          console.log('[Capture] Error attempting to switch views:', e.message);
        }
      }
    }

    // Store coordinates for metadata
    const lat = coords.lat;
    const lng = coords.lng;

    // Wait for panorama to render
    await page.waitForTimeout(3000);

    // Wait for final rendering (removed auto-close to prevent view switching)
    await page.waitForTimeout(2000);

    // Extract metadata
    console.log('[Capture] Extracting metadata...');
    const metadata = await page.evaluate(() => {
      return {
        url: window.location.href,
        capturedAt: new Date().toISOString()
      };
    });

    // Add coordinates from geocoding
    metadata.coordinates = { lat, lng };

    // Generate sanitized filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedAddress = sanitize(address.replace(/[,\s]+/g, '_').substring(0, 50));
    const baseFilename = `streetview_${sanitizedAddress}_${timestamp}`;
    const imageFilename = `${baseFilename}.jpg`;
    const metadataFilename = `${baseFilename}.json`;

    // Take screenshot
    console.log(`[Capture] Taking screenshot: ${imageFilename}`);
    const imagePath = path.join(outputDir, imageFilename);
    await page.screenshot({
      path: imagePath,
      type: 'jpeg',
      quality,
      fullPage: false
    });

    // Save metadata
    const metadataPath = path.join(outputDir, metadataFilename);
    const fullMetadata = {
      address,
      ...metadata,
      screenshot: {
        filename: imageFilename,
        width,
        height,
        quality,
        format: 'jpeg'
      }
    };

    await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2));

    console.log('[Capture] Screenshot captured successfully');

    return {
      success: true,
      filename: imageFilename,
      metadata: fullMetadata,
      paths: {
        image: imagePath,
        metadata: metadataPath
      }
    };

  } catch (error) {
    console.error('[Capture] Error:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Capture Street View from multiple positions along the street
 * Captures left neighbor, target property, and right neighbor - each at 90° to building face
 * @param {Object} options - Capture options (same as captureStreetView plus multi_position options)
 * @returns {Promise<Object>} Result with multiple captures
 */
async function captureMultiPosition(options) {
  const {
    address,
    position_offset = 30,
    street_bearing: manualStreetBearing,
    heading: manualHeading,
    pitch = 90,
    fov = 75,
    outdoor_only = true,
    outputDir = '/app/screenshots'
  } = options;

  console.log(`[Multi-Position] Starting multi-position capture for: ${address}`);
  console.log(`[Multi-Position] Position offset: ${position_offset}m`);

  try {
    // Geocode target address
    const targetCoords = await geocodeAddress(address);
    console.log(`[Multi-Position] Target coordinates: ${targetCoords.lat}, ${targetCoords.lng}`);

    // Detect or use manual street direction
    let streetBearing;
    if (manualStreetBearing !== undefined) {
      streetBearing = manualStreetBearing;
      console.log(`[Multi-Position] Using manual street bearing: ${streetBearing}°`);
    } else {
      streetBearing = await detectStreetDirection(targetCoords);
      console.log(`[Multi-Position] Detected street bearing: ${streetBearing}°`);
    }

    // Calculate heading perpendicular to street (facing buildings)
    const buildingHeading = manualHeading !== undefined ? manualHeading : (streetBearing + 90) % 360;
    console.log(`[Multi-Position] Building heading (perpendicular to street): ${buildingHeading}°`);

    // Calculate 3 positions along the street
    const positions = {
      left: {
        coords: calculateNewCoords(targetCoords, position_offset, (streetBearing + 180) % 360),
        heading: buildingHeading,
        label: 'left',
        description: 'Left neighbor property'
      },
      center: {
        coords: targetCoords,
        heading: buildingHeading,
        label: 'center',
        description: 'Target property'
      },
      right: {
        coords: calculateNewCoords(targetCoords, position_offset, streetBearing),
        heading: buildingHeading,
        label: 'right',
        description: 'Right neighbor property'
      }
    };

    console.log(`[Multi-Position] Calculated positions:`);
    console.log(`  - Left: ${positions.left.coords.lat}, ${positions.left.coords.lng}`);
    console.log(`  - Center: ${positions.center.coords.lat}, ${positions.center.coords.lng}`);
    console.log(`  - Right: ${positions.right.coords.lat}, ${positions.right.coords.lng}`);

    // Capture from each position
    const captures = [];
    const captureOrder = ['left', 'center', 'right'];

    for (const posKey of captureOrder) {
      const position = positions[posKey];
      console.log(`[Multi-Position] Capturing ${position.label} position...`);

      try {
        // Create modified options for single capture
        const singleCaptureOptions = {
          ...options,
          multi_position: false, // Prevent recursion
          heading: position.heading,
          pitch,
          fov,
          outdoor_only,
          // Inject coordinates directly (skip geocoding)
          _coords: position.coords,
          _positionLabel: position.label,
          _streetBearing: streetBearing
        };

        const result = await captureSinglePosition(singleCaptureOptions);

        captures.push({
          position: position.label,
          heading: position.heading,
          coordinates: position.coords,
          description: position.description,
          ...result
        });

        console.log(`[Multi-Position] ✓ ${position.label} capture complete: ${result.filename}`);
      } catch (error) {
        console.error(`[Multi-Position] ✗ ${position.label} capture failed: ${error.message}`);
        captures.push({
          position: position.label,
          error: error.message,
          success: false
        });
      }
    }

    // Check if at least one capture succeeded
    const successfulCaptures = captures.filter(c => c.success !== false);
    if (successfulCaptures.length === 0) {
      throw new Error('All multi-position captures failed');
    }

    console.log(`[Multi-Position] Complete: ${successfulCaptures.length}/3 captures successful`);

    return {
      success: true,
      multi_position: true,
      target_address: address,
      street_bearing: streetBearing,
      building_heading: buildingHeading,
      position_offset: position_offset,
      captures
    };

  } catch (error) {
    console.error(`[Multi-Position] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Capture single position (used by multi-position capture)
 * Similar to captureStreetView but with pre-calculated coordinates
 * @param {Object} options - Capture options with _coords injected
 * @returns {Promise<Object>} Capture result
 */
async function captureSinglePosition(options) {
  const {
    address,
    _coords,
    _positionLabel = '',
    _streetBearing,
    headless = true,
    quality = 85,
    width = 1920,
    height = 1080,
    outputDir = '/app/screenshots',
    heading = 0,
    pitch = 85,
    fov = 75,
    outdoor_only = true,
    position_offset = 30
  } = options;

  let browser = null;
  let context = null;
  let page = null;

  try {
    await fs.mkdir(outputDir, { recursive: true });

    // Launch browser
    browser = await chromium.launch({
      headless,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
    });

    context = await browser.newContext({
      viewport: { width, height },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();

    // Use provided coords (already geocoded)
    const coords = _coords;

    // For multi-position: First enter Street View using address (if first position),
    // then navigate to specific coordinates
    console.log(`[Capture] Navigating to Street View (${_positionLabel}): heading=${heading}°`);

    // Check if we're already in Street View mode
    const currentUrl = page.url();
    const isInStreetView = currentUrl.includes(',3a,') || currentUrl.includes('/@');

    if (!isInStreetView) {
      // First position - enter Street View via Maps search + thumbnail
      console.log(`[Capture] Entering Street View for address: ${address}`);
      const mapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
      await page.goto(mapsSearchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Handle consent if needed
      if (page.url().includes('consent.google.com')) {
        console.log('[Capture] Consent page detected');
        const consentButtons = [
          'button:has-text("Accept all")',
          'button:has-text("Alle akzeptieren")',
          'button:has-text("Reject all")',
          'form[action*="save"] button'
        ];

        for (const selector of consentButtons) {
          try {
            const button = page.locator(selector).first();
            if (await button.count() > 0) {
              await button.click();
              await page.waitForTimeout(5000);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }

      // Click Street View thumbnail
      await page.waitForTimeout(3000);
      console.log('[Capture] Looking for Street View thumbnail...');
      const streetViewThumbnailSelectors = [
        'button[aria-label*="Street View"]',
        'button[aria-label*="street view"]',
        'button[jsaction*="pane.placeActions.clickStreetView"]',
        '[data-tooltip*="Street View"]',
        '[data-tooltip*="Straßenansicht"]',
        'img[src*="photosphere"]',
        'a[href*=",3a,"]',
        'div[class*="app-viewcard"] button:has(img)'
      ];

      let thumbnailClicked = false;
      for (const selector of streetViewThumbnailSelectors) {
        try {
          const thumbnail = page.locator(selector).first();
          if (await thumbnail.count() > 0) {
            console.log(`[Capture] Clicking Street View thumbnail`);
            await thumbnail.click({ timeout: 3000 });
            thumbnailClicked = true;
            await page.waitForTimeout(5000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (!thumbnailClicked) {
        console.log('[Capture] Warning: Could not find Street View thumbnail');
      }
    }

    // For multi-position: Navigate using arrows instead of coordinates
    // This keeps us on outdoor panoramas instead of snapping to business interiors
    if (_positionLabel && _positionLabel !== 'center') {
      console.log(`[Capture] Navigating to ${_positionLabel} position`);

      // Determine direction and number of clicks based on position offset
      const direction = _positionLabel === 'left' ? 'back' : 'forward';
      // Calculate number of steps (roughly 10-15m per panorama)
      const steps = Math.ceil(position_offset / 15);

      // Try panorama link navigation first (more reliable)
      let success = false;
      if (_streetBearing !== undefined) {
        console.log(`[Capture] Trying panorama link navigation (street bearing: ${_streetBearing}°)`);
        success = await navigateWithPanoramaLinks(page, direction, _streetBearing, steps, heading);
      }

      // Fallback to arrow navigation if panorama links failed
      if (!success) {
        console.log(`[Capture] Falling back to arrow navigation`);
        await navigateWithArrows(page, direction, steps, heading);
      }
    } else if (_positionLabel === 'center') {
      console.log(`[Capture] Center position - staying at current location`);
      // Just set the heading without navigating
      await setStreetViewHeading(page, heading);
    } else {
      // Single position mode - navigate to coordinates as before
      console.log(`[Capture] Navigating to position: ${coords.lat}, ${coords.lng}`);
      const streetViewUrl = buildStreetViewUrl(coords, {
        heading,
        pitch,
        fov,
        outdoor_only: false
      });
      await page.goto(streetViewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);
    }

    // Validate outdoor if needed
    if (outdoor_only) {
      await validateOutdoorView(page);
    }

    // Wait for final rendering (removed auto-close to prevent view switching)
    await page.waitForTimeout(2000);

    // Generate filename with position label
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedAddress = sanitize(address.replace(/[,\s]+/g, '_').substring(0, 50));
    const baseFilename = `streetview_${sanitizedAddress}_${timestamp}${_positionLabel ? '_' + _positionLabel : ''}`;
    const imageFilename = `${baseFilename}.jpg`;
    const metadataFilename = `${baseFilename}.json`;

    // Take screenshot
    const imagePath = path.join(outputDir, imageFilename);
    await page.screenshot({
      path: imagePath,
      type: 'jpeg',
      quality,
      fullPage: false
    });

    // Save metadata
    const metadata = {
      address,
      url: page.url(),
      capturedAt: new Date().toISOString(),
      coordinates: coords,
      heading,
      pitch,
      fov,
      position: _positionLabel || 'single',
      screenshot: {
        filename: imageFilename,
        width,
        height,
        quality,
        format: 'jpeg'
      }
    };

    const metadataPath = path.join(outputDir, metadataFilename);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return {
      success: true,
      filename: imageFilename,
      metadata,
      paths: {
        image: imagePath,
        metadata: metadataPath
      }
    };

  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Get list of captured screenshots
 * @param {string} [outputDir='/app/screenshots'] - Output directory
 * @returns {Promise<Array>} List of screenshot files with metadata
 */
async function listCaptures(outputDir = '/app/screenshots') {
  try {
    const files = await fs.readdir(outputDir);
    const jpgFiles = files.filter(f => f.endsWith('.jpg'));

    const captures = await Promise.all(jpgFiles.map(async (filename) => {
      const metadataFile = filename.replace('.jpg', '.json');
      const metadataPath = path.join(outputDir, metadataFile);

      let metadata = null;
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        // Metadata file might not exist
      }

      const stats = await fs.stat(path.join(outputDir, filename));

      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        metadata
      };
    }));

    return captures.sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error('[List] Error:', error.message);
    return [];
  }
}

module.exports = {
  captureStreetView,
  listCaptures
};
