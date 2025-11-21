const mongoose = require('mongoose')

const jobImageSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String,
    required: true
  },
  mediumPath: {
    type: String,
    required: true
  },
  largePath: {
    type: String,
    required: true
  },
  originalSize: {
    type: Number,
    required: true
  },
  thumbnailSize: {
    type: Number,
    required: true
  },
  mediumSize: {
    type: Number,
    required: true
  },
  largeSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
})

// Index for faster queries
jobImageSchema.index({ job: 1, uploadedAt: -1 })

module.exports = mongoose.model('JobImage', jobImageSchema)

