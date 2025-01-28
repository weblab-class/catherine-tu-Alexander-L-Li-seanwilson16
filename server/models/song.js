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
  stems: {
    type: Map,
    of: String,
    default: {},
    vocals: String,
    drums: String,
    bass: String,
    other: String
  },
  processed: {
    type: Boolean,
    default: false,
  },
  audioshakeAssetId: String,
  audioshakeJobIds: [String],
  stemsStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  stemsPath: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  // Add any additional metadata fields you want to store
  duration: Number,
});

module.exports = mongoose.model("song", SongSchema);
