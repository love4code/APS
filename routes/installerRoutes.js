const express = require('express')
const router = express.Router()
const installerController = require('../controllers/installerController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, installerController.list)
router.get('/:id', requireAuth, installerController.detail)
router.post(
  '/:id/regenerate-token',
  requireAuth,
  installerController.regenerateToken
)
router.post('/:id/send-invite', requireAuth, installerController.sendInvite)

module.exports = router
