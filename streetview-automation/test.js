#!/usr/bin/env node

/**
 * Simple test script for Street View Automation Service
 */

const http = require('http');

const testAddresses = [
  'Eiffel Tower, Paris, France',
  'Big Ben, London, UK',
  'Colosseum, Rome, Italy'
];

function captureStreetView(address) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      address,
      headless: true,
      quality: 85
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/capture',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Street View Automation Service\n');

  // Test health endpoint
  console.log('1. Testing health endpoint...');
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          console.log(`   ✅ Health check: ${result.status}`);
          resolve();
        });
      }).on('error', reject);
    });
  } catch (error) {
    console.error(`   ❌ Health check failed: ${error.message}`);
    process.exit(1);
  }

  // Test capture with first address
  console.log('\n2. Testing screenshot capture...');
  const testAddress = testAddresses[0];
  console.log(`   Address: ${testAddress}`);

  try {
    const result = await captureStreetView(testAddress);

    if (result.success) {
      console.log(`   ✅ Capture successful!`);
      console.log(`   📸 Filename: ${result.data.filename}`);
      console.log(`   📍 Coordinates: ${result.data.metadata.coordinates.lat}, ${result.data.metadata.coordinates.lng}`);
      console.log(`   💾 Size: ${(result.data.metadata.screenshot.width * result.data.metadata.screenshot.height / 1000000).toFixed(2)}MP`);
    } else {
      console.error(`   ❌ Capture failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Capture failed: ${error.message}`);
    process.exit(1);
  }

  // Test list captures
  console.log('\n3. Testing list captures endpoint...');
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/captures', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          console.log(`   ✅ Found ${result.count} capture(s)`);
          resolve();
        });
      }).on('error', reject);
    });
  } catch (error) {
    console.error(`   ❌ List captures failed: ${error.message}`);
    process.exit(1);
  }

  console.log('\n✨ All tests passed!\n');
  console.log('💡 To test more addresses, edit the testAddresses array in test.js');
  console.log('📁 Screenshots saved to: ../streetview-screenshots/\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
