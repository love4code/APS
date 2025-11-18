const User = require('../models/User')

// Check if user is authenticated
exports.requireAuth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      req.flash('error', 'Please log in to access this page')
      return res.redirect('/login')
    }
    next()
  } catch (error) {
    console.error('requireAuth error:', error)
    res.redirect('/login')
  }
}

// Check if user is admin
exports.requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page')
    return res.redirect('/login')
  }

  try {
    const user = await User.findById(req.session.userId)
      .maxTimeMS(3000) // 3 second timeout
      .lean()

    if (!user || user.role !== 'admin') {
      req.flash('error', 'Access denied. Admin privileges required.')
      return res.redirect('/')
    }
    req.user = user
    next()
  } catch (error) {
    console.error('requireAdmin error:', error)
    req.flash('error', 'Error verifying user')
    res.redirect('/login')
  }
}

// Load user into req.user for all authenticated routes
exports.loadUser = async (req, res, next) => {
  // If no session, skip user loading
  if (!req.session || !req.session.userId) {
    req.user = null
    return next()
  }
  
  try {
    const user = await User.findById(req.session.userId)
      .maxTimeMS(3000) // 3 second timeout
      .lean()
    
    if (!user || !user.isActive) {
      // User not found or deactivated, clear session
      req.session.destroy(() => {
        req.user = null
        next()
      })
      return
    }
    req.user = user
    next()
  } catch (error) {
    console.error('Error loading user:', error)
    // On error, clear session to prevent repeated failures
    try {
      req.session.destroy(() => {
        req.user = null
        next()
      })
    } catch (destroyError) {
      // If destroy fails, just continue
      req.user = null
      next()
    }
  }
}
