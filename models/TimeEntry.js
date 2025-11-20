const mongoose = require('mongoose')

const timeEntrySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  hoursWorked: {
    type: Number,
    required: true,
    min: 0
  },
  breakMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  type: {
    type: String,
    enum: ['regular', 'overtime', 'pto', 'sick', 'holiday'],
    default: 'regular'
  },
  // Support for multiple jobs
  jobs: [
    {
      job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
      },
      jobName: {
        type: String,
        trim: true
      },
      jobId: {
        type: String,
        trim: true
      }
    }
  ],
  // Legacy fields for backward compatibility
  projectOrJobId: {
    type: String,
    trim: true
  },
  jobName: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    default: ''
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Indexes for common queries
timeEntrySchema.index({ employee: 1, date: -1 })
timeEntrySchema.index({ date: -1 })
timeEntrySchema.index({ approved: 1 })
timeEntrySchema.index({ type: 1 })

// Update updatedAt before saving
timeEntrySchema.pre('save', function (next) {
  this.updatedAt = Date.now()

  // Calculate hoursWorked from startTime/endTime if both are provided and hoursWorked not explicitly set
  if (this.startTime && this.endTime && !this.isModified('hoursWorked')) {
    const start = new Date(this.startTime)
    const end = new Date(this.endTime)
    const diffMs = end - start
    const diffHours = diffMs / (1000 * 60 * 60)
    const breakHours = (this.breakMinutes || 0) / 60
    this.hoursWorked = Math.max(0, diffHours - breakHours)
  }

  next()
})

module.exports = mongoose.model('TimeEntry', timeEntrySchema)
