const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')
const { requireAuth } = require('../middleware/auth')

// Add error handling wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

router.get('/', requireAuth, asyncHandler(dashboardController.getDashboard))

module.exports = router
