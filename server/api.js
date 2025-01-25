/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

// import models so we can interact with the database
const User = require("./models/user");
const Song = require("./models/song");

// import authentication library
const auth = require("./auth");

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
  // do nothing if user not logged in
  if (req.user)
    socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  res.send({});
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
    });

    await song.save();
    res.json(song);
  } catch (err) {
    console.error("Error uploading song:", err);
    res.status(500).json({ error: "Error uploading song" });
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

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
