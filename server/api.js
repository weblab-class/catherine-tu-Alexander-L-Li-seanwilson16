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

// Import our stem processing modules
const { createStems, checkStemStatus } = require("./audioshake-stem-steps");
const { downloadStems } = require("./download-stem-steps");

const exec = require("child_process").exec;

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

// import socket manager
const socketManager = require("./server-socket");

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, "../uploads");
const stemsDir = path.join(__dirname, "../stems");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(stemsDir)) {
  fs.mkdirSync(stemsDir, { recursive: true });
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

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

    console.log("File uploaded:", {
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const song = new Song({
      creator_id: req.user._id,
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      processed: false,
      stemsStatus: "pending",
    });

    await song.save();
    console.log("Song saved to database:", song._id);

    // Create stems directory for this song using song ID
    const songStemsDir = path.join(stemsDir, song._id.toString());
    if (!fs.existsSync(songStemsDir)) {
      fs.mkdirSync(songStemsDir, { recursive: true });
    }

    // Start the stem separation process immediately
    console.log("Starting stem separation process...");
    let assetId, jobIds; // Declare these at a higher scope
    createStems(song.filePath, song._id)
      .then((result) => {
        console.log("Stems creation started:", result);
        assetId = result.assetId; // Store in outer scope
        jobIds = result.jobIds; // Store in outer scope
        song.audioshakeAssetId = assetId;
        song.audioshakeJobIds = jobIds;
        song.stemsStatus = "processing";
        return song.save();
      })
      .then(() => {
        // Start polling for completion
        const pollInterval = setInterval(async () => {
          try {
            console.log("Checking stem status...");
            const jobStatuses = await Promise.all(
              jobIds.map(async (jobId) => {
                try {
                  const response = await axios.get(`https://groovy.audioshake.ai/job/${jobId}`, {
                    headers: {
                      Authorization: `Bearer ${process.env.AUDIOSHAKE_API_KEY}`,
                    },
                  });
                  console.log(
                    `Full response for job ${jobId}:`,
                    JSON.stringify(response.data, null, 2)
                  );
                  return { jobId, status: response.data.job.status, data: response.data.job };
                } catch (error) {
                  console.error(`Error checking job ${jobId}:`, error);
                  return { jobId, status: "error", error };
                }
              })
            );

            // Track which stems have been downloaded
            if (!song.stems) {
              song.stems = {};
            }

            // Download completed stems that haven't been downloaded yet
            const stemTypes = ["vocals", "drums", "bass", "other"];
            let allCompleted = true;
            let anyNewDownloads = false;

            for (let i = 0; i < jobIds.length; i++) {
              const jobStatus = jobStatuses[i];
              const stemType = stemTypes[i];

              if (jobStatus.status === "completed" && !song.stems[stemType]) {
                console.log(`Downloading completed stem: ${stemType}`);
                console.log("Job status data:", JSON.stringify(jobStatus.data, null, 2));
                try {
                  // Create stems directory if it doesn't exist
                  if (!fs.existsSync(songStemsDir)) {
                    fs.mkdirSync(songStemsDir, { recursive: true });
                  }

                  // Get the stem URL based on stem type
                  let stemUrl;
                  console.log(
                    `\nChecking stem data for ${stemType}:`,
                    JSON.stringify(jobStatus.data, null, 2)
                  );

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
                    console.error(
                      `No URL found for ${stemType} stem in job response. Job data:`,
                      JSON.stringify(jobStatus.data, null, 2)
                    );
                    continue;
                  }

                  console.log(`Found stem URL for ${stemType}:`, stemUrl);

                  // Download the stem
                  const headers = {
                    Accept: "*/*", // Accept any content type
                  };

                  // Only add Authorization header if not an S3 URL
                  if (!stemUrl.includes("s3.amazonaws.com")) {
                    headers["Authorization"] = `Bearer ${process.env.AUDIOSHAKE_API_KEY}`;
                  }

                  const response = await axios({
                    method: "GET",
                    url: stemUrl,
                    responseType: "arraybuffer", // Changed to arraybuffer for binary data
                    headers,
                    maxRedirects: 5, // Allow redirects
                    validateStatus: null, // Don't throw on any status
                  });

                  if (response.status !== 200) {
                    console.error(`Error downloading ${stemType} stem: Status ${response.status}`);
                    if (response.data) {
                      console.error("Response:", response.data.toString());
                    }
                    continue;
                  }

                  // Create stems directory if it doesn't exist
                  if (!fs.existsSync(songStemsDir)) {
                    fs.mkdirSync(songStemsDir, { recursive: true });
                  }

                  // Write the buffer to file
                  try {
                    await fs.promises.writeFile(
                      path.join(songStemsDir, `${stemType}_stem.wav`),
                      response.data
                    );
                    console.log(`Successfully wrote ${stemType} stem to ${songStemsDir}`);

                    // Verify the file was written
                    const stats = await fs.promises.stat(
                      path.join(songStemsDir, `${stemType}_stem.wav`)
                    );
                    console.log(`File size: ${stats.size} bytes`);

                    // Update the stems object with the new stem
                    song.stems[stemType] = path.basename(`${stemType}_stem.wav`);
                    anyNewDownloads = true;
                    console.log(`Successfully downloaded ${stemType} stem to ${songStemsDir}`);
                  } catch (writeError) {
                    console.error(`Error writing file ${songStemsDir}:`, writeError);
                    continue;
                  }
                } catch (error) {
                  console.error(`Error downloading ${stemType} stem:`, error);
                }
              } else if (jobStatus.status !== "completed") {
                allCompleted = false;
              }
            }

            // Save progress if we downloaded any new stems
            if (anyNewDownloads) {
              song.stemsPath = songStemsDir;
              await song.save();
            }

            // If all jobs are complete, finish up
            if (allCompleted) {
              clearInterval(pollInterval);
              song.stemsStatus = "completed";
              song.processed = true;
              await song.save();
              console.log("All stems downloaded successfully");
            } else {
              console.log("Some stems still processing...");
            }
          } catch (error) {
            console.error("Error in stem processing:", error);
            clearInterval(pollInterval);
            song.stemsStatus = "failed";
            await song.save();
          }
        }, 10000); // Check every 10 seconds
      })
      .catch((error) => {
        console.error("Error starting stem process:", error);
        song.stemsStatus = "failed";
        song.save();
      });

    // Send response immediately with the song object
    res.status(200).json(song);
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

      // Initialize stems object if it doesn't exist
      if (!songObj.stems) {
        songObj.stems = {};
      }

      // Check for stem files in the stems directory
      const stemTypes = ["bass", "drums", "vocals", "other"];
      const stemDir = path.join(__dirname, "../stems", song._id.toString());

      if (fs.existsSync(stemDir)) {
        stemTypes.forEach((stemType) => {
          const displayType = stemType === "other" ? "melody" : stemType;
          const stemFile = `${stemType}_stem.wav`;
          const stemPath = path.join(stemDir, stemFile);

          if (fs.existsSync(stemPath)) {
            console.log(`Found stem file: ${stemPath}`);
            // Use relative URL for stems
            songObj.stems[displayType] = `/stems/${song._id.toString()}/${stemFile}`;
          } else {
            console.log(`No stem file found at: ${stemPath}`);
          }
        });
      } else {
        console.log(`No stem directory found at: ${stemDir}`);
      }

      console.log(`Stems for song ${song._id}:`, songObj.stems);
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
        exists: fs.existsSync(song.filePath),
        path: song.filePath,
        size: song.fileSize,
        type: song.fileType,
      },
    };

    // Check if stems directory exists
    const stemsDir = path.join(__dirname, "../stems", song._id.toString());
    debugInfo.stemsDirExists = fs.existsSync(stemsDir);
    debugInfo.stemsDir = stemsDir;

    if (debugInfo.stemsDirExists) {
      debugInfo.stemFiles = fs.readdirSync(stemsDir);
    }

    // If we have an AudioShake job ID, check its status
    if (song.audioshakeJobIds) {
      try {
        console.log("[Debug] Checking AudioShake status for job:", song.audioshakeJobIds[0]);
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

    const response = await axios(config);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    res.json(response.data);
  } catch (error) {
    console.log("AudioShake API Error:", error.response?.data || error.message);
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
      console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
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
      console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
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
      console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
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
      console.log("AudioShake Job Creation Error:", error.response?.data || error.message);
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
    console.log("AudioShake Job Status Error:", error.response?.data || error.message);
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
    console.log("AudioShake Download Error:", error.response?.data || error.message);
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
    console.log("AudioShake Stems Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error getting AudioShake stems",
      details: error.response?.data || error.message,
    });
  }
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
