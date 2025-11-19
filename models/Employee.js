const mongoose = require('mongoose')

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on_leave'],
    default: 'active'
  },
  hireDate: {
    type: Date,
    required: true
  },
  terminationDate: {
    type: Date
  },
  payType: {
    type: String,
    enum: ['hourly', 'salary'],
    required: true
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  annualSalary: {
    type: Number,
    min: 0
  },
  defaultOvertimeMultiplier: {
    type: Number,
    default: 1.5,
    min: 1
  },
  defaultSchedule: {
    type: mongoose.Schema.Types.Mixed
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

// Indexes for common queries
employeeSchema.index({ status: 1 })
employeeSchema.index({ department: 1 })
employeeSchema.index({ email: 1 })
employeeSchema.index({ lastName: 1, firstName: 1 })

// Update updatedAt before saving
employeeSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Employee', employeeSchema)

