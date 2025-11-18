const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI

    // Don't try to connect if MONGODB_URI is not set (especially on Heroku)
    if (!mongoUri || mongoUri === 'mongodb://localhost:27017/aps_app') {
      if (process.env.NODE_ENV === 'production') {
        console.error('ERROR: MONGODB_URI environment variable is not set!')
        console.error(
          'Please set it with: heroku config:set MONGODB_URI=your_connection_string'
        )
        // Don't exit in production, let the app start and show errors
        return
      } else {
        // In development, use localhost
        const localUri = 'mongodb://localhost:27017/aps_app'
        console.log('Using local MongoDB:', localUri)
        const options = {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
          connectTimeoutMS: 10000,
          maxPoolSize: 5,
          minPoolSize: 1,
          maxIdleTimeMS: 30000,
          retryWrites: true,
          w: 'majority',
          heartbeatFrequencyMS: 10000
        }
        await mongoose.connect(localUri, options)
        console.log('MongoDB connected (local)')
        return
      }
    }

    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 30000, // Close sockets after 30s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 5, // Limit connections to prevent hanging
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000 // Check connection health every 10s
    }

    await mongoose.connect(mongoUri, options)
    console.log('MongoDB connected')

    // Handle connection events
    mongoose.connection.on('error', err => {
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
