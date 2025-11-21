const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const jobController = require('../controllers/jobController')
const { requireAuth } = require('../middleware/auth')

// Configure multer for job image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'jobs', 'temp')
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Generate unique filename: job-image-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, 'job-image-' + uniqueSuffix + ext)
  }
})

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    req.fileValidationError = 'Only image files are allowed (PNG, JPG, GIF, etc.)'
    cb(null, false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
})

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
// Image routes (must be before /:id routes)
router.post('/:id/images/upload', requireAuth, (req, res, next) => {
  upload.array('images', 20)(req, res, (err) => {
    // Check if this is an AJAX request
    const isAjax = req.xhr ||
                   req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                   req.headers.accept?.indexOf('json') > -1;

    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          if (isAjax) {
            return res.status(400).json({ error: 'File is too large. Maximum size is 10MB per file.' })
          }
          req.flash('error', 'One or more files are too large. Maximum size is 10MB per file.')
          return res.redirect(`/jobs/${req.params.id}`)
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          if (isAjax) {
            return res.status(400).json({ error: 'Too many files. Maximum 20 files per upload.' })
          }
          req.flash('error', 'Too many files. Maximum 20 files per upload.')
          return res.redirect(`/jobs/${req.params.id}`)
        } else {
          if (isAjax) {
            return res.status(400).json({ error: 'Error uploading files: ' + err.message })
          }
          req.flash('error', 'Error uploading files: ' + err.message)
          return res.redirect(`/jobs/${req.params.id}`)
        }
      } else if (req.fileValidationError) {
        if (isAjax) {
          return res.status(400).json({ error: req.fileValidationError })
        }
        req.flash('error', req.fileValidationError)
        return res.redirect(`/jobs/${req.params.id}`)
      } else {
        if (isAjax) {
          return res.status(400).json({ error: err.message || 'Error uploading files' })
        }
        req.flash('error', err.message || 'Error uploading files')
        return res.redirect(`/jobs/${req.params.id}`)
      }
    }
    if (!req.files || req.files.length === 0) {
      if (isAjax) {
        return res.status(400).json({ error: 'No image files uploaded' })
      }
      req.flash('error', 'No image files uploaded')
      return res.redirect(`/jobs/${req.params.id}`)
    }
    next()
  })
}, jobController.uploadImage)
router.get('/:id/images', requireAuth, jobController.imageLibrary)
router.post('/:id/images/:imageId/delete', requireAuth, jobController.deleteImage)

// Job detail and edit routes
router.get('/:id', requireAuth, jobController.detail)
router.get('/:id/edit', requireAuth, jobController.editForm)
router.post('/:id', requireAuth, jobController.update)
router.post('/:id/status', requireAuth, jobController.updateStatus)
router.post('/:id/payment', requireAuth, jobController.updatePayment)
router.post('/:id/delete', requireAuth, jobController.delete)

module.exports = router
