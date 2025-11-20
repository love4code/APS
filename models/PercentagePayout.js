const mongoose = require('mongoose')

const percentagePayoutSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  // Employee payouts for this day
  employeePayouts: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    payType: {
      type: String,
      enum: ['percentage', 'hourly'],
      required: true
    },
    percentageRate: {
      type: Number,
      min: 0,
      max: 100
    },
    hourlyRate: {
      type: Number,
      min: 0
    },
    hours: {
      type: Number,
      min: 0
    },
    payoutAmount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // Job costs and materials
  jobCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  materials: {
    type: Number,
    default: 0,
    min: 0
  },
  laborCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  // Totals
  totalRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  totalCosts: {
    type: Number,
    required: true,
    min: 0
  },
  totalProfit: {
    type: Number,
    required: true
  },
  totalPercentagePayout: {
    type: Number,
    required: true,
    min: 0
  },
  // 20% of profit
  profitPercentage: {
    type: Number,
    default: 20
  },
  calculatedPayout: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
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

// Indexes
percentagePayoutSchema.index({ date: -1 })
percentagePayoutSchema.index({ 'employeePayouts.employee': 1 })

// Update updatedAt before saving
percentagePayoutSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('PercentagePayout', percentagePayoutSchema)

