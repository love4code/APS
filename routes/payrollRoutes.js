const express = require('express')
const router = express.Router()
const payrollController = require('../controllers/payrollController')
const { requireAuth } = require('../middleware/auth')

// All routes require authentication
router.use(requireAuth)

router.get('/', payrollController.list)
router.get('/:id', payrollController.detail)
router.post('/:id/mark-paid', payrollController.markPaid)
router.get('/export/csv', payrollController.exportCSV)

module.exports = router

