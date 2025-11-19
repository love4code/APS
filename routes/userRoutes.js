const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.get('/new', requireAuth, requireAdmin, userController.newForm)
router.get('/', requireAuth, requireAdmin, userController.list)
router.post('/', requireAuth, requireAdmin, userController.create)
router.get('/:id/edit', requireAuth, requireAdmin, userController.editForm)
router.post('/:id', requireAuth, requireAdmin, userController.update)
router.post(
  '/:id/deactivate',
  requireAuth,
  requireAdmin,
  userController.deactivate
)
router.post('/:id/delete', requireAuth, requireAdmin, userController.delete)

module.exports = router
