// EQUIVALENT to test-audioshake.js, but for all file uploads
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Creates stems for a song using AudioShake API
 * @param {string} filePath - Path to the audio file
 * @param {string} songId - ID of the song in the database
 * @returns {Object} - Object containing assetId and jobIds
 */
async function createStems(filePath, songId) {
  try {
    // Step 1: Upload file and create asset
    console.log("\n=== Starting stem creation process ===");
    console.log("Input:", { filePath, songId });
    console.log("API Key present:", !!process.env.AUDIOSHAKE_API_KEY);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    console.log("Making upload request to AudioShake...");
    const uploadConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://groovy.audioshake.ai/upload/',
      headers: { 
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
      },
      data: formData
    };

    const uploadResponse = await axios.request(uploadConfig);
    console.log("Asset created:", uploadResponse.data);
    const assetId = uploadResponse.data.id;

    // Step 2: Create stem separation jobs
    console.log("\n=== Creating stem separation jobs ===");
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];  // These are valid stem types according to AudioShake
    const jobIds = [];

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://groovy.audioshake.ai/job/',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
      }
    };

    for (const stemType of stemTypes) {
      console.log(`\nCreating ${stemType} stem...`);
      const jobData = {
        assetId: assetId,
        callbackUrl: `https://example.com/webhook/${stemType}`,
        stemMetadata: {
          format: "wav",
          stemName: stemType  // Changed back to stemName as that's what AudioShake expects
        }
      };

      console.log("Job request:", jobData);
      config.data = JSON.stringify(jobData);
      
      const response = await axios.request(config);
      console.log(`${stemType} job response:`, response.data);
      
      if (!response.data || !response.data.job || !response.data.job.id) {
        throw new Error(`Invalid response for ${stemType} job`);
      }
      
      jobIds.push(response.data.job.id);
    }

    console.log("\n=== Stem creation complete ===");
    console.log("Results:", { assetId, jobIds });
    
    return {
      assetId,
      jobIds
    };

  } catch (error) {
    console.error("\n=== Error in createStems ===");
    console.error("Error:", error.message);
    if (error.response) {
      console.error("API Response:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
}

/**
 * Check the status of stem separation jobs
 * @param {string[]} jobIds - Array of job IDs to check
 * @returns {boolean} - True if all jobs are complete
 */
async function checkStemStatus(jobIds) {
  try {
    console.log("\nChecking status for jobs:", jobIds);
    const jobStatuses = await Promise.all(jobIds.map(async jobId => {
      const response = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
        }
      });
      console.log(`Job ${jobId} status:`, response.data.job.status);
      return response;
    }));

    const allComplete = jobStatuses.every(response => response.data.job.status === 'completed');
    console.log("All jobs complete?", allComplete);
    
    if (!allComplete) {
      // Log individual job statuses
      jobStatuses.forEach(response => {
        const job = response.data.job;
        console.log(`Job ${job.id}: status=${job.status}, progress=${job.progress || 'N/A'}`);
      });
    }

    return allComplete;
  } catch (error) {
    console.error("Error checking stem status:", error);
    throw error;
  }
}

module.exports = {
  createStems,
  checkStemStatus
};
