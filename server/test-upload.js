const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function uploadSong() {
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

    // Create form data
    const form = new FormData();
    form.append('title', 'Test Song ' + new Date().toISOString());
    
    // Read test audio file
    const audioPath = path.join(__dirname, 'test.mp3');
    form.append('audio', fs.createReadStream(audioPath));

    // Upload the song
    console.log('Uploading song...');
    const uploadResponse = await axios.post('http://localhost:3000/api/song', form, {
      withCredentials: true,
      headers: {
        ...form.getHeaders(),
        Cookie: `connect.sid=${process.env.TEST_SESSION_COOKIE}`,
      },
    });

    console.log('Upload successful:', uploadResponse.data);
    const songId = uploadResponse.data._id;

    // Poll for stem processing status
    let processed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
    let lastStatus = '';

    console.log('\nWaiting for stem processing to complete...');
    console.log('This may take several minutes. Current status will be shown when it changes.');

    while (!processed && attempts < maxAttempts) {
      const statusResponse = await axios.get(`http://localhost:3000/api/song/${songId}`, {
        withCredentials: true,
        headers: {
          Cookie: `connect.sid=${process.env.TEST_SESSION_COOKIE}`,
        },
      });
      
      const song = statusResponse.data;
      const currentStatus = `${song.stemsStatus} (${Object.keys(song.stems || {}).length} stems)`;
      
      // Only log when status changes
      if (currentStatus !== lastStatus) {
        console.log(`\nStatus update (${attempts + 1}/${maxAttempts}):`, {
          processed: song.processed,
          stemsStatus: song.stemsStatus,
          stems: Object.keys(song.stems || {}).length > 0 ? Object.keys(song.stems) : 'None yet'
        });
        lastStatus = currentStatus;
      }
      
      if (song.processed && song.stems && Object.keys(song.stems).length > 0) {
        processed = true;
        console.log('\nStem processing completed!');
        console.log('Final song data:', {
          id: song._id,
          title: song.title,
          processed: song.processed,
          stemsStatus: song.stemsStatus,
          stemCount: Object.keys(song.stems).length
        });
        console.log('\nS3 stem URLs:');
        Object.entries(song.stems).forEach(([type, url]) => {
          console.log(`${type}: ${url}`);
        });
      } else if (song.stemsStatus === 'failed') {
        throw new Error('Stem processing failed');
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    if (!processed) {
      console.log('\nTimed out waiting for stem processing');
      console.log('This is normal if AudioShake processing is taking longer than expected');
      console.log('You can check the status later by running:');
      console.log(`curl -H "Cookie: connect.sid=${process.env.TEST_SESSION_COOKIE}" http://localhost:3000/api/song/${songId}`);
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

uploadSong();
