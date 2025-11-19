const User = require('../models/User')

exports.list = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.render('users/list', { title: 'Users', users })
  } catch (error) {
    req.flash('error', 'Error loading users')
    res.redirect('/')
  }
}

exports.newForm = (req, res) => {
  const type = req.query.type // 'salesrep' or 'installer'
  const user = type
    ? {
        isSalesRep: type === 'salesrep',
        isInstaller: type === 'installer'
      }
    : null

  let title = 'New User'
  if (type === 'salesrep') title = 'New Sales Rep'
  if (type === 'installer') title = 'New Installer'

  res.render('users/form', { title, user, type })
}

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, isSalesRep, isInstaller } = req.body

    if (!name || !email) {
      req.flash('error', 'Name and email are required')
      return res.redirect('/admin/users/new')
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      req.flash('error', 'User with this email already exists')
      return res.redirect('/admin/users/new')
    }

    // Sales reps and installers don't need passwords - they're just for tracking
    // Regular users need passwords to log in
    const isSalesRepOrInstaller = isSalesRep === 'on' || isInstaller === 'on'

    if (!password && !isSalesRepOrInstaller) {
      req.flash('error', 'Password is required for regular users')
      return res.redirect('/admin/users/new')
    }

    if (isSalesRepOrInstaller && !password) {
      // Create user without password - set a placeholder that can't be used for login
      try {
        const user = new User({
          name,
          email: email.toLowerCase(),
          passwordHash: 'NO_PASSWORD_SET', // Placeholder - can't be used for login
          role: role || 'user',
          isSalesRep: isSalesRep === 'on',
          isInstaller: isInstaller === 'on'
        })
        await user.save()

        // Verify user was saved with an _id
        if (!user._id) {
          throw new Error('User was not saved properly - missing _id')
        }

        req.flash(
          'success',
          `${
            isSalesRep === 'on' ? 'Sales rep' : 'Installer'
          } created successfully`
        )

        // Redirect based on type immediately after successful save
        if (isSalesRep === 'on') {
          return res.redirect('/sales-reps')
        } else if (isInstaller === 'on') {
          return res.redirect('/installers')
        }
      } catch (saveError) {
        console.error('Error saving sales rep/installer:', saveError)
        req.flash('error', 'Error creating user: ' + saveError.message)
        return res.redirect(
          '/admin/users/new' + (req.query.type ? '?type=' + req.query.type : '')
        )
      }
    } else {
      // Regular user creation with password
      await User.createWithPassword(
        name,
        email.toLowerCase(),
        password,
        role || 'user'
      )

      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        throw new Error('User was created but could not be found')
      }
      user.isSalesRep = isSalesRep === 'on'
      user.isInstaller = isInstaller === 'on'
      await user.save()
      req.flash('success', 'User created successfully')

      // Redirect based on type
      if (isSalesRep === 'on') {
        return res.redirect('/sales-reps')
      } else if (isInstaller === 'on') {
        return res.redirect('/installers')
      } else {
        return res.redirect('/admin/users')
      }
    }
  } catch (error) {
    console.error('Error in user create:', error)
    req.flash('error', error.message || 'Error creating user')
    const redirectUrl =
      '/admin/users/new' + (req.query.type ? '?type=' + req.query.type : '')
    return res.redirect(redirectUrl)
  }
}

exports.editForm = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid user ID')
      return res.redirect('/admin/users')
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      req.flash('error', 'User not found')
      return res.redirect('/admin/users')
    }
    res.render('users/form', { title: 'Edit User', user, type: null })
  } catch (error) {
    console.error('Error loading user for edit:', error)
    req.flash('error', 'Error loading user: ' + error.message)
    res.redirect('/admin/users')
  }
}

exports.update = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid user ID')
      return res.redirect('/admin/users')
    }

    const { name, email, password, role, isSalesRep, isInstaller, isActive } =
      req.body
    const user = await User.findById(req.params.id)

    if (!user) {
      req.flash('error', 'User not found')
      return res.redirect('/admin/users')
    }

    user.name = name
    user.email = email.toLowerCase()
    user.role = role || 'user'
    user.isSalesRep = isSalesRep === 'on'
    user.isInstaller = isInstaller === 'on'
    user.isActive = isActive === 'on'

    if (password && password.trim() !== '') {
      user.passwordHash = password // Will be hashed by pre-save hook
    }

    await user.save()

    req.flash('success', 'User updated successfully')
    res.redirect('/admin/users')
  } catch (error) {
    req.flash('error', error.message || 'Error updating user')
    res.redirect(`/admin/users/${req.params.id}/edit`)
  }
}

exports.deactivate = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid user ID')
      return res.redirect('/admin/users')
    }

    const user = await User.findById(req.params.id)
    if (user) {
      user.isActive = false
      await user.save()
      req.flash('success', 'User deactivated')
    } else {
      req.flash('error', 'User not found')
    }
    res.redirect('/admin/users')
  } catch (error) {
    console.error('Error deactivating user:', error)
    req.flash('error', 'Error deactivating user: ' + error.message)
    res.redirect('/admin/users')
  }
}

exports.delete = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid user ID')
      return res.redirect('/admin/users')
    }

    const user = await User.findById(req.params.id)
    if (!user) {
      req.flash('error', 'User not found')
      return res.redirect('/admin/users')
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      req.flash('error', 'You cannot delete your own account')
      return res.redirect('/admin/users')
    }

    await User.findByIdAndDelete(req.params.id)
    req.flash('success', 'User deleted successfully')
    res.redirect('/admin/users')
  } catch (error) {
    console.error('Error deleting user:', error)
    req.flash('error', 'Error deleting user: ' + error.message)
    res.redirect('/admin/users')
  }
}
