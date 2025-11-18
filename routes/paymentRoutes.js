const express = require('express')
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, paymentController.list)
router.get('/new', requireAuth, paymentController.newForm)
router.post('/', requireAuth, paymentController.create)
router.get('/:id', requireAuth, paymentController.detail)
router.get('/:id/edit', requireAuth, paymentController.editForm)
router.post('/:id', requireAuth, paymentController.update)
router.post('/:id/delete', requireAuth, paymentController.delete)

module.exports = router

