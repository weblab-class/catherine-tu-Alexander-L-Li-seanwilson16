const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Create an axios instance that includes credentials
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true
});

async function testUpload() {
  try {
    // First check if we're logged in
    console.log("🔍 Checking login status...");
    const whoami = await api.get('/api/whoami');
    if (!whoami.data._id) {
      console.log("❌ Not logged in. Please log in through the web interface first (http://localhost:5173)");
      return;
    }
    console.log("✅ Logged in as:", whoami.data.name);

    // Create a test audio file from base64
    const outputFile = path.join(__dirname, "test-audio.mp3");
    
    // This is a tiny MP3 file (44.1kHz, mono, 1 second of silence)
    const base64Mp3 = `SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=`;
    
    // Write the base64 to a file
    fs.writeFileSync(outputFile, Buffer.from(base64Mp3, 'base64'));
    console.log("✅ Created test audio file");

    // Create form data
    const form = new FormData();
    form.append("audio", fs.createReadStream(outputFile));
    form.append("title", "Test Song");

    // Upload to your API
    console.log("📤 Uploading to API...");
    const response = await api.post("/api/song", form, {
      headers: {
        ...form.getHeaders(),
      }
    });

    console.log("✅ Upload successful!");
    console.log("Response:", response.data);
    console.log("🔗 File URL:", response.data.filePath);

    // Clean up test file
    fs.unlinkSync(outputFile);
    console.log("🧹 Cleaned up test file");

  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    if (error.response?.data) {
      console.error("Response data:", error.response.data);
    }
  }
}

testUpload();
