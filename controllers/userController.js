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
  res.render('users/form', { title: 'New User', user: null })
}

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, isSalesRep, isInstaller } = req.body

    if (!name || !email || !password) {
      req.flash('error', 'Name, email, and password are required')
      return res.redirect('/admin/users/new')
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      req.flash('error', 'User with this email already exists')
      return res.redirect('/admin/users/new')
    }

    await User.createWithPassword(
      name,
      email.toLowerCase(),
      password,
      role || 'user'
    )

    const user = await User.findOne({ email: email.toLowerCase() })
    user.isSalesRep = isSalesRep === 'on'
    user.isInstaller = isInstaller === 'on'
    await user.save()

    req.flash('success', 'User created successfully')
    res.redirect('/admin/users')
  } catch (error) {
    req.flash('error', error.message || 'Error creating user')
    res.redirect('/admin/users/new')
  }
}

exports.editForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      req.flash('error', 'User not found')
      return res.redirect('/admin/users')
    }
    res.render('users/form', { title: 'Edit User', user })
  } catch (error) {
    req.flash('error', 'Error loading user')
    res.redirect('/admin/users')
  }
}

exports.update = async (req, res) => {
  try {
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
    const user = await User.findById(req.params.id)
    if (user) {
      user.isActive = false
      await user.save()
      req.flash('success', 'User deactivated')
    }
    res.redirect('/admin/users')
  } catch (error) {
    req.flash('error', 'Error deactivating user')
    res.redirect('/admin/users')
  }
}
