const express = require('express')
const router = express.Router()
const timeEntryController = require('../controllers/timeEntryController')
const { requireAuth } = require('../middleware/auth')

// All routes require authentication
router.use(requireAuth)

router.get('/', timeEntryController.list)
router.get('/new', timeEntryController.newForm)
router.post('/', timeEntryController.create)
router.get('/:id', timeEntryController.detail)
router.get('/:id/edit', timeEntryController.editForm)
router.post('/:id', timeEntryController.update)
router.post('/:id/approve', timeEntryController.approve)

module.exports = router

