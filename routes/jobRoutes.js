const express = require('express')
const router = express.Router()
const jobController = require('../controllers/jobController')
const { requireAuth } = require('../middleware/auth')

// Personal views (mounted at /my)
router.get('/sales', requireAuth, jobController.mySales)
router.get('/installs', requireAuth, jobController.myInstalls)

// Job CRUD (mounted at /jobs)
router.get('/', requireAuth, jobController.list)
router.get('/calendar', requireAuth, jobController.calendar)
router.get('/calendar/events', jobController.calendarEvents) // Public for shared calendars
router.get('/calendar/shared', jobController.sharedCalendar) // Public shared calendar
router.get('/new', requireAuth, jobController.newForm)
router.post('/', requireAuth, jobController.create)
// API route for job details (public for calendar modals)
router.get('/:id/details', jobController.getJobDetails)
// Invoice routes (must be before /:id routes)
router.get('/:id/invoice', requireAuth, jobController.downloadInvoice)
router.post('/:id/invoice/send', requireAuth, jobController.sendInvoice)
// Job detail and edit routes
router.get('/:id', requireAuth, jobController.detail)
router.get('/:id/edit', requireAuth, jobController.editForm)
router.post('/:id', requireAuth, jobController.update)
router.post('/:id/status', requireAuth, jobController.updateStatus)
router.post('/:id/payment', requireAuth, jobController.updatePayment)
router.post('/:id/delete', requireAuth, jobController.delete)

module.exports = router
