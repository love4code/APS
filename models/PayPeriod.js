const mongoose = require('mongoose')

const payPeriodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'locked', 'processed'],
    default: 'open'
  },
  notes: {
    type: String,
    default: ''
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

// Indexes
payPeriodSchema.index({ startDate: -1, endDate: -1 })
payPeriodSchema.index({ status: 1 })

// Update updatedAt before saving
payPeriodSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('PayPeriod', payPeriodSchema)

