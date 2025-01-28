const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testAudioShake() {
  try {
    // Step 1: Upload file and create asset
    console.log("Step 1: Creating asset...");
    const filePath = path.join(__dirname, '../uploads/1738094155040-823905216.mp3');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const uploadConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://groovy.audioshake.ai/upload/',
      headers: { 
        ...formData.getHeaders(),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      },
      data: formData
    };

    const uploadResponse = await axios.request(uploadConfig);
    console.log("Asset created:", JSON.stringify(uploadResponse.data));
    const assetId = uploadResponse.data.id;
    console.log(assetId)

    // Step 2: Create stem separation job -- VOCALS
    console.log("\nStep 2: Creating stem separation jobs...");
    
    // Vocals
    console.log("Creating vocals stem...");
    let vocalsData = JSON.stringify({
        "callbackUrl": "https://example.com/webhook/vocals",
        "assetId": assetId,
        "stemMetadata": {
          "format": "wav",
          "stemName": "vocals"
        },
        "otherSourceAssets": [
          {
            "id": "string",
            "type": "transcription",
            "name": "string"
          }
        ]
      });
      
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://groovy.audioshake.ai/job/',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      },
      data: vocalsData
    };

    const vocalsResponse = await axios.request(config);
    console.log("Vocals job created:", JSON.stringify(vocalsResponse.data));

    // Drums
    console.log("\nCreating drums stem...");
    let drumsData = JSON.stringify({
        "callbackUrl": "https://example.com/webhook/drums",
        "assetId": assetId,
        "stemMetadata": {
          "format": "wav",
          "stemName": "drums"
        },
        "otherSourceAssets": [
          {
            "id": "string",
            "type": "transcription",
            "name": "string"
          }
        ]
      });

    config.data = drumsData;
    const drumsResponse = await axios.request(config);
    console.log("Drums job created:", JSON.stringify(drumsResponse.data));

    // Bass
    console.log("\nCreating bass stem...");
    let bassData = JSON.stringify({
        "callbackUrl": "https://example.com/webhook/bass",
        "assetId": assetId,
        "stemMetadata": {
          "format": "wav",
          "stemName": "bass"
        },
        "otherSourceAssets": [
          {
            "id": "string",
            "type": "transcription",
            "name": "string"
          }
        ]
      });

    config.data = bassData;
    const bassResponse = await axios.request(config);
    console.log("Bass job created:", JSON.stringify(bassResponse.data));

    // Other
    console.log("\nCreating other stem...");
    let otherData = JSON.stringify({
        "callbackUrl": "https://example.com/webhook/other",
        "assetId": assetId,
        "stemMetadata": {
          "format": "wav",
          "stemName": "other"
        },
        "otherSourceAssets": [
          {
            "id": "string",
            "type": "transcription",
            "name": "string"
          }
        ]
      });

    config.data = otherData;
    const otherResponse = await axios.request(config);
    console.log("Other job created:", JSON.stringify(otherResponse.data));

  } catch (error) {
    if (error.response) {
      console.log("Error:", {
        message: error.message,
        response: error.response.data
      });
    } else {
      console.log("Error:", error.message);
    }
  }
}

testAudioShake();