const Job = require('../models/Job')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const User = require('../models/User')
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

    res.render('jobs/form', {
      title: 'New Job',
      job: null,
      customers,
      products,
      salesReps,
      installers
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

    res.render('jobs/sale-form', {
      title: 'New Sale',
      job: null,
      customers,
      products,
      salesReps,
      installers
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

    res.render('jobs/form', {
      title: 'Edit Job',
      job,
      customers,
      products,
      salesReps,
      installers
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
