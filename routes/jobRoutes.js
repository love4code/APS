const express = require('express')
const router = express.Router()
const jobController = require('../controllers/jobController')
const { requireAuth } = require('../middleware/auth')

// Personal views (mounted at /my)
router.get('/sales', requireAuth, jobController.mySales)
router.get('/installs', requireAuth, jobController.myInstalls)

// Job CRUD (mounted at /jobs)
router.get('/', requireAuth, jobController.list)
router.get('/new', requireAuth, jobController.newForm)
router.post('/', requireAuth, jobController.create)
router.get('/:id', requireAuth, jobController.detail)
router.get('/:id/edit', requireAuth, jobController.editForm)
router.post('/:id', requireAuth, jobController.update)
router.post('/:id/status', requireAuth, jobController.updateStatus)
router.post('/:id/payment', requireAuth, jobController.updatePayment)

module.exports = router
