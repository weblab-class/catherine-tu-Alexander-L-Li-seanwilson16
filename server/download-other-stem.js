const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function downloadOtherStem() {
  try {
    const jobId = 'cm6gy063c03oc0joi0zr33s5t';
    const assetId = 'cm6gy04b902wbtgtwnm481wa2';
    
    // First get the job details
    const jobConfig = {
      method: 'get',
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      }
    };

    const jobResponse = await axios.request(jobConfig);
    console.log('Job Status:', jobResponse.data.job.status);
    
    if (jobResponse.data.job.stemAssets && jobResponse.data.job.stemAssets.length > 0) {
      const stemAsset = jobResponse.data.job.stemAssets[0];
      console.log('Stem Asset:', stemAsset);
      
      // Download the stem
      const downloadConfig = {
        method: 'get',
        url: stemAsset.link,
        responseType: 'arraybuffer'
      };

      const response = await axios.request(downloadConfig);
      const outputDir = path.join(__dirname, `../stems/${assetId}`);
      const outputPath = path.join(outputDir, 'other.wav');
      
      fs.writeFileSync(outputPath, response.data);
      console.log(`Successfully downloaded other stem to ${outputPath}`);
    } else {
      console.log('No stem assets found in job response');
    }
  } catch (error) {
    console.log("Error:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
  }
}

downloadOtherStem();
