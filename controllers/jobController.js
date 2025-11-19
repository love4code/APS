const Job = require('../models/Job')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const User = require('../models/User')
const Store = require('../models/Store')
const ActivityLog = require('../models/ActivityLog')

exports.list = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('items.product')
      .sort({ createdAt: -1 })

    res.render('jobs/list', { title: 'All Jobs', jobs, user: req.user })
  } catch (error) {
    req.flash('error', 'Error loading jobs')
    res.redirect('/')
  }
}

exports.newForm = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 })
    const products = await Product.find({ isActive: true }).sort({
      type: 1,
      name: 1
    })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    res.render('jobs/form', {
      title: 'New Job',
      job: null,
      customers,
      products,
      salesReps,
      installers,
      stores
    })
  } catch (error) {
    req.flash('error', 'Error loading form data')
    res.redirect('/jobs')
  }
}

exports.newSaleForm = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 })
    const products = await Product.find({ isActive: true }).sort({
      type: 1,
      name: 1
    })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    res.render('jobs/sale-form', {
      title: 'New Sale',
      job: null,
      customers,
      products,
      salesReps,
      installers,
      stores
    })
  } catch (error) {
    req.flash('error', 'Error loading form data')
    res.redirect('/jobs')
  }
}

exports.create = async (req, res) => {
  try {
    const {
      customer,
      salesRep,
      soldByOwner,
      installer,
      store,
      installDate,
      status,
      notes,
      items,
      installCost
    } = req.body

    // Determine if this is coming from sale form or job form
    const isSaleForm = req.originalUrl && req.originalUrl.includes('/sales')

    if (!customer) {
      req.flash('error', 'Customer is required')
      return res.redirect(isSaleForm ? '/sales/new' : '/jobs/new')
    }

    // Parse items if it's a string
    let itemsArray = []
    if (items) {
      if (typeof items === 'string') {
        try {
          itemsArray = JSON.parse(items)
        } catch (e) {
          console.error('Error parsing items JSON:', e)
          itemsArray = []
        }
      } else if (Array.isArray(items)) {
        itemsArray = items
      }
    }

    // Filter out invalid items and ensure all required fields are present
    const validItems = itemsArray
      .filter(item => {
        // Check if item has all required fields and they're valid
        if (!item || !item.productId) return false

        const qty = parseInt(item.quantity)
        const price = parseFloat(item.unitPrice)

        return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0
      })
      .map(item => ({
        product: item.productId,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        isTaxable: item.isTaxable === 'true' || item.isTaxable === true
      }))

    // Validate that we have at least one valid item (only if items were provided)
    if (items && itemsArray.length > 0 && validItems.length === 0) {
      req.flash('error', 'Please add at least one valid product to the sale.')
      return res.redirect(isSaleForm ? '/sales/new' : '/jobs/new')
    }

    const job = new Job({
      customer,
      salesRep: salesRep || null,
      soldByOwner: soldByOwner === 'on' || soldByOwner === 'true',
      isSale: isSaleForm, // Mark as sale if created from sale form
      installer: installer || null,
      store: store || null,
      installDate: installDate || null,
      status: status || 'scheduled',
      notes: notes || '',
      installCost: installCost ? parseFloat(installCost) : 0,
      createdBy: req.user._id,
      items: validItems
    })

    job.recalculateTotals()
    await job.save()

    // Log activity
    await ActivityLog.create({
      job: job._id,
      user: req.user._id,
      action: 'created',
      details: 'Job created'
    })

    req.flash('success', 'Job created successfully')
    res.redirect(`/jobs/${job._id}`)
  } catch (error) {
    console.error('Create job error:', error)
    req.flash('error', error.message || 'Error creating job')
    // Determine redirect based on where the request came from
    const isSaleForm = req.originalUrl && req.originalUrl.includes('/sales')
    res.redirect(isSaleForm ? '/sales/new' : '/jobs/new')
  }
}

