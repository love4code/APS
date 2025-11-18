const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const mongoose = require('mongoose')
const path = require('path')
const flash = require('connect-flash')
require('dotenv').config()

const connectDB = require('./config/db')

const app = express()

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
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: 'sessions'
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
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
