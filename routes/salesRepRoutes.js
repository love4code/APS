const express = require('express')
const router = express.Router()
const salesRepController = require('../controllers/salesRepController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, salesRepController.list)
router.get('/:id', requireAuth, salesRepController.detail)

module.exports = router

