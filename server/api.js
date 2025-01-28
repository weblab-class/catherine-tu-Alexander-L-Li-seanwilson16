/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");
const auth = require("./auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const fetch = require("node-fetch");
const axios = require("axios");

const exec = require('child_process').exec;

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

// import socket manager
const socketManager = require("./server-socket");

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
    console.log("Upload path:", uploadPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      console.log("Creating upload directory");
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log("Generated filename:", filename);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3 and WAV files are allowed."));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/whoami", (req, res) => {
  if (!req.user) {
    // not logged in
    return res.send({});
  }

  res.send(req.user);
});

router.post("/initsocket", (req, res) => {
  try {
    // do nothing if user not logged in
    if (req.user && req.body.socketid) {
      const socket = socketManager.getSocketFromSocketID(req.body.socketid);
      if (socket) {
        socketManager.addUser(req.user, socket);
        res.send({});
      } else {
        res.status(400).send({ error: "Socket not found" });
      }
    } else {
      res.send({}); // Still return 200 if user not logged in
    }
  } catch (error) {
    console.error("Socket initialization error:", error);
    res.status(500).send({ error: "Failed to initialize socket" });
  }
});

// |------------------------------|
// | write your API methods below!|
// |------------------------------|

router.get("/user", (req, res) => {
  User.findById(req.query.userid)
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      res.status(500).send("User Not");
    });
});

// change the theme
router.post("/theme", (req, res) => {
  const { theme } = req.body;

  User.findByIdAndUpdate(req.user._id, { theme: theme }, { new: true })
    .then((updatedUser) => res.send(updatedUser))
    .catch((err) => res.status(500).send("failed to update theme."));
});

// change profile pic
router.post("/avatar", auth.ensureLoggedIn, (req, res) => {
  if (!req.user._id) {
    return res.status(400).send({ error: "Not logged in" });
  }

  User.findById(req.user._id)
    .then((user) => {
      if (!user) {
        throw new Error("User not found");
      }
      user.avatar = req.body.avatar;
      return user.save();
    })
    .then((updatedUser) => {
      res.send(updatedUser);
    })
    .catch((err) => {
      console.error("Failed to update avatar:", err);
      res.status(500).send({ error: "Failed to update avatar" });
    });
});

// update whoami to include avatar
router.get("/whoami", (req, res) => {
  if (!req.user) {
    return res.send({});
  }
  res.send(req.user);
});

// song-related API endpoints
router.post("/song", auth.ensureLoggedIn, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const song = new Song({
      creator_id: req.user._id,
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      processed: false
    });

    await song.save();

    // Create stems directory
    const stemsDir = path.join(__dirname, "../uploads/stems", song._id.toString());
    if (!fs.existsSync(stemsDir)) {
      fs.mkdirSync(stemsDir, { recursive: true });
    }

    try {
      // Make request to AudioShake API
      const response = await axios.post('https://groovy.audioshake.ai/v1/split', {
        audio_url: `http://localhost:5174/uploads/${req.file.filename}`,
        stems: ['vocals', 'drums', 'bass', 'other']
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
        }
      });

      song.audioShakeJobId = response.data.job_id;
      await song.save();

      // Start polling for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`https://groovy.audioshake.ai/v1/status/${response.data.job_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
            }
          });

          if (statusResponse.data.status === 'complete') {
            clearInterval(pollInterval);
            
            // Download each stem
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            for (const stemType of stemTypes) {
              const stemUrl = statusResponse.data.stems[stemType];
              const stemPath = path.join(stemsDir, `${stemType}.mp3`);
              console.log(`Downloading ${stemType} to ${stemPath}`);
              
              const response = await axios({
                method: 'GET',
                url: stemUrl,
                responseType: 'stream',
                headers: {
                  'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
                }
              });
          
              await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(stemPath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
              });
          
              if (!song.stems) {
                song.stems = {};
              }
              song.stems[stemType] = stemPath;
              console.log(`Downloaded ${stemType}`);
            }
          
            song.processed = true;
            await song.save();
            console.log("All stems downloaded and saved");
          }
        } catch (error) {
          console.error("Error checking stem status:", error);
          clearInterval(pollInterval);
        }
      }, 5000);

    } catch (error) {
      console.error("Error starting stem separation:", error);
    }

    res.status(200).json(song);
  } catch (error) {
    console.error("Error uploading song:", error);
    res.status(500).json({ error: "Failed to upload song" });
  }
});

