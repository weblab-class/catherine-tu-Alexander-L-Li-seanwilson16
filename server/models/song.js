const mongoose = require("mongoose");

const SongSchema = new mongoose.Schema({
  creator_id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  // Add any additional metadata fields you want to store
  duration: Number,
  processed: {
    type: Boolean,
    default: false,
  },
  stems: {
    type: Map,
    of: String,
    default: {},
  },
});

module.exports = mongoose.model("song", SongSchema);
