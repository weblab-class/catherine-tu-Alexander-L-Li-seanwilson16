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
const axios = require("axios");
const { s3, BUCKET_NAME } = require("./aws-config");

// Import our stem processing modules
const { createStems, checkStemStatus } = require("./audioshake-stem-steps");
const { downloadStems } = require("./download-stem-steps");

const exec = require("child_process").exec;

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

// import socket manager
const socketManager = require("./server-socket");

const router = express.Router();

// Configure multer for handling file uploads
const storage = multer.memoryStorage(); // Use memory storage instead of disk

const upload = multer({
  storage: storage,
  fileFilter(req, file, cb) {
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

// Serve stems from S3 - this must be before auth middleware
router.get("/stems/:songId/:stem", async (req, res) => {
  try {
    // Check auth manually since we need to handle it differently for audio files
    if (!req.session || !req.session.user) {
      res.status(401).json({ error: "not logged in" });
      return;
    }

    console.log("Requesting stem:", req.params.songId, req.params.stem);
    
    const song = await Song.findOne({ _id: req.params.songId });
    if (!song) {
      console.log("Song not found:", req.params.songId);
      return res.status(404).json({ error: "Song not found" });
    }
    console.log("Found song:", song._id, "with stems:", song.stems);

    // Get the stem from S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: `stems/${req.params.songId}/${req.params.stem}`,
    };
    console.log("S3 params:", params);

    try {
      // First check if the object exists
      try {
        await s3.headObject(params).promise();
        console.log("Stem exists in S3");
      } catch (error) {
        console.error("Stem does not exist in S3:", error.message);
        return res.status(404).json({ error: "Stem file not found" });
      }

      // Set headers before sending any data
      res.set({
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges',
        'Cache-Control': 'no-cache'
      });

      // Get the file from S3
      const s3Response = await s3.getObject(params).promise();
      console.log("Got file from S3, size:", s3Response.Body.length);

      // Send the file
      res.send(s3Response.Body);
    } catch (error) {
      console.error("Error getting stem:", error);
      res.status(500).json({ error: "Could not access stem file" });
    }
  } catch (error) {
    console.error("Error serving stem:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// All routes after this point require authentication
router.use(auth.ensureLoggedIn);

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

    // Generate unique filename
    const timestamp = new Date().getTime();
    const filename = `${timestamp}-${req.file.originalname}`;
    const s3Key = `uploads/${req.user._id}/${filename}`;

    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3Response = await s3.upload(uploadParams).promise();

    // Create song document
    const song = new Song({
      creator_id: req.user._id,
      title: req.body.title || req.file.originalname,
      filename: filename,
      filePath: s3Response.Location, // Store S3 URL instead of local path
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date(),
      processed: false,
      stemsStatus: "pending",
      stems: {},
    });

    await song.save();

    // Send initial response immediately
    res.status(200).json(song);

    // Start stem processing in background
    try {
      console.log("Starting stem creation for song:", song._id);
      const result = await createStems(s3Response.Location, song._id);
      const { assetId, jobIds } = result;
      
      // Update song with AudioShake IDs
      song.audioshakeAssetId = assetId;
      song.audioshakeJobIds = jobIds;
      song.stemsStatus = "processing";
      await song.save();

      // Start polling for completion
      const stemTypes = ["vocals", "drums", "bass", "other"];
      const pollInterval = setInterval(async () => {
        try {
          console.log(`Checking stem status for song ${song._id}...`);
          const jobStatuses = await Promise.all(
            jobIds.map(async (jobId) => {
              try {
                const response = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
                  headers: {
                    Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
                  },
                });
                return { jobId, status: response.data.job.status, data: response.data.job };
              } catch (error) {
                console.error(`Error checking job ${jobId}:`, error);
                return { jobId, status: "error", error };
              }
            })
          );

          // Download completed stems that haven't been downloaded yet
          let allCompleted = true;
          let anyNewDownloads = false;

          for (let i = 0; i < jobIds.length; i++) {
            const jobStatus = jobStatuses[i];
            const stemType = stemTypes[i];

            console.log(`Status for ${stemType}:`, jobStatus.status);

            if (jobStatus.status === "completed" && !song.stems[stemType]) {
              try {
                // Get the stem URL based on stem type
                let stemUrl;
                
                if (stemType === "other") {
                  // For 'other' stem, look in stemAssets array
                  const otherStem = jobStatus.data.stemAssets?.find(
                    (asset) => asset.name === "other.wav"
                  );
                  stemUrl = otherStem?.link;
                } else {
                  // For other stems, look in stemAssets array with their respective names
                  const stem = jobStatus.data.stemAssets?.find(
                    (asset) => asset.name === `${stemType}.wav`
                  );
                  if (stem) {
                    stemUrl = stem.link;
                  } else {
                    // Fallback to output.url if stemAssets not found
                    stemUrl = jobStatus.data.output?.url;
                  }
                }

                if (!stemUrl) {
                  throw new Error(`No URL found for ${stemType} stem`);
                }

                // Upload stem to S3
                const stemResponse = await axios.get(stemUrl, { responseType: 'arraybuffer' });
                const stemS3Key = `stems/${song._id}/${stemType}.wav`;
                const stemUploadParams = {
                  Bucket: BUCKET_NAME,
                  Key: stemS3Key,
                  Body: stemResponse.data,
                  ContentType: 'audio/wav'
                };

                const stemS3Response = await s3.upload(stemUploadParams).promise();
                
                // Update song with stem URL
                song.stems[stemType] = stemS3Response.Location;
                anyNewDownloads = true;

                console.log(`Successfully processed ${stemType} stem for song ${song._id}`);
              } catch (error) {
                console.error(`Error processing ${stemType} stem:`, error);
                song.stems[stemType] = null; // Mark as failed
              }
            } else if (jobStatus.status !== "completed") {
              allCompleted = false;
            }
          }

          // Save any stem updates
          if (anyNewDownloads) {
            await song.save();
          }

          // If all jobs are complete, finish up
          if (allCompleted) {
            clearInterval(pollInterval);
            song.stemsStatus = "completed";
            song.processed = true;
            await song.save();
            console.log(`All stems completed for song ${song._id}`);
          }
        } catch (error) {
          console.error("Error in stem processing:", error);
          clearInterval(pollInterval);
          song.stemsStatus = "failed";
          await song.save();
        }
      }, 5000); // Check every 5 seconds
    } catch (error) {
      console.error("Error starting stem process:", error);
      song.stemsStatus = "failed";
      await song.save();
    }
  } catch (error) {
    console.error("Error uploading song:", error);
    res.status(500).json({ error: "Failed to upload song", details: error.message });
  }
});

router.get("/songs", auth.ensureLoggedIn, (req, res) => {
  Song.find({ creator_id: req.user._id }).then((songs) => {
    // Transform songs to include full paths for stems
    const songsWithStems = songs.map((song) => {
      const songObj = song.toObject();
      songObj.id = song._id.toString(); // Add id field

      // Return the song object with its S3 stems
      if (songObj.stems && Object.keys(songObj.stems).length > 0) {
        // Stems are already in S3 format, just map 'other' to 'melody' for display
        const displayStems = {};
        Object.entries(songObj.stems).forEach(([type, url]) => {
          const displayType = type === "other" ? "melody" : type;
          displayStems[displayType] = url;
        });
        songObj.stems = displayStems;
      } else {
        songObj.stems = {};
      }

      return songObj;
    });
    res.send(songsWithStems);
  });
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

    if (!song.audioshakeJobIds) {
      return res.json({ status: "not_started" });
    }

    const statusResponse = await fetch(
      `https://api.audioshake.ai/v1/status/${song.audioshakeJobIds[0]}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error("Failed to check stem separation status");
    }

    const status = await statusResponse.json();

    // If complete, update song with stem URLs
    if (status.status === "complete") {
      song.stems = {
        vocals: status.stems.vocals,
        drums: status.stems.drums,
        bass: status.stems.bass,
        other: status.stems.other,
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
    if (!song.audioshakeJobIds) {
      return res.status(400).json({ error: "Song has not been processed for stems" });
    }

    // Make request to AudioShake API to download stems
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://groovy.audioshake.ai/download/${song.audioshakeJobIds[0]}`,
      headers: {
        Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
      },
      responseType: "stream", // Important: we want to stream the response
    };

    const response = await axios.request(config);

    // Set appropriate headers for file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${song.title}_stems.zip`);

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
      audioshakeJobIds: song.audioshakeJobIds,
      stems: song.stems,
      uploadDate: song.uploadDate,
      audioshakeKeyConfigured: !!process.env.AUDIOSHAKE_API_KEY,
      originalFile: {
        exists: false, // File is stored in S3, not locally
        path: song.filePath,
        size: song.fileSize,
        type: song.fileType,
      },
    };

    // If we have an AudioShake job ID, check its status
    if (song.audioshakeJobIds) {
      try {
        // console.log("[Debug] Checking AudioShake status for job:", song.audioshakeJobIds[0]);
        const statusResponse = await fetch(
          `https://groovy.audioshake.ai/v1/status/${song.audioshakeJobIds[0]}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
            },
          }
        );

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
      debugInfo.audioShakeError =
        "No AudioShake job ID found - stem separation may not have started";
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

    // Delete the file from S3
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: song.filePath,
    };
    await s3.deleteObject(s3Params).promise();

    await Song.deleteOne({ _id: req.params.id });
    res.json({ message: "Song deleted successfully" });
  } catch (err) {
    console.error("Error deleting song:", err);
    res.status(500).json({ error: "Error deleting song" });
  }
});

router.post("/songs/:songId/delete", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) {
      return res.status(404).send({ error: "Song not found" });
    }

    // Check if this song belongs to the user
    if (song.creator_id.toString() !== req.user._id.toString()) {
      return res.status(403).send({ error: "Not authorized to delete this song" });
    }

    // Delete the original audio file if it exists
    if (song.audioPath) {
      const filePath = path.join(__dirname, song.audioPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete any stem files if they exist
    if (song.stems) {
      for (const stem of Object.values(song.stems)) {
        if (stem && stem.path) {
          const stemPath = path.join(__dirname, stem.path);
          if (fs.existsSync(stemPath)) {
            fs.unlinkSync(stemPath);
          }
        }
      }
    }

    // Delete the song from database
    await Song.findByIdAndDelete(song._id);
    res.send({ message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).send({ error: "Could not delete song" });
  }
});

// delete endpoint in api.js
// Add this route to handle song deletion
router.post("/songs/:id/delete", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOneAndDelete({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    res.status(200).json({ message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ error: "Failed to delete song" });
  }
});

// Get song processing status
router.get("/songs/:songId/status", auth.ensureLoggedIn, async (req, res) => {
  try {
    console.log("Checking status for song:", req.params.songId);
    const song = await Song.findById(req.params.songId);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    // If the song is still processing, check the actual job statuses
    if (song.stemsStatus === "processing" && song.audioshakeJobIds?.length > 0) {
      const stemTypes = ["vocals", "drums", "bass", "other"];
      const jobStatuses = await Promise.all(
        song.audioshakeJobIds.map(async (jobId) => {
          try {
            const response = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
              headers: {
                Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
              },
            });
            return response.data.job.status;
          } catch (error) {
            console.error(`Error checking job ${jobId}:`, error);
            return "error";
          }
        })
      );

      // Calculate progress based on completed stems
      const completedStems = jobStatuses.filter(status => status === "completed").length;
      const progress = (completedStems / stemTypes.length) * 100;

      return res.json({
        songId: song._id,
        status: song.stemsStatus,
        progress,
        stems: song.stems || {},
        stemStatuses: stemTypes.map((type, i) => ({
          type,
          status: jobStatuses[i]
        }))
      });
    }

    // For completed or failed songs, just return the status
    return res.json({
      songId: song._id,
      status: song.stemsStatus,
      progress: song.stemsStatus === "completed" ? 100 : 0,
      stems: song.stems || {}
    });
  } catch (error) {
    console.error("Error checking song status:", error);
    res.status(500).json({ error: "Failed to check song status" });
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
    const fs = require("fs");
    const tempPath = `/tmp/${file.name}`;
    await file.mv(tempPath);

    formData.append("file", fs.createReadStream(tempPath));

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://groovy.audioshake.ai/upload/",
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
        ...formData.getHeaders(),
      },
      data: formData,
    };

    const response = await axios.request(config);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    res.json(response.data);
  } catch (error) {
    // console.log("AudioShake API Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error uploading to AudioShake",
      details: error.response?.data || error.message,
    });
  }
});

// Create an AudioShake drums job
router.post("/audioshake/drums", async (req, res) => {
  const axios = require("axios");
  let data = JSON.stringify({
    stemMetadata: {
      format: "wav",
      stemName: "drums",
    },
    callbackUrl: "https://example.com/webhook/drums",
    assetId: "cm6g04enq02lp13y4dweqp7wm",
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://groovy.audioshake.ai/job/",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      // console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

// Create an AudioShake vocals job
router.post("/audioshake/vocals", async (req, res) => {
  const axios = require("axios");
  let data = JSON.stringify({
    stemMetadata: {
      format: "wav",
      stemName: "vocals",
    },
    callbackUrl: "https://example.com/webhook/vocals",
    assetId: "cm6g04enq02lp13y4dweqp7wm",
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://groovy.audioshake.ai/job/",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      // console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

// Create an AudioShake bass job
router.post("/audioshake/bass", async (req, res) => {
  const axios = require("axios");
  let data = JSON.stringify({
    stemMetadata: {
      format: "wav",
      stemName: "bass",
    },
    callbackUrl: "https://example.com/webhook/bass",
    assetId: "cm6g04enq02lp13y4dweqp7wm",
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://groovy.audioshake.ai/job/",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      // console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

// Create an AudioShake other job
router.post("/audioshake/other", async (req, res) => {
  const axios = require("axios");
  let data = JSON.stringify({
    stemMetadata: {
      format: "wav",
      stemName: "other",
    },
    callbackUrl: "https://example.com/webhook/other",
    assetId: "cm6g04enq02lp13y4dweqp7wm",
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://groovy.audioshake.ai/job/",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      // console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
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
      method: "get",
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
      },
    };

    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    // console.log("AudioShake Job Status Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error getting AudioShake job status",
      details: error.response?.data || error.message,
    });
  }
});

// Download ONE PARTICULAR AudioShake stem
router.get("/audioshake/download/:stemId", async (req, res) => {
  try {
    const { stemId } = req.params;

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://groovy.audioshake.ai/download/${stemId}`,
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
      },
      responseType: "arraybuffer", // Important for downloading binary files
    };

    const response = await axios(config);

    // Set the appropriate headers for file download
    res.set({
      "Content-Type": "audio/wav",
      "Content-Disposition": `attachment; filename=${stemId}.wav`,
    });

    // Send the file data
    res.send(response.data);
  } catch (error) {
    // console.log("AudioShake Download Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error downloading AudioShake stem",
      details: error.response?.data || error.message,
    });
  }
});

