const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI

    // Debug logging
    console.log('=== MongoDB Connection Debug ===')
    console.log('MONGODB_URI is set:', !!mongoUri)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    if (mongoUri) {
      // Log connection string without password
      const uriForLogging = mongoUri.replace(/:[^:@]+@/, ':****@')
      console.log('Connection string (masked):', uriForLogging)
      console.log('Connection string length:', mongoUri.length)
      console.log(
        'Starts with mongodb+srv:',
        mongoUri.startsWith('mongodb+srv://')
      )
      console.log('Contains @:', mongoUri.includes('@'))
      // Extract cluster name for debugging
      const clusterMatch = mongoUri.match(/@([^.]+\.mongodb\.net)/)
      if (clusterMatch) {
        console.log('Cluster name:', clusterMatch[1])
      } else {
        console.log(
          'WARNING: Could not extract cluster name from connection string!'
        )
      }
    }
    console.log('===============================')

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
      serverSelectionTimeoutMS: 30000, // 30 second timeout for DNS resolution
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 30000, // Give up initial connection after 30s
      maxPoolSize: 5, // Limit connections to prevent hanging
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000, // Check connection health every 10s
      // Additional options for better connection handling
      retryReads: true,
      directConnection: false, // Use SRV records (for mongodb+srv://)
      // Force IPv4 (sometimes helps with DNS issues)
      family: 4
    }

    console.log('Attempting MongoDB connection...')
    console.log('Connection options:', {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      connectTimeoutMS: options.connectTimeoutMS,
      socketTimeoutMS: options.socketTimeoutMS
    })

    // Try connecting with explicit error handling
    try {
      await mongoose.connect(mongoUri, options)
      console.log('✅ MongoDB connected successfully')
      console.log('Connection state:', mongoose.connection.readyState)
      console.log('Database name:', mongoose.connection.name)
      console.log('Host:', mongoose.connection.host)
    } catch (connectError) {
      console.error('❌ MongoDB connection failed during connect() call')
      console.error('Error details:', {
        name: connectError.name,
        code: connectError.code,
        message: connectError.message,
        stack: connectError.stack
      })

      // If it's a DNS/SRV error and using mongodb+srv://, suggest trying standard connection
      if (
        (connectError.code === 'ENOTFOUND' ||
          connectError.message.includes('ENOTFOUND')) &&
        mongoUri.startsWith('mongodb+srv://')
      ) {
        console.error('')
        console.error('⚠️  SRV connection failed. If this persists, try:')
        console.error(
          '   1. Get the standard connection string from MongoDB Atlas'
        )
        console.error(
          '   2. Use "Connect" → "Connect your application" → "Standard connection string"'
        )
        console.error(
          '   3. It should look like: mongodb://username:password@host1:port1,host2:port2/database'
        )
        console.error('')
      }

      throw connectError // Re-throw to be caught by outer catch
    }

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
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)

    // Check for DNS errors (invalid connection string)
    if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
      console.error('')
      console.error('='.repeat(60))
      console.error('MONGODB CONNECTION ERROR!')
      console.error('='.repeat(60))
      console.error('DNS lookup failed. Common causes:')
      console.error('')
      console.error('1. IP WHITELIST (MOST COMMON):')
      console.error('   - Go to MongoDB Atlas → Network Access')
      console.error('   - Click "Add IP Address"')
      console.error('   - Click "Allow Access from Anywhere" (0.0.0.0/0)')
      console.error('   - Or add specific Heroku IP ranges')
      console.error('')
      console.error('2. CONNECTION STRING ISSUES:')
      console.error(
        '   - Check if password has special characters (needs URL encoding)'
      )
      console.error('   - Verify the connection string is correct:')
      console.error('     heroku config:get MONGODB_URI')
      console.error('   - If password has @, #, %, etc., URL encode them:')
      console.error('     @ = %40, # = %23, % = %25, etc.')
      console.error('')
      console.error('3. CLUSTER NAME:')
      console.error('   - Verify cluster name matches in connection string')
      console.error(
        '   - Get correct string from Atlas → Connect → Connect your app'
      )
      console.error('')
      console.error('To update connection string:')
      console.error(
        '  heroku config:set MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"'
      )
      console.error('='.repeat(60))
      console.error('')
    }

    // Check for authentication errors
    if (
      error.code === 'EAUTH' ||
      error.message.includes('authentication') ||
      error.message.includes('bad auth')
    ) {
      console.error('')
      console.error('='.repeat(60))
      console.error('MONGODB AUTHENTICATION ERROR!')
      console.error('='.repeat(60))
      console.error('Username or password is incorrect.')
      console.error('')
      console.error('Common issues:')
      console.error('  1. Password has special characters - needs URL encoding')
      console.error('  2. Username or password has typos')
      console.error('  3. Database user was deleted or password changed')
      console.error('')
      console.error('Fix:')
      console.error('  1. Go to MongoDB Atlas → Database Access')
      console.error('  2. Verify username and reset password if needed')
      console.error('  3. URL encode special characters in password')
      console.error(
        '  4. Update on Heroku: heroku config:set MONGODB_URI="..."'
      )
      console.error('='.repeat(60))
      console.error('')
    }

    // Don't exit in production - let the app try to handle requests
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1)
    }
  }
}

module.exports = connectDB
