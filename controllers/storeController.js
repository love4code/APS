const Store = require('../models/Store')

// List all stores
exports.list = async (req, res) => {
  try {
    const stores = await Store.find().sort({ name: 1 })
    
    // Ensure all stores have share tokens
    for (const store of stores) {
      if (!store.calendarShareToken) {
        await store.save() // This will trigger the pre-save hook to generate token
      }
    }
    
    // Re-fetch to get updated tokens
    const updatedStores = await Store.find().sort({ name: 1 })

    // Generate base URL for share links
    const baseUrl = req.protocol + '://' + req.get('host')
    
    res.render('stores/list', {
      title: 'Stores',
      stores: updatedStores,
      baseUrl
    })
  } catch (error) {
    console.error('Store list error:', error)
    req.flash('error', 'Error loading stores')
    res.redirect('/')
  }
}

// Show form to create new store
exports.newForm = async (req, res) => {
  try {
    res.render('stores/form', {
      title: 'New Store',
      store: null
    })
  } catch (error) {
    console.error('Store new form error:', error)
    req.flash('error', 'Error loading form')
    res.redirect('/stores')
  }
}

// Create new store
exports.create = async (req, res) => {
  try {
    const { name, address, city, state, zipCode, phone, email, notes, isActive } = req.body

    if (!name || !name.trim()) {
      req.flash('error', 'Store name is required')
      return res.redirect('/stores/new')
    }

    const store = new Store({
      name: name.trim(),
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      zipCode: zipCode ? zipCode.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      notes: notes ? notes.trim() : '',
      isActive: isActive === 'on' || isActive === true
    })

    await store.save()

    req.flash('success', 'Store created successfully')
    res.redirect('/stores')
  } catch (error) {
    console.error('Create store error:', error)
    req.flash('error', error.message || 'Error creating store')
    res.redirect('/stores/new')
  }
}

// Show form to edit store
exports.editForm = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)

    if (!store) {
      req.flash('error', 'Store not found')
      return res.redirect('/stores')
    }

    res.render('stores/form', {
      title: 'Edit Store',
      store
    })
  } catch (error) {
    console.error('Store edit form error:', error)
    req.flash('error', 'Error loading store')
    res.redirect('/stores')
  }
}

// Update store
exports.update = async (req, res) => {
  try {
    const { name, address, city, state, zipCode, phone, email, notes, isActive, regenerateToken } = req.body

    const store = await Store.findById(req.params.id)

    if (!store) {
      req.flash('error', 'Store not found')
      return res.redirect('/stores')
    }

    if (!name || !name.trim()) {
      req.flash('error', 'Store name is required')
      return res.redirect(`/stores/${req.params.id}/edit`)
    }

    store.name = name.trim()
    store.address = address ? address.trim() : ''
    store.city = city ? city.trim() : ''
    store.state = state ? state.trim() : ''
    store.zipCode = zipCode ? zipCode.trim() : ''
    store.phone = phone ? phone.trim() : ''
    store.email = email ? email.trim() : ''
    store.notes = notes ? notes.trim() : ''
    store.isActive = isActive === 'on' || isActive === true
    
    // Regenerate share token if requested
    if (regenerateToken === 'on' || regenerateToken === 'true') {
      const crypto = require('crypto')
      store.calendarShareToken = crypto.randomBytes(32).toString('hex')
    }

    await store.save()

    req.flash('success', 'Store updated successfully')
    res.redirect('/stores')
  } catch (error) {
    console.error('Update store error:', error)
    req.flash('error', error.message || 'Error updating store')
    res.redirect(`/stores/${req.params.id}/edit`)
  }
}

// Regenerate share token
exports.regenerateToken = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
    if (!store) {
      req.flash('error', 'Store not found')
      return res.redirect('/stores')
    }
    
    const crypto = require('crypto')
    store.calendarShareToken = crypto.randomBytes(32).toString('hex')
    await store.save()
    
    req.flash('success', 'Calendar share token regenerated. Old links will no longer work.')
    res.redirect('/stores')
  } catch (error) {
    console.error('Regenerate token error:', error)
    req.flash('error', 'Error regenerating token')
    res.redirect('/stores')
  }
}

// Delete store
exports.delete = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)

    if (!store) {
      req.flash('error', 'Store not found')
      return res.redirect('/stores')
    }

    await Store.findByIdAndDelete(req.params.id)

    req.flash('success', 'Store deleted successfully')
    res.redirect('/stores')
  } catch (error) {
    console.error('Delete store error:', error)
    req.flash('error', 'Error deleting store')
    res.redirect('/stores')
  }
}