exports.detail = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer')
      .populate('salesRep', 'name email')
      .populate('installer', 'name email')
      .populate('store', 'name')
      .populate('createdBy', 'name')
      .populate('items.product')

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    const activities = await ActivityLog.find({ job: job._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(20)

    res.render('jobs/detail', {
      title: `Job #${job._id.toString().slice(-6)}`,
      job,
      activities,
      user: req.user
    })
  } catch (error) {
    req.flash('error', 'Error loading job')
    res.redirect('/jobs')
  }
}

exports.editForm = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('items.product')

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    const customers = await Customer.find().sort({ name: 1 })
    const products = await Product.find({ isActive: true }).sort({
      type: 1,
      name: 1
    })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    res.render('jobs/form', {
      title: 'Edit Job',
      job,
      customers,
      products,
      salesReps,
      installers,
      stores
    })
  } catch (error) {
    req.flash('error', 'Error loading job')
    res.redirect('/jobs')
  }
}

exports.update = async (req, res) => {
  try {
    const {
      customer,
      salesRep,
      soldByOwner,
      installer,
      store,
      installDate,
      status,
      notes,
      items,
      installCost
    } = req.body

    const job = await Job.findById(req.params.id)
    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    // Parse items
    let itemsArray = []
    if (items) {
      if (typeof items === 'string') {
        try {
          itemsArray = JSON.parse(items)
        } catch (e) {
          console.error('Error parsing items JSON:', e)
          itemsArray = []
        }
      } else if (Array.isArray(items)) {
        itemsArray = items
      }
    }

    // Filter out invalid items and ensure all required fields are present
    const validItems = itemsArray
      .filter(item => {
        // Check if item has all required fields and they're valid
        if (!item || !item.productId) return false

        const qty = parseInt(item.quantity)
        const price = parseFloat(item.unitPrice)

        return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0
      })
      .map(item => ({
        product: item.productId,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        isTaxable: item.isTaxable === 'true' || item.isTaxable === true
      }))

    // Validate that we have at least one valid item (only if items were provided)
    if (items && itemsArray.length > 0 && validItems.length === 0) {
      req.flash('error', 'Please add at least one valid product to the job.')
      return res.redirect(`/jobs/${req.params.id}/edit`)
    }

    job.customer = customer
    job.salesRep = salesRep || null
    job.soldByOwner = soldByOwner === 'on' || soldByOwner === 'true'
    job.installer = installer || null
    job.store = store || null
    job.installDate = installDate || null
    job.status = status || 'scheduled'
    job.notes = notes || ''
    job.installCost = installCost ? parseFloat(installCost) : 0
    job.items = validItems

    job.recalculateTotals()
    await job.save()

    // Log activity
    await ActivityLog.create({
      job: job._id,
      user: req.user._id,
      action: 'updated',
      details: 'Job updated'
    })

    req.flash('success', 'Job updated successfully')
    res.redirect(`/jobs/${job._id}`)
  } catch (error) {
    console.error('Update job error:', error)
    req.flash('error', error.message || 'Error updating job')
    res.redirect(`/jobs/${req.params.id}/edit`)
  }
}

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    const job = await Job.findById(req.params.id)

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    job.status = status
    await job.save()

    // Log activity
    await ActivityLog.create({
      job: job._id,
      user: req.user._id,
      action: 'status_updated',
      details: `Status changed to ${status}`
    })

    req.flash('success', 'Job status updated')
    res.redirect(`/jobs/${job._id}`)
  } catch (error) {
    req.flash('error', 'Error updating status')
    res.redirect('/jobs')
  }
}

exports.updatePayment = async (req, res) => {
  try {
    const { isPaid, datePaid } = req.body
    const job = await Job.findById(req.params.id)

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    job.isPaid = isPaid === 'on' || isPaid === 'true'
    job.datePaid = datePaid || (job.isPaid ? new Date() : null)
    await job.save()

    // Log activity
    await ActivityLog.create({
      job: job._id,
      user: req.user._id,
      action: 'payment_updated',
      details: job.isPaid
        ? `Marked as paid on ${job.datePaid}`
        : 'Marked as unpaid'
    })

    req.flash('success', 'Payment status updated')
    res.redirect(`/jobs/${job._id}`)
  } catch (error) {
    req.flash('error', 'Error updating payment')
    res.redirect('/jobs')
  }
}

