const CalendarInvite = require('../models/CalendarInvite')
const User = require('../models/User')
const Store = require('../models/Store')
const bcrypt = require('bcrypt')

// Show invite acceptance page
exports.acceptInvite = async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).render('error', {
        title: 'Invalid Invite',
        message: 'Invalid or missing invite token.'
      })
    }

    const invite = await CalendarInvite.findOne({ inviteToken: token })

    if (!invite) {
      return res.status(404).render('error', {
        title: 'Invite Not Found',
        message: 'This invite link is invalid or has expired.'
      })
    }

    if (invite.isExpired()) {
      invite.status = 'expired'
      await invite.save()
      return res.status(410).render('error', {
        title: 'Invite Expired',
        message: 'This invite has expired. Please request a new invitation.'
      })
    }

    if (invite.status === 'accepted') {
      return res.render('invite/already-accepted', {
        title: 'Invite Already Accepted',
        invite
      })
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: invite.email })
    if (existingUser) {
      // User exists, they can log in
      return res.render('invite/user-exists', {
        title: 'Account Already Exists',
        invite,
        email: invite.email
      })
    }

    // Get entity name
    let entityName = 'Unknown'
    if (invite.entityModel === 'Store') {
      const store = await Store.findById(invite.entityId)
      entityName = store ? store.name : 'Unknown Store'
    } else if (invite.entityModel === 'User') {
      const user = await User.findById(invite.entityId)
      entityName = user ? user.name : 'Unknown User'
    }

    // Get flash messages if available
    const error = req.flash ? req.flash('error')[0] : null

    res.render('invite/accept', {
      title: 'Accept Calendar Invitation',
      invite,
      entityName,
      email: invite.email,
      name: invite.name,
      error
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing your invitation.'
    })
  }
}

// Process invite acceptance and create account
exports.processAcceptance = async (req, res) => {
  try {
    const { token, name, password, confirmPassword } = req.body

    if (!token) {
      req.flash('error', 'Invalid invite token')
      return res.redirect('/login')
    }

    const invite = await CalendarInvite.findOne({ inviteToken: token })

    if (!invite || invite.isExpired() || invite.status === 'accepted') {
      req.flash('error', 'Invalid or expired invite')
      return res.redirect('/login')
    }

    if (!name || !name.trim()) {
      req.flash('error', 'Name is required')
      return res.redirect(`/invite/accept?token=${token}`)
    }

    if (!password || password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters')
      return res.redirect(`/invite/accept?token=${token}`)
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match')
      return res.redirect(`/invite/accept?token=${token}`)
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invite.email })
    if (existingUser) {
      req.flash(
        'error',
        'An account with this email already exists. Please log in instead.'
      )
      return res.redirect('/login')
    }

    // Create user account
    const user = await User.createWithPassword(
      name.trim(),
      invite.email,
      password,
      'user' // Regular user role
    )

    // Mark invite as accepted
    invite.status = 'accepted'
    invite.acceptedAt = new Date()
    await invite.save()

    // Auto-login the user
    req.session.userId = user._id

    // Redirect to appropriate calendar
    let redirectUrl = '/'
    if (invite.inviteType === 'store') {
      const store = await Store.findById(invite.entityId)
      if (store) {
        redirectUrl = `/jobs/calendar/shared?type=store&token=${store.calendarShareToken}`
      }
    } else if (
      invite.inviteType === 'installer' ||
      invite.inviteType === 'salesrep'
    ) {
      const entityUser = await User.findById(invite.entityId)
      if (entityUser && entityUser.calendarShareToken) {
        redirectUrl = `/jobs/calendar/shared?type=${invite.inviteType}&token=${entityUser.calendarShareToken}`
      }
    }

    req.flash('success', 'Account created successfully! Welcome to APS.')
    res.redirect(redirectUrl)
  } catch (error) {
    console.error('Process acceptance error:', error)
    req.flash('error', error.message || 'Error creating account')
    res.redirect(`/invite/accept?token=${req.body.token}`)
  }
}
