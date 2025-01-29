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
const { UPLOADS_DIR, STEMS_DIR } = require("./config");

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

// Ensure upload directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(STEMS_DIR)) {
  fs.mkdirSync(STEMS_DIR, { recursive: true });
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
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

    const song = new Song({
      creator_id: req.user._id,
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadDate: new Date(),
      processed: false,
      stemsStatus: "pending",
      stems: {},
    });

    await song.save();

    // Create stems directory for this song using song ID
    const songStemsDir = path.join(STEMS_DIR, song._id.toString());
    if (!fs.existsSync(songStemsDir)) {
      fs.mkdirSync(songStemsDir, { recursive: true });
    }

    // Start the stem separation process immediately
    let assetId, jobIds;
    createStems(song.filePath, song._id)
      .then((result) => {
        assetId = result.assetId;
        jobIds = result.jobIds;
        song.audioshakeAssetId = assetId;
        song.audioshakeJobIds = jobIds;
        song.stemsStatus = "processing";
        song.stems = {}; // Initialize empty stems object
        return song.save();
      })
      .then(() => {
        // Start polling for completion
        const pollInterval = setInterval(async () => {
          try {
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

            let allCompleted = true;
            let anyNewDownloads = false;

            for (let i = 0; i < jobIds.length; i++) {
              const jobStatus = jobStatuses[i];
              const stemType = ["vocals", "drums", "bass", "other"][i];

              console.log(`Status for ${stemType}:`, jobStatus.status);

              if (jobStatus.status === "completed" && !song.stems[stemType]) {
                try {
                  let stemUrl;
                  if (stemType === "other") {
                    const otherStem = jobStatus.data.stemAssets?.find(
                      (asset) => asset.name === "other.wav"
                    );
                    stemUrl = otherStem?.link;
                  } else {
                    const stem = jobStatus.data.stemAssets?.find(
                      (asset) => asset.name === `${stemType}.wav`
                    );
                    if (stem) {
                      stemUrl = stem.link;
                    } else {
                      stemUrl = jobStatus.data.output?.url;
                    }
                  }

                  if (!stemUrl) {
                    throw new Error(`No URL found for ${stemType} stem`);
                  }

                  const stemResponse = await axios.get(stemUrl, { responseType: 'arraybuffer' });
                  const stemPath = path.join(songStemsDir, `${stemType}.wav`);
                  fs.writeFileSync(stemPath, stemResponse.data);

                  song.stems[stemType] = stemPath;
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

            if (anyNewDownloads) {
              await song.save();
            }

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
      })
      .catch((error) => {
        console.error("Error starting stem process:", error);
        song.stemsStatus = "failed";
        song.save();
      });
  } catch (error) {
    console.error("Error uploading song:", error);
    res.status(500).json({ error: "Failed to upload song", details: error.message });
  }
});

router.get("/songs", auth.ensureLoggedIn, (req, res) => {
  Song.find({ creator_id: req.user._id }).then((songs) => {
    const songsWithStems = songs.map((song) => {
      const songObj = song.toObject();
      songObj.id = song._id.toString(); // Add id field

      if (!songObj.stems) {
        songObj.stems = {};
      }

      const stemTypes = ["bass", "drums", "vocals", "other"];
      const stemDir = path.join(__dirname, STEMS_DIR, song._id.toString());

      if (fs.existsSync(stemDir)) {
        stemTypes.forEach((stemType) => {
          const displayType = stemType === "other" ? "melody" : stemType;
          const stemFile = `${stemType}_stem.wav`;
          const stemPath = path.join(stemDir, stemFile);

          if (fs.existsSync(stemPath)) {
            songObj.stems[displayType] = `/stems/${song._id.toString()}/${stemFile}`;
          }
        });
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

router.get("/song/:id/stems/download", auth.ensureLoggedIn, async (req, res) => {
  try {
    const song = await Song.findOne({ _id: req.params.id, creator_id: req.user._id });
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (!song.audioshakeJobIds) {
      return res.status(400).json({ error: "Song has not been processed for stems" });
    }

    const stemTypes = ["vocals", "drums", "bass", "other"];
    const stemDir = path.join(__dirname, STEMS_DIR, song._id.toString());

    if (!fs.existsSync(stemDir)) {
      return res.status(404).json({ error: "Stems not found" });
    }

    const zip = new JSZip();
    stemTypes.forEach((stemType) => {
      const stemFile = `${stemType}.wav`;
      const stemPath = path.join(stemDir, stemFile);

      if (fs.existsSync(stemPath)) {
        zip.file(stemFile, fs.readFileSync(stemPath));
      }
    });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${song.title}_stems.zip`,
    });

    res.send(zipBuffer);
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

    const stemsDir = path.join(__dirname, STEMS_DIR, song._id.toString());
    debugInfo.stemsDirExists = fs.existsSync(stemsDir);
    debugInfo.stemsDir = stemsDir;

    if (debugInfo.stemsDirExists) {
      debugInfo.stemFiles = fs.readdirSync(stemsDir);
    }

    if (song.audioshakeJobIds) {
      try {
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

    if (fs.existsSync(song.filePath)) {
      fs.unlinkSync(song.filePath);
    }

    const stemDir = path.join(__dirname, STEMS_DIR, song._id.toString());
    if (fs.existsSync(stemDir)) {
      fs.rmdirSync(stemDir, { recursive: true });
    }

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

    if (song.creator_id.toString() !== req.user._id.toString()) {
      return res.status(403).send({ error: "Not authorized to delete this song" });
    }

    if (fs.existsSync(song.filePath)) {
      fs.unlinkSync(song.filePath);
    }

    const stemDir = path.join(__dirname, STEMS_DIR, song._id.toString());
    if (fs.existsSync(stemDir)) {
      fs.rmdirSync(stemDir, { recursive: true });
    }

    await Song.findByIdAndDelete(song._id);
    res.send({ message: "Song deleted successfully" });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).send({ error: "Could not delete song" });
  }
});

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

router.get("/songs/:songId/status", auth.ensureLoggedIn, async (req, res) => {
  try {
    console.log("Checking status for song:", req.params.songId);
    const song = await Song.findById(req.params.songId);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

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

router.post("/audioshake/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const formData = new FormData();

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

    fs.unlinkSync(tempPath);

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Error uploading to AudioShake",
      details: error.response?.data || error.message,
    });
  }
});

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
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

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
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

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
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

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
      res.status(500).json({
        error: "Error creating AudioShake job",
        details: error.response?.data || error.message,
      });
    });
});

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
    res.status(500).json({
      error: "Error getting AudioShake job status",
      details: error.response?.data || error.message,
    });
  }
});

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

    res.set({
      "Content-Type": "audio/wav",
      "Content-Disposition": `attachment; filename=${stemId}.wav`,
    });

    res.send(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Error downloading AudioShake stem",
      details: error.response?.data || error.message,
    });
  }
});

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

    const stems = response.data.job.stemAssets.map((stem) => ({
      id: stem.id,
      name: stem.name,
      type: stem.fileType,
      format: stem.format,
    }));

    res.json({ stems });
  } catch (error) {
    res.status(500).json({
      error: "Error getting AudioShake stems",
      details: error.response?.data || error.message,
    });
  }
});

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

router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
