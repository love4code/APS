const User = require('../models/User')

// Check if user is authenticated
exports.requireAuth = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      // Check if this is an AJAX/JSON request
      const isAjax = req.xhr || 
                     req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                     req.headers.accept?.indexOf('json') > -1 ||
                     req.headers['content-type']?.indexOf('json') > -1
      
      if (isAjax) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' })
      }
      
      req.flash('error', 'Please log in to access this page')
      return res.redirect('/login')
    }
    next()
  } catch (error) {
    console.error('requireAuth error:', error)
    
    // Check if this is an AJAX/JSON request
    const isAjax = req.xhr || 
                   req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                   req.headers.accept?.indexOf('json') > -1 ||
                   req.headers['content-type']?.indexOf('json') > -1
    
    if (isAjax) {
      return res.status(500).json({ error: 'Authentication error' })
    }
    
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
  try {
    // If no session, skip user loading
    if (!req.session || !req.session.userId) {
      req.user = null
      return next()
    }

    // Check if database is connected before querying
    const mongoose = require('mongoose')
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.warn('Database not connected, skipping user load')
      req.user = null
      return next()
    }

    try {
      const user = await User.findById(req.session.userId)
        .maxTimeMS(3000) // 3 second timeout
        .lean()

      if (!user || !user.isActive) {
        // User not found or deactivated, clear session
        if (req.session && req.session.destroy) {
          req.session.destroy(() => {
            req.user = null
            next()
          })
        } else {
          req.user = null
          next()
        }
        return
      }
      req.user = user
      next()
    } catch (dbError) {
      console.error('Database error loading user:', dbError)
      // On database error, just continue without user
      req.user = null
      next()
    }
  } catch (error) {
    console.error('Error in loadUser middleware:', error)
    // Always continue, never throw
    req.user = null
    next()
  }
}
