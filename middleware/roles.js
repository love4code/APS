// Middleware to check if user is sales rep
exports.requireSalesRep = (req, res, next) => {
  if (!req.user || !req.user.isSalesRep) {
    req.flash('error', 'Access denied. Sales rep privileges required.')
    return res.redirect('/')
  }
  next()
}

// Middleware to check if user is installer
exports.requireInstaller = (req, res, next) => {
  if (!req.user || !req.user.isInstaller) {
    req.flash('error', 'Access denied. Installer privileges required.')
    return res.redirect('/')
  }
  next()
}
