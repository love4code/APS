const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customerController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, customerController.list)
router.get('/new', requireAuth, customerController.newForm)
router.post('/', requireAuth, customerController.create)
router.get('/:id', requireAuth, customerController.detail)
router.get('/:id/edit', requireAuth, customerController.editForm)
router.post('/:id', requireAuth, customerController.update)
router.post('/:id/delete', requireAuth, customerController.delete)

module.exports = router
