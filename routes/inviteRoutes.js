const express = require('express')
const router = express.Router()
const inviteController = require('../controllers/inviteController')

// Public routes - no authentication required
router.get('/accept', inviteController.acceptInvite)
router.post('/accept', inviteController.processAcceptance)

module.exports = router
