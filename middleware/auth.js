const User = require('../models/User')

// Check if user is authenticated
exports.requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page')
    return res.redirect('/login')
  }
  next()
}

// Check if user is admin
exports.requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page')
    return res.redirect('/login')
  }

  try {
    const user = await User.findById(req.session.userId)
    if (!user || user.role !== 'admin') {
      req.flash('error', 'Access denied. Admin privileges required.')
      return res.redirect('/')
    }
    req.user = user
    next()
  } catch (error) {
    req.flash('error', 'Error verifying user')
    res.redirect('/login')
  }
}

// Load user into req.user for all authenticated routes
exports.loadUser = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId)
      req.user = user
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }
  next()
}
