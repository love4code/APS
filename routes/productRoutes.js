const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, productController.list)
router.get('/new', requireAuth, productController.newForm)
router.post('/', requireAuth, productController.create)
router.get('/:id/edit', requireAuth, productController.editForm)
router.post('/:id', requireAuth, productController.update)
router.post('/:id/delete', requireAuth, productController.delete)

module.exports = router
