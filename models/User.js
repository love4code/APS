const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  name: {
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
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isSalesRep: {
    type: Boolean,
    default: false
  },
  isInstaller: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to verify password
userSchema.methods.verifyPassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.passwordHash)
  } catch (error) {
    return false
  }
}

// Static method to create user with password
userSchema.statics.createWithPassword = async function (
  name,
  email,
  password,
  role = 'user'
) {
  // Create user with plain password - pre-save hook will hash it
  const user = new this({
    name,
    email,
    passwordHash: password, // Pre-save hook will hash this
    role
  })
  await user.save()
  return user
}

module.exports = mongoose.model('User', userSchema)
