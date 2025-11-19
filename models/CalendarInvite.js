const mongoose = require('mongoose')

const calendarInviteSchema = new mongoose.Schema({
  inviteToken: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  inviteType: {
    type: String,
    enum: ['store', 'installer', 'salesrep'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityModel'
  },
  entityModel: {
    type: String,
    enum: ['Store', 'User'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function () {
      // Invite expires in 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Generate invite token before saving
calendarInviteSchema.pre('save', async function (next) {
  if (!this.inviteToken) {
    const crypto = require('crypto')
    this.inviteToken = crypto.randomBytes(32).toString('hex')
  }
  next()
})

// Check if invite is expired
calendarInviteSchema.methods.isExpired = function () {
  return this.expiresAt < new Date() || this.status === 'expired'
}

module.exports = mongoose.model('CalendarInvite', calendarInviteSchema)
