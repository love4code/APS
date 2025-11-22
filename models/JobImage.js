const mongoose = require('mongoose')

const jobImageSchema = new mongoose.Schema(
  {
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
    // Store image data as Buffer in database
    thumbnailData: {
      type: Buffer,
      required: true
    },
    mediumData: {
      type: Buffer,
      required: true
    },
    largeData: {
      type: Buffer,
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
  },
  {
    // Don't include buffers in JSON output by default (for performance)
    toJSON: {
      transform: function (doc, ret) {
        delete ret.thumbnailData
        delete ret.mediumData
        delete ret.largeData
        return ret
      }
    }
  }
)

// Index for faster queries
jobImageSchema.index({ job: 1, uploadedAt: -1 })

module.exports = mongoose.model('JobImage', jobImageSchema)
