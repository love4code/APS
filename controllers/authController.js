const User = require('../models/User')
const mongoose = require('mongoose')

exports.getLogin = (req, res, next) => {
  try {
    // Check if session exists and has userId
    if (req.session && req.session.userId) {
      return res.redirect('/')
    }

    // Ensure ALL required variables are explicitly set for the view
    // These are needed by the header partial
    res.locals.isAuthenticated = false
    res.locals.user = null
    res.locals.success = Array.isArray(res.locals.success)
      ? res.locals.success
      : []
    res.locals.error = Array.isArray(res.locals.error) ? res.locals.error : []

    // Render with explicit variables
    const renderData = {
      title: 'Login',
      error: null,
      isAuthenticated: false,
      user: null,
      success: res.locals.success
    }

    console.log('Rendering login page with data:', {
      title: renderData.title,
      hasUser: !!renderData.user,
      isAuthenticated: renderData.isAuthenticated
    })

    res.render('auth/login', renderData)
  } catch (error) {
    console.error('getLogin error:', error)
    console.error('getLogin error stack:', error.stack)
    console.error('getLogin error message:', error.message)
    next(error)
  }
}

exports.postLogin = async (req, res) => {
  const { email, password } = req.body

  console.log('=== LOGIN ATTEMPT ===')
  console.log('Email provided:', email ? 'yes' : 'no')
  console.log('Password provided:', password ? 'yes' : 'no')

  if (!email || !password) {
    console.log('Missing email or password')
    // Ensure required variables are set for the view
    res.locals.isAuthenticated = res.locals.isAuthenticated || false
    res.locals.user = res.locals.user || null
    res.locals.success = res.locals.success || []
    res.locals.error = res.locals.error || []

    return res.render('auth/login', {
      title: 'Login',
      error: 'Email and password are required'
    })
  }

  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error(
        'Database not connected, readyState:',
        mongoose.connection.readyState
      )
      // Ensure required variables are set for the view
      res.locals.isAuthenticated = res.locals.isAuthenticated || false
      res.locals.user = res.locals.user || null
      res.locals.success = res.locals.success || []
      res.locals.error = res.locals.error || []

      return res.render('auth/login', {
        title: 'Login',
        error: 'Database connection error. Please try again.'
      })
    }

    console.log('Looking for user with email:', email.toLowerCase())
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    }).maxTimeMS(5000) // 5 second timeout

    // Ensure required variables are set for the view
    res.locals.isAuthenticated = res.locals.isAuthenticated || false
    res.locals.user = res.locals.user || null
    res.locals.success = res.locals.success || []
    res.locals.error = res.locals.error || []

    if (!user) {
      console.log('User not found or not active')
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      })
    }

    console.log('User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasPasswordHash: !!user.passwordHash,
      passwordHashType:
        user.passwordHash === 'NO_PASSWORD_SET' ? 'NO_PASSWORD_SET' : 'hashed'
    })

    // Prevent login for users without passwords (sales reps/installers)
    if (user.passwordHash === 'NO_PASSWORD_SET') {
      console.log('User has NO_PASSWORD_SET - cannot login')
      return res.render('auth/login', {
        title: 'Login',
        error: 'This account does not have login access'
      })
    }

    console.log('Verifying password...')
    const isValid = await user.verifyPassword(password)
    console.log('Password valid:', isValid)

    if (!isValid) {
      console.log('Password verification failed')
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      })
    }

    console.log('Login successful! Setting session...')
    // Save session
    req.session.userId = user._id.toString()

    // Ensure session is saved before redirect
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err)
        // Ensure required variables are set for the view
        res.locals.isAuthenticated = res.locals.isAuthenticated || false
        res.locals.user = res.locals.user || null
        res.locals.success = res.locals.success || []
        res.locals.error = res.locals.error || []

        return res.render('auth/login', {
          title: 'Login',
          error: 'Session error. Please try again.'
        })
      }

      console.log('Session saved successfully. Redirecting to dashboard...')
      req.flash('success', `Welcome back, ${user.name}!`)
      res.redirect('/')
    })
  } catch (error) {
    console.error('Login error:', error)
    console.error('Login error name:', error.name)
    console.error('Login error message:', error.message)
    console.error('Login error stack:', error.stack)
    // Always send a response
    try {
      // Ensure required variables are set for the view
      res.locals.isAuthenticated = res.locals.isAuthenticated || false
      res.locals.user = res.locals.user || null
      res.locals.success = res.locals.success || []
      res.locals.error = res.locals.error || []

      res.render('auth/login', {
        title: 'Login',
        error: 'An error occurred. Please try again.'
      })
    } catch (renderError) {
      console.error('Render error:', renderError)
      res.status(500).send('Internal server error')
    }
  }
}

exports.postLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err)
    }
    res.redirect('/login')
  })
}
