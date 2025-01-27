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
  stems: {
    vocals: String,
    drums: String,
    bass: String,
    other: String,
    processed: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed'],
      default: 'uploading'
    },
    error: String
  }
});

module.exports = mongoose.model("song", SongSchema);
