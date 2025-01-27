const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const AUDIOSHAKE_API_URL = "https://groovy.audioshake.ai/api/v1";
const AUDIOSHAKE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA";

class AudioShakeAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: AUDIOSHAKE_API_URL,
      headers: {
        Authorization: `Bearer ${AUDIOSHAKE_TOKEN}`,
      },
    });
  }

  async uploadFile(filePath) {
    console.log("Uploading file to AudioShake:", filePath);
    const formData = new FormData();
    
    console.log("Creating read stream for file");
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error("Error reading file:", error);
    });
    
    // Set the correct content type based on the file extension
    const fileType = filePath.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
    formData.append("file", fileStream, {
      filename: path.basename(filePath),
      contentType: fileType
    });

    try {
      console.log("Making upload request to AudioShake...");
      const response = await this.axiosInstance.post("/upload", formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      console.log("AudioShake upload response:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error("AudioShake upload error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      throw error;
    }
  }

  async startStemSeparation(uploadId) {
    console.log("Starting stem separation for upload:", uploadId);
    try {
      console.log("Making separation request to AudioShake...");
      const response = await this.axiosInstance.post("/separate", {
        upload_id: uploadId,
        stems: ["vocals", "drums", "bass", "other"],
      });
      console.log("AudioShake separation response:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error("AudioShake separation error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      throw error;
    }
  }

  async checkSeparationStatus(jobId) {
    console.log("Checking separation status for job:", jobId);
    try {
      console.log("Making status check request to AudioShake...");
      const response = await this.axiosInstance.get(`/status/${jobId}`);
      console.log("AudioShake status response:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error("AudioShake status check error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      throw error;
    }
  }

  async downloadStem(jobId, stemType) {
    console.log(`Downloading ${stemType} stem for job:`, jobId);
    try {
      const response = await this.axiosInstance.get(`/download/${jobId}/${stemType}`, {
        responseType: "arraybuffer",
      });
      console.log(`Successfully downloaded ${stemType} stem`);
      return response.data;
    } catch (error) {
      console.error(`Error downloading ${stemType} stem:`, error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = { AudioShakeAPI, AUDIOSHAKE_TOKEN };
