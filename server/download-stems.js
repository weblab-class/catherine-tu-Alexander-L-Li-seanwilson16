const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function downloadStems() {
  try {
    const assetId = 'cm6gy04b902wbtgtwnm481wa2';
    const jobIds = [
      'cm6gy04f6042i0jpufnpu16l1', // vocals
      'cm6gy051303ob0joi3g7r9i32', // drums
      'cm6gy05ko042j0jpu4ui8ebkf', // bass
      'cm6gy063c03oc0joi0zr33s5t'  // other
    ];

    // Wait for 30 seconds to ensure all stems are ready
    console.log('Waiting for 30 seconds to ensure all stems are ready...');
    await delay(30000);

    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://groovy.audioshake.ai/download/?assetId=${assetId}&jobIds=${jobIds.join(',')}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      },
      responseType: 'arraybuffer'
    };

    let response;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    while (retryCount <= maxRetries) {
      try {
        response = await axios.request(config);
        break;
      } catch (error) {
        retryCount++;
        console.log(`Error downloading stems: ${error.message}. Retrying in ${retryDelay / 1000} seconds...`);
        await delay(retryDelay);
      }
    }

    if (!response) {
      console.log('Failed to download stems after ' + maxRetries + ' retries.');
      return;
    }

    const outputDir = path.join(__dirname, `../stems/${assetId}`);
    const zipPath = path.join(outputDir, 'stems.zip');
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write zip file
    fs.writeFileSync(zipPath, response.data);
    console.log(`Downloaded stems to ${zipPath}`);

    // Extract zip file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    console.log(`Extracted stems to ${outputDir}`);

    // Clean up zip file
    fs.unlinkSync(zipPath);
    console.log('Cleaned up zip file');

    // List extracted files
    const files = fs.readdirSync(outputDir);
    console.log('\nExtracted files:');
    files.forEach(file => console.log(`- ${file}`));

    // Check if we have all expected stems
    const expectedStems = ['vocals.mp3', 'drums.wav', 'bass.wav', 'other.wav'];
    const missingStems = expectedStems.filter(stem => !files.includes(stem));
    
    if (missingStems.length > 0) {
      console.log('\nMissing stems:', missingStems);
      console.log('You may need to wait a bit longer and try again, as some stems might still be processing.');
    } else {
      console.log('\nAll stems downloaded successfully!');
    }

  } catch (error) {
    console.log("Error:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
  }
}

downloadStems();
