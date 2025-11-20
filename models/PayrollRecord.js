const mongoose = require('mongoose')

const payrollRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  payPeriod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayPeriod',
    required: true
  },
  // Aggregated fields from TimeEntry
  totalRegularHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOvertimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPTOHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalGrossPay: {
    type: Number,
    default: 0,
    min: 0
  },
  // Daily percentage payouts included in this payroll
  totalDailyPayouts: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeMultiplierUsed: {
    type: Number,
    default: 1.5
  },
  // Payment info
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'scheduled', 'paid'],
    default: 'unpaid'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['check', 'direct_deposit', 'cash', 'other'],
    trim: true
  },
  transactionReference: {
    type: String,
    trim: true
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
payrollRecordSchema.index({ employee: 1, payPeriod: 1 }, { unique: true })
payrollRecordSchema.index({ payPeriod: 1 })
payrollRecordSchema.index({ paymentStatus: 1 })
payrollRecordSchema.index({ paymentDate: -1 })

// Update updatedAt before saving
payrollRecordSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema)
