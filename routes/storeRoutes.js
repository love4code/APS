const express = require('express')
const router = express.Router()
const storeController = require('../controllers/storeController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, storeController.list)
router.get('/new', requireAuth, storeController.newForm)
router.post('/', requireAuth, storeController.create)
router.get('/:id/edit', requireAuth, storeController.editForm)
router.post('/:id', requireAuth, storeController.update)
router.post('/:id/regenerate-token', requireAuth, storeController.regenerateToken)
router.post('/:id/delete', requireAuth, storeController.delete)

module.exports = router

