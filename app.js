const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const mongoose = require('mongoose')
const path = require('path')
const flash = require('connect-flash')
require('dotenv').config()

const connectDB = require('./config/db')

const app = express()

// Trust proxy (required for Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Connect to database
connectDB()

// View engine setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  // Set socket timeout
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      console.error('Request socket timeout:', req.method, req.path)
      res.status(408).send('Request timeout')
    }
  })

  // Set response timeout
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      console.error('Response timeout:', req.method, req.path)
      res.status(504).send('Gateway timeout')
    }
  })

  next()
})

// Session configuration
const sessionSecret =
  process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: SESSION_SECRET not set in production!')
}

// Create session store with error handling
let sessionStore
try {
  const mongoUrl =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/aps_app'

  // Don't create session store if MongoDB URI is invalid (DNS errors)
  if (mongoUrl && !mongoUrl.includes('testapp1.mongodb.net')) {
    sessionStore = MongoStore.create({
      mongoUrl: mongoUrl,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
      touchAfter: 24 * 3600, // lazy session update
      autoRemove: 'native',
      // Connection options to prevent hanging
      mongoOptions: {
        serverSelectionTimeoutMS: 3000, // 3 second timeout
        socketTimeoutMS: 10000,
        connectTimeoutMS: 5000,
        maxPoolSize: 2 // Limit session store connections
      }
    })

    // Handle store errors gracefully (only if store was created)
    if (sessionStore) {
      sessionStore.on('error', error => {
        console.error('Session store error:', error)
        // Don't crash on session store errors
      })

      // Handle store connection
      sessionStore.on('connected', () => {
        console.log('Session store connected')
      })

      sessionStore.on('disconnected', () => {
        console.warn('Session store disconnected')
      })
    }
  } else {
    console.warn('Skipping session store creation - invalid MongoDB URI')
    sessionStore = undefined
  }
} catch (error) {
  console.error('Failed to create session store:', error)
  // Continue without session store (will use memory store as fallback)
  sessionStore = undefined
}

// Session middleware with error handling
const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
})

// Wrap session middleware to catch errors
app.use((req, res, next) => {
  try {
    sessionMiddleware(req, res, next)
  } catch (error) {
    console.error('Session middleware error:', error)
    // Continue without session if it fails
    if (!req.session) {
      req.session = {}
    }
    next()
  }
})

// Flash messages
app.use(flash())

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  next()
})

// Query timeout middleware
const queryTimeout = require('./middleware/queryTimeout')
app.use(queryTimeout)

// Load user middleware (loads user into req.user)
const { loadUser } = require('./middleware/auth')
app.use(loadUser)

// Make user available to all views
app.use((req, res, next) => {
  try {
    // req.user is already a plain object from loadUser middleware (.lean())
    res.locals.user = req.user || null
    res.locals.isAuthenticated = !!(req.session && req.session.userId)
    next()
  } catch (error) {
    console.error('Error setting user locals:', error)
    res.locals.user = null
    res.locals.isAuthenticated = false
    next()
  }
})

// Health check route (no middleware)
app.get('/health', (req, res) => {
  try {
    const mongoose = require('mongoose')
    const mongoUri = process.env.MONGODB_URI || 'not set'
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongodb_uri_set:
        mongoUri !== 'not set' &&
        mongoUri !== 'mongodb://localhost:27017/aps_app',
      database: mongoose.connection
        ? {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
          }
        : 'not connected'
    })
  } catch (error) {
    res.json({
      status: 'error',
      error: error.message,
      mongodb_uri_set: !!process.env.MONGODB_URI
    })
  }
})

// Test route to check if app is working
app.get('/test', (req, res) => {
  res.send('App is working!')
})

// Routes
app.use('/', require('./routes/dashboardRoutes'))
app.use('/', require('./routes/authRoutes'))
app.use('/admin/users', require('./routes/userRoutes'))
app.use('/customers', require('./routes/customerRoutes'))
app.use('/products', require('./routes/productRoutes'))
app.use('/sales', require('./routes/salesRoutes')) // Sales routes (must be before /my)
app.use('/sales-reps', require('./routes/salesRepRoutes'))
app.use('/installers', require('./routes/installerRoutes'))
app.use('/payments', require('./routes/paymentRoutes'))
app.use('/stores', require('./routes/storeRoutes'))
app.use('/jobs', require('./routes/jobRoutes'))
app.use('/my', require('./routes/jobRoutes')) // For /my/sales and /my/installs

// 404 handler
app.use((req, res) => {
  // Ensure required variables are set for error view
  res.locals.isAuthenticated = res.locals.isAuthenticated || false
  res.locals.user = res.locals.user || null
  res.locals.success = res.locals.success || []
  res.locals.error = res.locals.error || []

  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'Page not found'
  })
})

// Error handler - must be last
app.use((err, req, res, next) => {
  try {
    console.error('=== ERROR HANDLER ===')
    console.error('Error name:', err ? err.name : 'Unknown')
    console.error('Error message:', err ? err.message : 'No error message')
    console.error('Error stack:', err ? err.stack : 'No stack trace')
    console.error('Request path:', req.path)
    console.error('Request method:', req.method)

    // Don't send response if headers already sent
    if (res.headersSent) {
      return next(err)
    }

    // Ensure required variables are set for error view
    if (!res.locals) {
      res.locals = {}
    }
    res.locals.isAuthenticated = res.locals.isAuthenticated || false
    res.locals.user = res.locals.user || null
    res.locals.success = res.locals.success || []
    res.locals.error = res.locals.error || []

    // Set status code
    const statusCode = (err && (err.status || err.statusCode)) || 500
    const errorMessage = err && err.message ? err.message : 'An error occurred'

    try {
      res.status(statusCode).render('error', {
        title: `${statusCode} - Server Error`,
        message:
          process.env.NODE_ENV === 'production'
            ? 'An error occurred. Please try again.'
            : errorMessage
      })
    } catch (renderError) {
      // If render fails, send plain text
      console.error('Error view render failed:', renderError)
      console.error('Error view render stack:', renderError.stack)
      console.error('Original error:', errorMessage)
      try {
        res.status(statusCode).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Error ${statusCode}</title></head>
            <body>
              <h1>Error ${statusCode}</h1>
              <p>${
                process.env.NODE_ENV === 'production'
                  ? 'An error occurred. Please try again.'
                  : errorMessage
              }</p>
              <a href="/login">Go to Login</a>
            </body>
          </html>
        `)
      } catch (sendError) {
        console.error('Failed to send error response:', sendError)
        // Last resort - just end the response
        if (!res.headersSent) {
          try {
            res.status(statusCode).end()
          } catch (endError) {
            console.error('Failed to end response:', endError)
          }
        }
      }
    }
  } catch (handlerError) {
    // If error handler itself fails, log and try to send basic response
    console.error('CRITICAL: Error handler failed:', handlerError)
    if (!res.headersSent) {
      try {
        res.status(500).send('Internal Server Error')
      } catch (finalError) {
        console.error('CRITICAL: Could not send any response:', finalError)
      }
    }
  }
})

module.exports = app