exports.mySales = async (req, res) => {
  try {
    const jobs = await Job.find({
      $or: [
        { salesRep: req.user._id },
        { soldByOwner: true, createdBy: req.user._id }
      ]
    })
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('items.product')
      .sort({ createdAt: -1 })

    res.render('jobs/list', {
      title: 'My Sales',
      jobs,
      user: req.user,
      isPersonalView: true
    })
  } catch (error) {
    req.flash('error', 'Error loading your sales')
    res.redirect('/')
  }
}

exports.myInstalls = async (req, res) => {
  try {
    const jobs = await Job.find({ installer: req.user._id })
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('items.product')
      .sort({ installDate: 1, createdAt: -1 })

    res.render('jobs/list', {
      title: 'My Installs',
      jobs,
      user: req.user,
      isPersonalView: true
    })
  } catch (error) {
    req.flash('error', 'Error loading your installs')
    res.redirect('/')
  }
}

// Calendar view
exports.calendar = async (req, res) => {
  try {
    // Get all jobs with install dates
    const jobs = await Job.find({ installDate: { $exists: true, $ne: null } })
      .populate('customer', 'name')
      .populate('store', 'name')
      .populate('installer', 'name')
      .populate('salesRep', 'name')
      .sort({ installDate: 1 })

    // Get all stores to generate color mapping
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    // Generate color palette for stores
    const colors = [
      '#0d6efd', // Blue
      '#198754', // Green
      '#dc3545', // Red
      '#ffc107', // Yellow
      '#6f42c1', // Purple
      '#fd7e14', // Orange
      '#20c997', // Teal
      '#e83e8c', // Pink
      '#6610f2', // Indigo
      '#0dcaf0', // Cyan
      '#198754', // Success green
      '#ffc107', // Warning yellow
      '#dc3545', // Danger red
      '#0d6efd', // Primary blue
      '#6c757d'  // Secondary gray
    ]

    // Create store color mapping
    const storeColorMap = {}
    stores.forEach((store, index) => {
      storeColorMap[store._id.toString()] = colors[index % colors.length]
    })

    res.render('jobs/calendar', {
      title: 'Job Calendar',
      jobs,
      stores,
      storeColorMap
    })
  } catch (error) {
    console.error('Calendar error:', error)
    req.flash('error', 'Error loading calendar')
    res.redirect('/jobs')
  }
}

// API endpoint for calendar events (JSON)
exports.calendarEvents = async (req, res) => {
  try {
    const jobs = await Job.find({ installDate: { $exists: true, $ne: null } })
      .populate('customer', 'name')
      .populate('store', 'name')
      .populate('installer', 'name')
      .populate('salesRep', 'name')
      .sort({ installDate: 1 })

    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    const colors = [
      '#0d6efd', '#198754', '#dc3545', '#ffc107', '#6f42c1',
      '#fd7e14', '#20c997', '#e83e8c', '#6610f2', '#0dcaf0',
      '#198754', '#ffc107', '#dc3545', '#0d6efd', '#6c757d'
    ]

    const storeColorMap = {}
    stores.forEach((store, index) => {
      storeColorMap[store._id.toString()] = colors[index % colors.length]
    })

    // Format events for FullCalendar
    const events = jobs.map(job => {
      const storeId = job.store ? job.store._id.toString() : 'no-store'
      const color = job.store ? storeColorMap[storeId] : '#6c757d' // Gray for jobs without store
      
      return {
        id: job._id.toString(),
        title: `${job.customer ? job.customer.name : 'Unknown Customer'}${job.store ? ' - ' + job.store.name : ''}`,
        start: job.installDate.toISOString().split('T')[0],
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          jobId: job._id.toString(),
          customer: job.customer ? job.customer.name : 'Unknown',
          store: job.store ? job.store.name : 'No Store',
          installer: job.installer ? job.installer.name : 'Not assigned',
          salesRep: job.soldByOwner ? 'Owner' : (job.salesRep ? job.salesRep.name : 'N/A'),
          status: job.status,
          totalPrice: job.totalPrice || 0
        }
      }
    })

    res.json(events)
  } catch (error) {
    console.error('Calendar events error:', error)
    res.status(500).json({ error: 'Error loading calendar events' })
  }
}
