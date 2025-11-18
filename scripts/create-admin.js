require('dotenv').config()
const connectDB = require('../config/db')
const User = require('../models/User')

async function createAdmin () {
  try {
    await connectDB()
    console.log('Connected to MongoDB')

    const email = 'admin@aps.com'
    const password = 'admin123'
    const name = 'Admin User'

    const existing = await User.findOne({ email })
    if (existing) {
      console.log('Admin user already exists. Updating password...')
      // Set plain password - pre-save hook will hash it
      existing.passwordHash = password
      existing.role = 'admin'
      existing.isSalesRep = true
      existing.isInstaller = true
      existing.isActive = true
      await existing.save()
      console.log('Admin password updated!')
    } else {
      await User.createWithPassword(name, email, password, 'admin')
      const user = await User.findOne({ email })
      user.isSalesRep = true
      user.isInstaller = true
      await user.save()
      console.log('Admin user created!')
    }

    console.log('\nAdmin credentials:')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('Role: admin')

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAdmin()
