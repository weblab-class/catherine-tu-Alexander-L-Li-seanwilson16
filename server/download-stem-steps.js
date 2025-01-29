const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * Downloads and saves stems from AudioShake
 * @param {string} assetId - AudioShake asset ID
 * @param {string[]} jobIds - Array of AudioShake job IDs
 * @param {string} songStemsDir - Directory to save stems for this specific song
 * @returns {Object} - Object containing paths to downloaded stems
 */
async function downloadStems(assetId, jobIds, songStemsDir) {
  try {
    console.log("Starting stem downloads...");
    console.log("Asset ID:", assetId);
    console.log("Job IDs:", jobIds);
    console.log("Song stems directory:", songStemsDir);

    // Ensure stems directory exists
    if (!fs.existsSync(songStemsDir)) {
      fs.mkdirSync(songStemsDir, { recursive: true });
    }

    const stemPaths = {};
    const stemTypes = ["vocals", "drums", "bass", "other"];

    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      const stemType = stemTypes[i];
      console.log(`\nDownloading ${stemType} stem (Job ID: ${jobId})...`);

      try {
        // First get the download URL
        const jobResponse = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
          headers: {
            Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
          },
        });
        console.log(`Job status for ${stemType}:`, jobResponse.data.job.status);

        if (
          !jobResponse.data ||
          !jobResponse.data.job ||
          jobResponse.data.job.status !== "completed"
        ) {
          console.log(`Job ${jobId} not ready yet:`, jobResponse.data);
          continue;
        }

        // Get the stem URL based on stem type
        let stemUrl;
        if (jobResponse.data.job.stems && jobResponse.data.job.stems[stemType]) {
          stemUrl = jobResponse.data.job.stems[stemType];
          console.log(`Got stem URL for ${stemType}:`, stemUrl);
        } else {
          console.error(`No stem URL found for ${stemType}`);
          continue;
        }

        // Download the stem
        const stemResponse = await axios.get(stemUrl, {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
          },
        });
        console.log(`Downloaded ${stemType} stem, size:`, stemResponse.data.length);

        // Save to S3
        const s3Key = `stems/${songStemsDir}/${stemType}_stem.wav`;
        console.log(`Uploading ${stemType} stem to S3:`, s3Key);
        
        const uploadParams = {
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: stemResponse.data,
          ContentType: 'audio/wav'
        };

        const uploadResult = await s3.upload(uploadParams).promise();
        console.log(`Uploaded ${stemType} stem to S3:`, uploadResult.Location);
        
        stemPaths[stemType] = uploadResult.Location;
      } catch (error) {
        console.error(`Error processing ${stemType} stem:`, error);
        throw error;
      }
    }

    return stemPaths;
  } catch (error) {
    console.error("Error in downloadStems:", error);
    throw error;
  }
}

module.exports = {
  downloadStems,
};
