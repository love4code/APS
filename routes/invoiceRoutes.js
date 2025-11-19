const express = require('express')
const router = express.Router()
const invoiceController = require('../controllers/invoiceController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, invoiceController.list)
router.get('/new', requireAuth, invoiceController.newForm)
router.post('/', requireAuth, invoiceController.create)
// Invoice actions (must be before /:id routes)
router.get('/:id/invoice', requireAuth, invoiceController.downloadInvoice)
router.post('/:id/invoice/send', requireAuth, invoiceController.sendInvoice)
router.post('/:id/paid', requireAuth, invoiceController.markPaid)
router.post('/:id/delete', requireAuth, invoiceController.delete)
// Invoice detail and edit routes
router.get('/:id', requireAuth, invoiceController.detail)
router.get('/:id/edit', requireAuth, invoiceController.editForm)
router.post('/:id', requireAuth, invoiceController.update)

module.exports = router