router.get("/songs", auth.ensureLoggedIn, async (req, res) => {
  try {
    const songs = await Song.find({ creator_id: req.user._id }).sort({ uploadDate: -1 });
    res.json(songs);
  } catch (err) {
    console.error("Error fetching songs:", err);
    res.status(500).json({ error: "Error fetching songs" });
  }
});

router.get("/song/:id", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    res.json(song);
  } catch (err) {
    console.error("Error fetching song:", err);
    res.status(500).json({ error: "Error fetching song" });
  }
});

router.get("/song/:id/stems/status", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (!song.audioShakeJobId) {
      return res.json({ status: 'not_started' });
    }

    const statusResponse = await fetch(`https://api.audioshake.ai/v1/status/${song.audioShakeJobId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
      }
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to check stem separation status');
    }

    const status = await statusResponse.json();

    // If complete, update song with stem URLs
    if (status.status === 'complete') {
      song.stems = {
        vocals: status.stems.vocals,
        drums: status.stems.drums,
        bass: status.stems.bass,
        other: status.stems.other
      };
      song.processed = true;
      await song.save();
    }

    res.json(status);
  } catch (err) {
    console.error("Error checking stem status:", err);
    res.status(500).json({ error: "Error checking stem status" });
  }
});

// download the stems
router.get("/song/:id/stems/download", auth.ensureLoggedIn, async (req, res) => {
  try {
    // Find the song and verify ownership
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Verify that the song has an AudioShake job ID
    if (!song.audioShakeJobId) {
      return res.status(400).json({ error: "Song has not been processed for stems" });
    }

    // Make request to AudioShake API to download stems
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://groovy.audioshake.ai/download/${song.audioShakeJobId}`,
      headers: { 
        'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`
      },
      responseType: 'stream' // Important: we want to stream the response
    };

    const response = await axios.request(config);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${song.title}_stems.zip`);

    // Pipe the response stream directly to the client
    response.data.pipe(res);
  } catch (error) {
    console.error("Error downloading stems:", error);
    res.status(500).json({ error: "Failed to download stems" });
  }
});

router.get("/song/:id/debug", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    const debugInfo = {
      songId: song._id,
      title: song.title,
      processed: song.processed,
      audioShakeJobId: song.audioShakeJobId,
      stems: song.stems,
      uploadDate: song.uploadDate,
      audioshakeKeyConfigured: !!process.env.AUDIOSHAKE_API_KEY,
      originalFile: {
        exists: fs.existsSync(song.filePath),
        path: song.filePath,
        size: song.fileSize,
        type: song.fileType
      }
    };

    // Check if stems directory exists
    const stemsDir = path.join(__dirname, "../uploads/stems", song._id.toString());
    debugInfo.stemsDirExists = fs.existsSync(stemsDir);
    debugInfo.stemsDir = stemsDir;
    
    if (debugInfo.stemsDirExists) {
      debugInfo.stemFiles = fs.readdirSync(stemsDir);
    }

    // If we have an AudioShake job ID, check its status
    if (song.audioShakeJobId) {
      try {
        console.log("[Debug] Checking AudioShake status for job:", song.audioShakeJobId);
        const statusResponse = await fetch(`https://groovy.audioshake.ai/v1/status/${song.audioShakeJobId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
          }
        });
        
        if (statusResponse.ok) {
          debugInfo.audioShakeStatus = await statusResponse.json();
        } else {
          const errorText = await statusResponse.text();
          console.error("[Debug] AudioShake API error:", errorText);
          debugInfo.audioShakeError = errorText;
        }
      } catch (error) {
        console.error("[Debug] Error checking AudioShake status:", error);
        debugInfo.audioShakeError = error.message;
      }
    } else {
      debugInfo.audioShakeError = "No AudioShake job ID found - stem separation may not have started";
    }

    res.json(debugInfo);
  } catch (error) {
    console.error("[Debug] Error in debug endpoint:", error);
    res.status(500).json({ error: "Error fetching debug info" });
  }
});

router.delete("/song/:id", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    // Delete the file from storage
    if (fs.existsSync(song.filePath)) {
      fs.unlinkSync(song.filePath);
    }

    await Song.deleteOne({ _id: req.params.id });
    res.json({ message: "Song deleted successfully" });
  } catch (err) {
    console.error("Error deleting song:", err);
    res.status(500).json({ error: "Error deleting song" });
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
