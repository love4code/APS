const express = require('express')
const router = express.Router()
const jobController = require('../controllers/jobController')
const { requireAuth } = require('../middleware/auth')

// Sales routes
router.get('/', requireAuth, jobController.salesList) // List all sales
router.get('/new', requireAuth, jobController.newSaleForm)
router.post('/', requireAuth, jobController.create) // Creates job, redirects to job detail

module.exports = router
