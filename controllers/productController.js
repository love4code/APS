const Product = require('../models/Product')

exports.list = async (req, res) => {
  try {
    const products = await Product.find().sort({ type: 1, name: 1 })
    res.render('products/list', { title: 'Products & Services', products })
  } catch (error) {
    req.flash('error', 'Error loading products')
    res.redirect('/')
  }
}

exports.newForm = (req, res) => {
  res.render('products/form', { title: 'New Product/Service', product: null })
}

exports.create = async (req, res) => {
  try {
    const { name, description, basePrice, isTaxable, type } = req.body

    if (!name || !basePrice || !type) {
      req.flash('error', 'Name, base price, and type are required')
      return res.redirect('/products/new')
    }

    await Product.create({
      name,
      description: description || '',
      basePrice: parseFloat(basePrice),
      isTaxable: isTaxable === 'on',
      type
    })

    req.flash('success', 'Product/Service created successfully')
    res.redirect('/products')
  } catch (error) {
    req.flash('error', error.message || 'Error creating product')
    res.redirect('/products/new')
  }
}

exports.editForm = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      req.flash('error', 'Product not found')
      return res.redirect('/products')
    }
    res.render('products/form', { title: 'Edit Product/Service', product })
  } catch (error) {
    req.flash('error', 'Error loading product')
    res.redirect('/products')
  }
}

exports.update = async (req, res) => {
  try {
    const { name, description, basePrice, isTaxable, type } = req.body

    if (!name || !basePrice || !type) {
      req.flash('error', 'Name, base price, and type are required')
      return res.redirect(`/products/${req.params.id}/edit`)
    }

    await Product.findByIdAndUpdate(req.params.id, {
      name,
      description: description || '',
      basePrice: parseFloat(basePrice),
      isTaxable: isTaxable === 'on',
      type
    })

    req.flash('success', 'Product/Service updated successfully')
    res.redirect('/products')
  } catch (error) {
    req.flash('error', error.message || 'Error updating product')
    res.redirect(`/products/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    req.flash('success', 'Product/Service deleted successfully')
    res.redirect('/products')
  } catch (error) {
    req.flash('error', 'Error deleting product')
    res.redirect('/products')
  }
}
