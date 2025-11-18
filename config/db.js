const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aps_app'
    
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      retryWrites: true,
      w: 'majority'
    }

    await mongoose.connect(mongoUri, options)
    console.log('MongoDB connected')
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected')
    })
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected')
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
    // Don't exit in production - let the app try to handle requests
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1)
    }
  }
}

module.exports = connectDB
