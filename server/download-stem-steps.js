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
        if (stemType === "other") {
          // For 'other' stem, look in stemAssets array
          const otherStem = jobResponse.data.job.stemAssets?.find(
            (asset) => asset.name === "other.wav"
          );
          stemUrl = otherStem?.link;
        } else {
          // For other stems, look in stemAssets array with their respective names
          const stem = jobResponse.data.job.stemAssets?.find(
            (asset) => asset.name === `${stemType}.wav`
          );
          if (stem) {
            stemUrl = stem.link;
          } else {
            // Fallback to output.url if stemAssets not found
            stemUrl = jobResponse.data.job.output?.url;
          }
        }

        if (!stemUrl) {
          console.error(
            `No URL found for ${stemType} stem in job response. Job data:`,
            JSON.stringify(jobResponse.data.job, null, 2)
          );
          continue;
        }

        console.log(`Found stem URL for ${stemType}:`, stemUrl);

        console.log(`Downloading stem from URL: ${stemUrl}`);

        // Set up headers - only include Authorization for non-S3 URLs
        const headers = {
          Accept: "*/*",
        };
        if (!stemUrl.includes("s3.amazonaws.com")) {
          headers["Authorization"] = `Bearer ${process.env.AUDIOSHAKE_API_KEY}`;
        }

        const response = await axios({
          method: "GET",
          url: stemUrl,
          responseType: "arraybuffer",
          headers,
          maxRedirects: 5,
          validateStatus: null,
        });

        if (response.status !== 200) {
          console.error(`Error downloading ${stemType} stem: Status ${response.status}`);
          if (response.data) {
            console.error("Response:", response.data.toString());
          }
          continue;
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(songStemsDir)) {
          fs.mkdirSync(songStemsDir, { recursive: true });
        }

        // Download the stem file with a unique name
        const stemPath = path.join(songStemsDir, `${stemType}.wav`);
        console.log(`Downloading to ${stemPath}`);

        // Write the buffer to file
        try {
          await fs.promises.writeFile(stemPath, response.data);
          console.log(`Successfully wrote ${stemType} stem to ${stemPath}`);

          // Verify the file was written
          const stats = await fs.promises.stat(stemPath);
          console.log(`File size: ${stats.size} bytes`);

          console.log(`Successfully downloaded ${stemType} to ${stemPath}`);
          stemPaths[stemType] = path.basename(stemPath); // Store just the filename
        } catch (writeError) {
          console.error(`Error writing file ${stemPath}:`, writeError);
          continue;
        }
      } catch (error) {
        console.error(`Error downloading ${stemType} stem:`, error);
        if (error.response) {
          console.error("Response:", error.response.data);
        }
      }
    }

    console.log("\nAll stems downloaded:", stemPaths);
    return stemPaths;
  } catch (error) {
    console.error("Error in downloadStems:", error);
    throw error;
  }
}

module.exports = {
  downloadStems,
};
