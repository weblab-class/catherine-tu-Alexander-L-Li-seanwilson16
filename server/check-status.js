const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkJobStatus(jobId) {
  try {
    const response = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
      }
    });
    // console.log(`Job ${jobId} status:`, response.data.job.status);
    // console.log('Full response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(`Error checking job ${jobId}:`, error.message);
  }
}

// Get job IDs from database
const Song = require('./models/song');
const User = require('./models/user');

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_SRV);
    console.log('Connected to MongoDB');

    // Find most recent song
    const songs = await Song.find({ creator_id: { $exists: true } }).sort({ _id: -1 }).limit(5);
    // console.log('Recent songs:', songs.map(s => ({
    //   id: s._id,
    //   title: s.title,
    //   jobIds: s.audioshakeJobIds,
    //   status: s.stemsStatus
    // })));

    if (songs.length === 0) {
      console.error('No songs found');
      return;
    }

    // Check status for most recent song
    const song = songs[0];
    if (!song.audioshakeJobIds) {
      console.error('No job IDs for most recent song');
      return;
    }

    // console.log('\nChecking status for most recent song:', song._id);
    for (const jobId of song.audioshakeJobIds) {
      await checkJobStatus(jobId);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
