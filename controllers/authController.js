const User = require('../models/User')

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
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    })

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

    req.session.userId = user._id.toString()
    req.flash('success', `Welcome back, ${user.name}!`)
    res.redirect('/')
  } catch (error) {
    console.error('Login error:', error)
    res.render('auth/login', {
      title: 'Login',
      error: 'An error occurred. Please try again.'
    })
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
