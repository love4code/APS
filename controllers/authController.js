const User = require('../models/User')
const mongoose = require('mongoose')

exports.getLogin = (req, res) => {
  if (req.session.userId) {
    return res.redirect('/')
  }
  res.render('auth/login', { title: 'Login', error: null })
}

exports.postLogin = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
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
      return res.render('auth/login', {
        title: 'Login',
        error: 'Database connection error. Please try again.'
      })
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    }).maxTimeMS(5000) // 5 second timeout

    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      })
    }

    // Prevent login for users without passwords (sales reps/installers)
    if (user.passwordHash === 'NO_PASSWORD_SET') {
      return res.render('auth/login', {
        title: 'Login',
        error: 'This account does not have login access'
      })
    }

    const isValid = await user.verifyPassword(password)

    if (!isValid) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      })
    }

    // Save session
    req.session.userId = user._id.toString()

    // Ensure session is saved before redirect
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err)
        return res.render('auth/login', {
          title: 'Login',
          error: 'Session error. Please try again.'
        })
      }

      req.flash('success', `Welcome back, ${user.name}!`)
      res.redirect('/')
    })
  } catch (error) {
    console.error('Login error:', error)
    // Always send a response
    try {
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
