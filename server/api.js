/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");
const router = express.Router();
const FormData = require('form-data');
const axios = require('axios');

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

// import authentication library
const auth = require("./auth");

// import socket manager
const socketManager = require("./server-socket");

// Configure multer for handling file uploads
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

    console.log("File upload request:", {
      file: req.file,
      body: req.body
    });

    const song = new Song({
      creator_id: req.user._id,
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    await song.save();
    res.json(song);
  } catch (err) {
    console.error("Error uploading song:", err);
    res.status(500).json({ error: "Error uploading song: " + err.message });
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

// audioshake create a new asset
router.post("/audioshake/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const formData = new FormData();
    
    // Read file as stream
    const fs = require('fs');
    const tempPath = `/tmp/${file.name}`;
    await file.mv(tempPath);
    
    formData.append('file', fs.createReadStream(tempPath));

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://groovy.audioshake.ai/upload/',
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA', 
        ...formData.getHeaders()
      },
      data: formData
    };

    const response = await axios(config);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    res.json(response.data);
  } catch (error) {
    console.log("AudioShake API Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Error uploading to AudioShake",
      details: error.response?.data || error.message 
    });
  }
});

// Create an AudioShake drums job
router.post("/audioshake/drums", async (req, res) => {
  const axios = require('axios');
let data = JSON.stringify({
  "stemMetadata": {
    "format": "wav",
    "stemName": "drums"
  },
  "callbackUrl": "https://example.com/webhook/drums",
  "assetId": "cm6g04enq02lp13y4dweqp7wm"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://groovy.audioshake.ai/job/',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
  },
  data : data
};

axios.request(config)
.then((response) => {
  res.json(response.data);
})
.catch((error) => {
  console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
  res.status(500).json({ 
    error: "Error creating AudioShake job",
    details: error.response?.data || error.message 
  });
});
});

// Create an AudioShake vocals job
router.post("/audioshake/vocals", async (req, res) => {
  const axios = require('axios');
let data = JSON.stringify({
  "stemMetadata": {
    "format": "wav",
    "stemName": "vocals"
  },
  "callbackUrl": "https://example.com/webhook/vocals",
  "assetId": "cm6g04enq02lp13y4dweqp7wm"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://groovy.audioshake.ai/job/',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
  },
  data : data
};

axios.request(config)
.then((response) => {
  res.json(response.data);
})
.catch((error) => {
  console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
  res.status(500).json({ 
    error: "Error creating AudioShake job",
    details: error.response?.data || error.message 
  });
});
});

// Create an AudioShake bass job
router.post("/audioshake/bass", async (req, res) => {
  const axios = require('axios');
let data = JSON.stringify({
  "stemMetadata": {
    "format": "wav",
    "stemName": "bass"
  },
  "callbackUrl": "https://example.com/webhook/bass",
  "assetId": "cm6g04enq02lp13y4dweqp7wm"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://groovy.audioshake.ai/job/',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
  },
  data : data
};

axios.request(config)
.then((response) => {
  res.json(response.data);
})
.catch((error) => {
  console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
  res.status(500).json({ 
    error: "Error creating AudioShake job",
    details: error.response?.data || error.message 
  });
});
});

// Create an AudioShake other job
router.post("/audioshake/other", async (req, res) => {
  const axios = require('axios');
let data = JSON.stringify({
  "stemMetadata": {
    "format": "wav",
    "stemName": "other"
  },
  "callbackUrl": "https://example.com/webhook/other",
  "assetId": "cm6g04enq02lp13y4dweqp7wm"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://groovy.audioshake.ai/job/',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
  },
  data : data
};

axios.request(config)
.then((response) => {
  res.json(response.data);
})
.catch((error) => {
  console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
  res.status(500).json({ 
    error: "Error creating AudioShake job",
    details: error.response?.data || error.message 
  });
});
});

// Get AudioShake job status
router.get("/audioshake/job/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const config = {
      method: 'get',
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      }
    };

    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.log("AudioShake Job Status Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Error getting AudioShake job status",
      details: error.response?.data || error.message 
    });
  }
});

// Download ONE PARTICULAR AudioShake stem
router.get("/audioshake/download/:stemId", async (req, res) => {
  try {
    const { stemId } = req.params;
    
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://groovy.audioshake.ai/download/${stemId}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      },
      responseType: 'arraybuffer' // Important for downloading binary files
    };

    const response = await axios(config);
    
    // Set the appropriate headers for file download
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename=${stemId}.wav`
    });
    
    // Send the file data
    res.send(response.data);
  } catch (error) {
    console.log("AudioShake Download Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Error downloading AudioShake stem",
      details: error.response?.data || error.message 
    });
  }
});

// Helper endpoint to get ALL stems for a job
router.get("/audioshake/stems/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const config = {
      method: 'get',
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: { 
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA'
      }
    };

    const response = await axios(config);
    
    // Extract just the stem assets information
    const stems = response.data.job.stemAssets.map(stem => ({
      id: stem.id,
      name: stem.name,
      type: stem.fileType,
      format: stem.format
    }));
    
    res.json({ stems });
  } catch (error) {
    console.log("AudioShake Stems Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Error getting AudioShake stems",
      details: error.response?.data || error.message 
    });
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
