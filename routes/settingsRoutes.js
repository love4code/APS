const express = require('express')
const router = express.Router()
const multer = require('multer')
const settingsController = require('../controllers/settingsController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, settingsController.getSettings)
router.post('/', requireAuth, (req, res, next) => {
  settingsController.upload(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          req.flash('error', 'File too large. Maximum size is 5MB.')
        } else {
          req.flash('error', 'Error uploading file: ' + err.message)
        }
      } else {
        req.flash('error', err.message || 'Error uploading file')
      }
      return res.redirect('/settings')
    }
    next()
  })
}, settingsController.updateSettings)

module.exports = router