// Helper endpoint to get ALL stems for a job
router.get("/audioshake/stems/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    const config = {
      method: "get",
      url: `https://groovy.audioshake.ai/job/${jobId}`,
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImNtNXpubHdtaDBrOTl2MzJ6ZW50djZ0eTMiLCJsaWNlbnNlSWQiOiJjbTV6bm04MWIwcG5vMGpwb2FrbzU2bWU0IiwiaWF0IjoxNzM3MDUxNTA1LCJleHAiOjE4OTQ3MzE1MDV9.50K8Vj9RElGjbQXjh3HqdR4_7r8G-I2pvE2yhjPOSeA",
      },
    };

    const response = await axios(config);

    // Extract just the stem assets information
    const stems = response.data.job.stemAssets.map((stem) => ({
      id: stem.id,
      name: stem.name,
      type: stem.fileType,
      format: stem.format,
    }));

    res.json({ stems });
  } catch (error) {
    // console.log("AudioShake Stems Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error getting AudioShake stems",
      details: error.response?.data || error.message,
    });
  }
});

// rename a song!
router.post("/songs/rename", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findById(req.body.songId);
    
    if (!song) {
      return res.status(404).send({ error: "Song not found" });
    }

    if (song.creator_id !== req.user._id) {
      return res.status(403).send({ error: "Not authorized to rename this song" });
    }

    song.title = req.body.newTitle;
    await song.save();

    res.send({ success: true });
  } catch (err) {
    console.error("Error in /api/songs/rename:", err);
    res.status(500).send({ error: "Error renaming song" });
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
