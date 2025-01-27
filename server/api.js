/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");
const axios = require("axios");

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

const auth = require("./auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { AudioShakeAPI, AUDIOSHAKE_TOKEN } = require("./audioshake");
const audioshake = new AudioShakeAPI();

// import socket manager
const socketManager = require("./server-socket");

// Configure multer for handling file uploads

const uploadsDir = path.join(__dirname, "../uploads");
const stemsDir = path.join(uploadsDir, "stems");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(stemsDir)) {
  fs.mkdirSync(stemsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = uploadsDir;
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/wav"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3 and WAV files are allowed."));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
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
  console.log("Starting song upload process");
  try {
    if (!req.file) {
      console.error("No file received in upload request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });

    // Create new song document
    const song = new Song({
      creator_id: req.user._id,
      creator_name: req.user.name,
      title: req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date(),
      stems: {
        processed: false,
        status: "uploading"
      }
    });

    await song.save();
    console.log("Saved initial song document to MongoDB");

    // Send initial response to client
    res.status(201).json(song);

    // Start stem separation in the background
    console.log("Starting stem separation process");
    try {
      await splitStems(song);
      console.log("Stem separation completed successfully");
    } catch (error) {
      console.error("Stem separation failed:", {
        error: error.message,
        stack: error.stack,
        songId: song._id
      });
      song.stems = {
        processed: false,
        status: "failed",
        error: error.message
      };
      await song.save();
    }
  } catch (error) {
    console.error("Error in upload process:", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Error uploading file" });
  }
});

router.get("/songs", auth.ensureLoggedIn, async (req, res) => {
  try {
    console.log("Fetching songs for user:", req.user._id);
    console.log("Querying database for songs...");
    const songs = await Song.find({ creator_id: req.user._id }).sort({ uploadDate: -1 });
    console.log("Found songs:", songs);
    console.log("Sending response with songs...");
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

// Get user's songs
router.get("/songs", auth.ensureLoggedIn, async (req, res) => {
  try {
    console.log("Getting songs for user:", req.user._id);
    const songs = await Song.find({ creator_id: req.user._id });
    console.log("Found songs:", songs);
    res.json(songs);
  } catch (error) {
    console.error("Error getting songs:", error);
    res.status(500).json({ error: "Error getting songs" });
  }
});

// Audio upload endpoint
router.post("/upload", auth.ensureLoggedIn, upload.single("audio"), async (req, res) => {
  console.log("Starting file upload process");
  try {
    if (!req.file) {
      console.error("No file received in upload request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });

    // Create new song document
    const song = new Song({
      creator_id: req.user._id,
      creator_name: req.user.name,
      title: req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date(), // Explicitly set the upload date
      stems: {
        processed: false
      }
    });

    console.log("Created new song document:", {
      id: song._id,
      name: song.title,
      creator: song.creator_name
    });

    await song.save();
    console.log("Saved song document to MongoDB");

    // Start stem separation synchronously for debugging
    console.log("Starting stem separation process");
    try {
      await splitStems(song);
      console.log("Stem separation completed successfully");
    } catch (error) {
      console.error("Stem separation failed:", {
        error: error.message,
        stack: error.stack,
        songId: song._id
      });
      // Continue with the response even if stem separation fails
    }

    // Send response
    console.log("Sending response to client with song:", song);
    res.status(201).json(song); // Just send the song object directly
  } catch (error) {
    console.error("Error in upload process:", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Error uploading file" });
  }
});

// Helper function to handle stem separation
async function splitStems(song) {
  console.log("Starting stem separation for song:", {
    id: song._id,
    title: song.title,
    filePath: song.filePath,
    fileExists: fs.existsSync(song.filePath)
  });

  try {
    // Update song status to uploading
    song.stems = { ...song.stems, status: "uploading" };
    await song.save();

    // Check if file exists
    if (!fs.existsSync(song.filePath)) {
      throw new Error(`File not found at path: ${song.filePath}`);
    }

    // Upload the file to AudioShake
    console.log("Uploading file to AudioShake:", song.filePath);
    const uploadResponse = await audioshake.uploadFile(song.filePath);
    console.log("File uploaded successfully. Upload ID:", uploadResponse.upload_id);

    // Update song status to processing
    song.stems = { ...song.stems, status: "processing" };
    await song.save();

    // Start the stem separation
    console.log("Starting stem separation");
    const separationResponse = await audioshake.startStemSeparation(uploadResponse.upload_id);
    console.log("Separation job started. Job ID:", separationResponse.job_id);

    // Poll for completion
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let statusResponse;
    
    while (!isComplete && attempts < maxAttempts) {
      console.log(`Checking separation status (attempt ${attempts + 1}/${maxAttempts})`);
      statusResponse = await audioshake.checkSeparationStatus(separationResponse.job_id);
      console.log("Status response:", statusResponse);
      
      if (statusResponse.status === "complete") {
        isComplete = true;
        console.log("Stem separation completed successfully");
      } else if (statusResponse.status === "failed") {
        throw new Error("Stem separation failed: " + statusResponse.error);
      } else {
        console.log("Separation in progress:", statusResponse.status);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before next check
      }
    }

    if (!isComplete) {
      throw new Error("Stem separation timed out after 5 minutes");
    }

    // Create stems directory if it doesn't exist
    const stemsDir = path.join(__dirname, "..", "stems");
    const songStemsDir = path.join(stemsDir, song._id.toString());
    if (!fs.existsSync(songStemsDir)) {
      fs.mkdirSync(songStemsDir, { recursive: true });
    }

    // Download and save each stem
    const stemTypes = ["vocals", "drums", "bass", "other"];
    const stemPaths = {};

    for (const stemType of stemTypes) {
      console.log(`Downloading ${stemType} stem`);
      const stemData = await audioshake.downloadStem(separationResponse.job_id, stemType);
      const stemPath = path.join(songStemsDir, `${stemType}.mp3`);
      
      await fs.promises.writeFile(stemPath, stemData);
      console.log(`Saved ${stemType} stem to:`, stemPath);
      
      // Store relative path in DB
      stemPaths[stemType] = `/api/stems/${song._id}/${stemType}`;
    }

    // Update the song with stem paths and mark as processed
    song.stems = {
      ...stemPaths,
      processed: true,
      status: "completed"
    };
    
    await song.save();
    console.log("Updated song document with stem paths");
    
  } catch (error) {
    console.error("Error in stem separation process:", error);
    // Update song to indicate processing failed
    song.stems = {
      processed: false,
      status: "failed",
      error: error.message
    };
    await song.save();
    throw error;
  }
}

// Get stems for a song
router.get("/stems/:songId", auth.ensureLoggedIn, async (req, res) => {
  console.log("Fetching stems for song:", req.params.songId);
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) {
      console.log("Song not found:", req.params.songId);
      return res.status(404).json({ error: "Song not found" });
    }

    if (!song.stems.processed) {
      console.log("Stems not yet processed for song:", req.params.songId);
      return res.status(202).json({ message: "Stems are still being processed" });
    }

    console.log("Returning stems for song:", req.params.songId);
    res.json(song.stems);
  } catch (error) {
    console.error("Error fetching stems:", error);
    res.status(500).json({ error: "Error fetching stems" });
  }
});

// Test AudioShake API
router.get("/test-audioshake", async (req, res) => {
  try {
    console.log("Testing AudioShake API connection");
    const response = await axios.get("https://groovy.audioshake.ai/health", {
      headers: {
        Authorization: `Bearer ${AUDIOSHAKE_TOKEN}`
      }
    });
    console.log("AudioShake API response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("AudioShake API test error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({
      error: "Error testing AudioShake API",
      details: error.response?.data || error.message
    });
  }
});

// Debug route to check song status
router.get("/debug/song/:songId", async (req, res) => {
  console.log("Checking song status for ID:", req.params.songId);
  try {
    const song = await Song.findById(req.params.songId);
    console.log("Found song:", song);
    
    if (!song) {
      console.log("No song found with ID:", req.params.songId);
      return res.status(404).json({ error: "Song not found" });
    }
    
    const response = {
      id: song._id,
      name: song.name,
      filePath: song.filePath,
      stems: song.stems,
      createdAt: song.createdAt
    };
    console.log("Sending response:", response);
    res.json(response);
  } catch (error) {
    console.error("Error checking song status:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Error checking song status" });
  }
});

// Serve uploaded files
router.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  res.sendFile(filePath);
});

// Serve stem files
router.get("/stems/file/:songId/:stemType", (req, res) => {
  const { songId, stemType } = req.params;
  const stemPath = path.join(stemsDir, songId, `${stemType}.mp3`);
  res.sendFile(stemPath);
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
