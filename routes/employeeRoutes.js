const express = require('express')
const router = express.Router()
const employeeController = require('../controllers/employeeController')
const { requireAuth } = require('../middleware/auth')

// All routes require authentication
router.use(requireAuth)

router.get('/', employeeController.list)
router.get('/new', employeeController.newForm)
router.post('/', employeeController.create)
router.get('/:id', employeeController.detail)
router.get('/:id/edit', employeeController.editForm)
router.post('/:id', employeeController.update)
router.post('/:id/archive', employeeController.archive)
router.post('/:id/delete', employeeController.delete)

module.exports = router

