const express = require('express')
const router = express.Router()
const payPeriodController = require('../controllers/payPeriodController')
const { requireAuth } = require('../middleware/auth')

// All routes require authentication
router.use(requireAuth)

router.get('/', payPeriodController.list)
router.get('/new', payPeriodController.newForm)
router.post('/', payPeriodController.create)
router.get('/:id', payPeriodController.detail)
router.post('/:id/lock', payPeriodController.lock)
router.post('/:id/process', payPeriodController.process)

module.exports = router

