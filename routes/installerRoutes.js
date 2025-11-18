const express = require('express')
const router = express.Router()
const installerController = require('../controllers/installerController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, installerController.list)
router.get('/:id', requireAuth, installerController.detail)

module.exports = router
