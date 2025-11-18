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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// Session configuration
const sessionSecret =
  process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: SESSION_SECRET not set in production!')
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/aps_app',
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })
)

// Flash messages
app.use(flash())

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  next()
})

// Load user middleware (loads user into req.user)
const { loadUser } = require('./middleware/auth')
app.use(loadUser)

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.user
  res.locals.isAuthenticated = !!req.session.userId
  next()
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
app.use('/jobs', require('./routes/jobRoutes'))
app.use('/my', require('./routes/jobRoutes')) // For /my/sales and /my/installs

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'Page not found'
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).render('error', {
    title: '500 - Server Error',
    message: err.message || 'An error occurred'
  })
})

module.exports = app
