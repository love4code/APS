const express = require('express')
const router = express.Router()
const percentagePayoutController = require('../controllers/percentagePayoutController')
const { requireAuth } = require('../middleware/auth')

// All routes require authentication
router.use(requireAuth)

router.get('/calculate-form', percentagePayoutController.calculateForm)
router.post('/calculate', percentagePayoutController.calculate)
router.get('/weekly', percentagePayoutController.weekly)
router.get('/', percentagePayoutController.list)
router.get('/:id', percentagePayoutController.detail)
router.post('/:id/delete', percentagePayoutController.delete)

module.exports = router

