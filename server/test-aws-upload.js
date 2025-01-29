const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testAwsUpload() {
  try {
    // First verify we're logged in
    console.log('Verifying login...');
    const whoamiResponse = await axios.get('http://localhost:3000/api/whoami', {
      withCredentials: true,
      headers: {
        Cookie: `connect.sid=${process.env.TEST_SESSION_COOKIE}`,
      },
    });

    if (!whoamiResponse.data._id) {
      throw new Error('Not logged in. Make sure you have a valid session cookie');
    }

    console.log('Logged in as:', whoamiResponse.data.name);

    // Use one of the working default songs
    const defaultSongPath = path.join(__dirname, '../client/public/assets/uploads/NCS_Fall_to_Light.mp3');
    
    // Create form data
    const form = new FormData();
    form.append('title', 'Test Upload - NCS Fall to Light');
    form.append('audio', fs.createReadStream(defaultSongPath));

    // Upload the song
    console.log('\nUploading song to AWS...');
    const uploadResponse = await axios.post('http://localhost:3000/api/song', form, {
      withCredentials: true,
      headers: {
        ...form.getHeaders(),
        Cookie: `connect.sid=${process.env.TEST_SESSION_COOKIE}`,
      },
    });

    console.log('\nUpload successful! Song details:');
    console.log('- ID:', uploadResponse.data._id);
    console.log('- Title:', uploadResponse.data.title);
    console.log('- S3 URL:', uploadResponse.data.filePath);
    
    // Wait a moment then check if it exists in S3
    console.log('\nWaiting 5 seconds then checking if file exists...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const fileCheck = await axios.get(uploadResponse.data.filePath);
      console.log('\nSuccess! File is accessible in S3');
      console.log('Content type:', fileCheck.headers['content-type']);
      console.log('File size:', fileCheck.headers['content-length'], 'bytes');
    } catch (error) {
      console.error('\nError: Could not access file in S3');
      console.error('Status:', error.response?.status);
      console.error('Message:', error.message);
    }

  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

if (!process.env.TEST_SESSION_COOKIE) {
  console.error('Please set TEST_SESSION_COOKIE environment variable with the value of your connect.sid cookie');
  console.error('To get this:');
  console.error('1. Open your browser\'s Developer Tools (F12)');
  console.error('2. Go to the Application/Storage tab');
  console.error('3. Look for Cookies -> localhost:3000');
  console.error('4. Find the "connect.sid" cookie');
  console.error('5. Copy ONLY the value (not the whole cookie string)');
  console.error('\nThen run:');
  console.error('export TEST_SESSION_COOKIE="your_cookie_value_here"');
  process.exit(1);
}

testAwsUpload();
