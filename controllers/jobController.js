const mongoose = require('mongoose')
const Job = require('../models/Job')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const User = require('../models/User')
const Store = require('../models/Store')
const ActivityLog = require('../models/ActivityLog')
const JobImage = require('../models/JobImage')
const invoiceService = require('../services/invoiceService')
const emailService = require('../services/emailService')
const imageService = require('../services/imageService')

exports.list = async (req, res) => {
  try {
    // Exclude sales from jobs list - only show actual jobs
    const jobs = await Job.find({ isSale: { $ne: true } })
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

exports.salesList = async (req, res) => {
  try {
    // Only show sales
    const sales = await Job.find({ isSale: true })
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('items.product')
      .sort({ createdAt: -1 })

    res.render('sales/list', { title: 'All Sales', sales, user: req.user })
  } catch (error) {
    req.flash('error', 'Error loading sales')
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

    // Check if creating from a customer
    const customerId = req.query.customerId || null
    let selectedCustomer = null
    if (customerId) {
      selectedCustomer = await Customer.findById(customerId)
    }

    res.render('jobs/form', {
      title: 'New Job',
      job: null,
      customers,
      products,
      salesReps,
      installers,
      stores,
      selectedCustomer,
      customerId: customerId
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

    // Check if creating from a customer
    const customerId = req.query.customerId || null
    let selectedCustomer = null
    if (customerId) {
      selectedCustomer = await Customer.findById(customerId)
    }

    res.render('jobs/sale-form', {
      title: 'New Sale',
      job: null,
      customers,
      products,
      salesReps,
      installers,
      stores,
      selectedCustomer,
      customerId: customerId
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
      orderDate,
      deliveryDate,
      invoicedDate,
      status,
      notes,
      internalNotes,
      items,
      installCost
    } = req.body

    // Determine if this is coming from sale form or job form
    const isSaleForm = req.originalUrl && req.originalUrl.includes('/sales')

    if (!customer) {
      req.flash('error', 'Customer is required')
      const customerId = req.query.customerId || req.body.customerId
      const redirectUrl = isSaleForm ? '/sales/new' : '/jobs/new'
      if (customerId) {
        return res.redirect(`${redirectUrl}?customerId=${customerId}`)
      }
      return res.redirect(redirectUrl)
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
      const customerId = req.query.customerId || req.body.customerId
      const redirectUrl = isSaleForm ? '/sales/new' : '/jobs/new'
      if (customerId) {
        return res.redirect(`${redirectUrl}?customerId=${customerId}`)
      }
      return res.redirect(redirectUrl)
    }

    // Parse dates to avoid timezone issues
    // Date inputs send YYYY-MM-DD format, we need to parse them as UTC dates at midnight
    let parsedInstallDate = null
    let parsedOrderDate = null
    let parsedDeliveryDate = null
    let parsedInvoicedDate = null

    if (
      installDate &&
      typeof installDate === 'string' &&
      installDate.trim() !== ''
    ) {
      // Parse as UTC date at midnight to avoid timezone conversion
      const [year, month, day] = installDate.split('-').map(Number)
      parsedInstallDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (orderDate && typeof orderDate === 'string' && orderDate.trim() !== '') {
      const [year, month, day] = orderDate.split('-').map(Number)
      parsedOrderDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (
      deliveryDate &&
      typeof deliveryDate === 'string' &&
      deliveryDate.trim() !== ''
    ) {
      const [year, month, day] = deliveryDate.split('-').map(Number)
      parsedDeliveryDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (
      invoicedDate &&
      typeof invoicedDate === 'string' &&
      invoicedDate.trim() !== ''
    ) {
      const [year, month, day] = invoicedDate.split('-').map(Number)
      parsedInvoicedDate = new Date(Date.UTC(year, month - 1, day))
    }

    const job = new Job({
      customer,
      salesRep: salesRep || null,
      soldByOwner: soldByOwner === 'on' || soldByOwner === 'true',
      isSale: isSaleForm, // Mark as sale if created from sale form
      installer: installer || null,
      store: store || null,
      installDate: parsedInstallDate,
      orderDate: parsedOrderDate,
      deliveryDate: parsedDeliveryDate,
      invoicedDate: parsedInvoicedDate,
      status: status || 'scheduled',
      notes: notes || '',
      internalNotes: internalNotes || '',
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

    // Check if we should redirect back to customer page
    const customerId =
      req.query.customerId ||
      req.body.customerId ||
      (job.customer ? job.customer.toString() : null)
    if (customerId) {
      return res.redirect(`/customers/${customerId}`)
    }

    res.redirect(`/jobs/${job._id}`)
  } catch (error) {
    console.error('Create job error:', error)
    req.flash('error', error.message || 'Error creating job')
    // Determine redirect based on where the request came from
    const isSaleForm = req.originalUrl && req.originalUrl.includes('/sales')
    const customerId = req.query.customerId || req.body.customerId
    const redirectUrl = isSaleForm ? '/sales/new' : '/jobs/new'
    // Preserve customerId if it was provided
    if (customerId) {
      return res.redirect(`${redirectUrl}?customerId=${customerId}`)
    }
    res.redirect(redirectUrl)
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

    // Get all activities (we'll show 3 by default, with option to expand)
    const activities = await ActivityLog.find({ job: job._id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
    // No limit - fetch all, but display 3 by default with expand option

    // Get all images for this job
    // Use job._id directly (MongoDB will handle ObjectId conversion)
    const jobIdString = job._id.toString()
    const jobIdObjectId = job._id

    // Query for images - MongoDB automatically handles ObjectId references
    // Check which images have database-stored image data
    const allImages = await JobImage.find({ job: jobIdObjectId })
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 })

    // Filter out images that don't have database-stored image data
    // These are old images uploaded before we switched to database storage
    const images = []
    const imagesWithoutData = []

    for (const img of allImages) {
      // Check if image has database-stored data (new format)
      const hasImageData = img.thumbnailData || img.mediumData || img.largeData

      if (hasImageData) {
        // Exclude image data from the object for performance (we don't need it in the view)
        const imageObj = img.toObject()
        delete imageObj.thumbnailData
        delete imageObj.mediumData
        delete imageObj.largeData
        images.push(imageObj)
      } else {
        // Old image without database-stored data - skip it
        imagesWithoutData.push(img._id)
        console.warn(
          `[Job Detail] Skipping image ${img._id} - no database-stored image data (old format)`
        )
      }
    }

    // Debug: Log image count
    if (allImages.length > 0) {
      console.log(
        `[Job Detail] Found ${allImages.length} image record(s) in database for job ${jobIdString}, ${images.length} have database-stored data, ${imagesWithoutData.length} are old format (skipped)`
      )
    }

    // If there are old images, optionally delete them or show a message
    if (imagesWithoutData.length > 0) {
      console.warn(
        `[Job Detail] ${imagesWithoutData.length} old image(s) found without database-stored data. These images cannot be displayed.`
      )
    }

    res.render('jobs/detail', {
      title: `Job #${job._id.toString().slice(-6)}`,
      job,
      activities,
      images,
      missingImagesCount: 0,
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
      stores,
      selectedCustomer: null // Not needed for edit, but required by view
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
      orderDate,
      deliveryDate,
      invoicedDate,
      status,
      notes,
      internalNotes,
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

    // Parse dates to avoid timezone issues
    // Date inputs send YYYY-MM-DD format, we need to parse them as UTC dates at midnight
    let parsedInstallDate = null
    let parsedOrderDate = null
    let parsedDeliveryDate = null
    let parsedInvoicedDate = null

    if (
      installDate &&
      typeof installDate === 'string' &&
      installDate.trim() !== ''
    ) {
      // Parse as UTC date at midnight to avoid timezone conversion
      const [year, month, day] = installDate.split('-').map(Number)
      parsedInstallDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (orderDate && typeof orderDate === 'string' && orderDate.trim() !== '') {
      const [year, month, day] = orderDate.split('-').map(Number)
      parsedOrderDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (
      deliveryDate &&
      typeof deliveryDate === 'string' &&
      deliveryDate.trim() !== ''
    ) {
      const [year, month, day] = deliveryDate.split('-').map(Number)
      parsedDeliveryDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (
      invoicedDate &&
      typeof invoicedDate === 'string' &&
      invoicedDate.trim() !== ''
    ) {
      const [year, month, day] = invoicedDate.split('-').map(Number)
      parsedInvoicedDate = new Date(Date.UTC(year, month - 1, day))
    }

    job.customer = customer
    job.salesRep = salesRep || null
    job.soldByOwner = soldByOwner === 'on' || soldByOwner === 'true'
    job.installer = installer || null
    job.store = store || null
    job.installDate = parsedInstallDate
    job.orderDate = parsedOrderDate
    job.deliveryDate = parsedDeliveryDate
    job.invoicedDate = parsedInvoicedDate
    job.status = status || 'scheduled'
    job.notes = notes || ''
    job.internalNotes = internalNotes || ''
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

exports.delete = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)

    if (!job) {
      // Check if this is an AJAX request
      const isAjax =
        req.xhr ||
        req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'
      if (isAjax) {
        return res.status(404).json({ success: false, error: 'Job not found' })
      }
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    // Store customer ID for redirect
    const customerId = job.customer

    // Delete associated images
    await JobImage.deleteMany({ job: job._id })

    // Delete associated activity logs
    await ActivityLog.deleteMany({ job: job._id })

    // Delete the job
    await Job.findByIdAndDelete(req.params.id)

    // Check if this is an AJAX request
    const isAjax =
      req.xhr ||
      req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'

    if (isAjax) {
      return res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      })
    }

    req.flash('success', 'Job deleted successfully')

    // Redirect to customer page if customerId is provided, otherwise jobs list
    if (req.query.customerId || customerId) {
      res.redirect(`/customers/${req.query.customerId || customerId}`)
    } else {
      res.redirect('/jobs')
    }
  } catch (error) {
    console.error('Delete job error:', error)

    // Check if this is an AJAX request
    const isAjax =
      req.xhr ||
      req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'

    if (isAjax) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error deleting job'
      })
    }

    req.flash('error', 'Error deleting job')
    if (req.query.customerId) {
      res.redirect(`/customers/${req.query.customerId}`)
    } else {
      res.redirect('/jobs')
    }
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
    // Only show sales (isSale: true) for this user
    const jobs = await Job.find({
      isSale: true,
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
    // Exclude sales from installs - installers only install jobs, not sales
    const jobs = await Job.find({
      installer: req.user._id,
      isSale: { $ne: true }
    })
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
    // Get all jobs with install dates (exclude sales)
    const jobs = await Job.find({
      installDate: { $exists: true, $ne: null },
      isSale: { $ne: true } // Exclude sales
    })
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
      '#6c757d' // Secondary gray
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
    // Only show jobs (not sales) on calendar
    let query = {
      installDate: { $exists: true, $ne: null },
      isSale: { $ne: true } // Exclude sales
    }

    // Filter by store if token provided
    if (req.query.storeToken) {
      const store = await Store.findOne({
        calendarShareToken: req.query.storeToken
      })
      if (store) {
        query.store = store._id
      }
    }

    // Filter by installer if token provided
    if (req.query.installerToken) {
      const installer = await User.findOne({
        calendarShareToken: req.query.installerToken,
        isInstaller: true
      })
      if (installer) {
        query.installer = installer._id
      }
    }

    // Sales rep token shows ALL jobs (no filter) - they can see everything
    // We still validate the token but don't filter the query
    if (req.query.salesRepToken) {
      const salesRep = await User.findOne({
        calendarShareToken: req.query.salesRepToken,
        isSalesRep: true
      })
      if (!salesRep) {
        return res.status(403).json({ error: 'Invalid sales rep token' })
      }
      // No query filter - show all jobs
    }

    const jobs = await Job.find(query)
      .populate('customer', 'name')
      .populate('store', 'name')
      .populate('installer', 'name')
      .populate('salesRep', 'name')
      .sort({ installDate: 1 })

    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    const colors = [
      '#0d6efd',
      '#198754',
      '#dc3545',
      '#ffc107',
      '#6f42c1',
      '#fd7e14',
      '#20c997',
      '#e83e8c',
      '#6610f2',
      '#0dcaf0',
      '#198754',
      '#ffc107',
      '#dc3545',
      '#0d6efd',
      '#6c757d'
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
        title: `${job.customer ? job.customer.name : 'Unknown Customer'}${
          job.store ? ' - ' + job.store.name : ''
        }`,
        start: job.installDate.toISOString().split('T')[0],
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          jobId: job._id.toString(),
          customer: job.customer ? job.customer.name : 'Unknown',
          store: job.store ? job.store.name : 'No Store',
          installer: job.installer ? job.installer.name : 'Not assigned',
          salesRep: job.soldByOwner
            ? 'Owner'
            : job.salesRep
            ? job.salesRep.name
            : 'N/A',
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

// Get job details as JSON (for calendar modal)
exports.getJobDetails = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer', 'name phone email address')
      .populate('salesRep', 'name email')
      .populate('installer', 'name email')
      .populate('store', 'name')
      .populate('items.product', 'name description')

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // Format job data for display
    const jobData = {
      id: job._id.toString(),
      customer: job.customer
        ? {
            name: job.customer.name,
            phone: job.customer.phone || 'N/A',
            email: job.customer.email || 'N/A',
            address: job.customer.address || 'N/A'
          }
        : null,
      status: job.status,
      soldByOwner: job.soldByOwner,
      salesRep: job.salesRep
        ? {
            name: job.salesRep.name,
            email: job.salesRep.email || 'N/A'
          }
        : null,
      installer: job.installer
        ? {
            name: job.installer.name,
            email: job.installer.email || 'N/A'
          }
        : null,
      store: job.store ? job.store.name : 'No store selected',
      installDate: job.installDate
        ? new Date(job.installDate).toLocaleDateString()
        : 'Not scheduled',
      createdAt: new Date(job.createdAt).toLocaleDateString(),
      items: job.items
        ? job.items.map(item => ({
            product: item.product ? item.product.name : 'Unknown',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            isTaxable: item.isTaxable || false,
            itemTotal: (item.quantity || 0) * (item.unitPrice || 0),
            itemTax: item.isTaxable
              ? (item.quantity || 0) * (item.unitPrice || 0) * 0.0625
              : 0
          }))
        : [],
      subtotal: job.subtotal || 0,
      taxTotal: job.taxTotal || 0,
      installCost: job.installCost || 0,
      totalPrice: job.totalPrice || 0,
      isPaid: job.isPaid || false,
      notes: job.notes || ''
    }

    res.json(jobData)
  } catch (error) {
    console.error('Get job details error:', error)
    res.status(500).json({ error: 'Error loading job details' })
  }
}

// Shared calendar view (public, token-based)
exports.sharedCalendar = async (req, res) => {
  try {
    const { token, type } = req.query
    let entity = null
    let title = 'Job Calendar'

    if (type === 'store' && token) {
      entity = await Store.findOne({ calendarShareToken: token })
      if (entity) {
        title = `${entity.name} - Job Calendar`
      }
    } else if (type === 'installer' && token) {
      entity = await User.findOne({
        calendarShareToken: token,
        isInstaller: true
      })
      if (entity) {
        title = `${entity.name} - Installation Calendar`
      }
    } else if (type === 'salesrep' && token) {
      entity = await User.findOne({
        calendarShareToken: token,
        isSalesRep: true
      })
      if (entity) {
        title = `${entity.name} - All Jobs Calendar`
      }
    }

    if (!entity) {
      return res.status(404).render('error', {
        title: 'Calendar Not Found',
        message:
          'Invalid or expired calendar link. Please contact the administrator for a new link.'
      })
    }

    const stores = await Store.find({ isActive: true }).sort({ name: 1 })
    const colors = [
      '#0d6efd',
      '#198754',
      '#dc3545',
      '#ffc107',
      '#6f42c1',
      '#fd7e14',
      '#20c997',
      '#e83e8c',
      '#6610f2',
      '#0dcaf0',
      '#198754',
      '#ffc107',
      '#dc3545',
      '#0d6efd',
      '#6c757d'
    ]
    const storeColorMap = {}
    stores.forEach((store, index) => {
      storeColorMap[store._id.toString()] = colors[index % colors.length]
    })

    res.render('jobs/shared-calendar', {
      title,
      entity,
      entityType: type,
      token,
      stores,
      storeColorMap
    })
  } catch (error) {
    console.error('Shared calendar error:', error)
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error loading calendar. Please try again later.'
    })
  }
}

// Generate and download PDF invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer')
      .populate('installer', 'name')
      .populate('store', 'name')
      .populate('salesRep', 'name')
      .populate('items.product')

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    const pdfBuffer = await invoiceService.generateInvoicePDF(job)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${job._id
        .toString()
        .slice(-8)
        .toUpperCase()}.pdf"`
    )
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Invoice generation error:', error)
    req.flash('error', 'Error generating invoice')
    res.redirect(`/jobs/${req.params.id}`)
  }
}

// Send invoice via email
exports.sendInvoice = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer')
      .populate('installer', 'name')
      .populate('store', 'name')
      .populate('salesRep', 'name')
      .populate('items.product')

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    if (!job.customer || !job.customer.email) {
      req.flash(
        'error',
        'Customer email not found. Please add an email address to the customer.'
      )
      return res.redirect(`/jobs/${req.params.id}`)
    }

    if (!emailService.isEmailConfigured()) {
      req.flash(
        'error',
        'Email service is not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      )
      return res.redirect(`/jobs/${req.params.id}`)
    }

    // Generate PDF
    const pdfBuffer = await invoiceService.generateInvoicePDF(job)

    // Send email
    await emailService.sendInvoiceEmail({
      to: job.customer.email,
      customerName: job.customer.name || 'Valued Customer',
      pdfBuffer: pdfBuffer,
      jobId: job._id.toString()
    })

    // Log activity
    await ActivityLog.create({
      job: job._id,
      user: req.user._id,
      action: 'invoice_sent',
      details: `Invoice sent to ${job.customer.email}`
    })

    req.flash('success', `Invoice sent successfully to ${job.customer.email}`)
    res.redirect(`/jobs/${req.params.id}`)
  } catch (error) {
    console.error('Send invoice error:', error)
    req.flash('error', error.message || 'Error sending invoice')
    res.redirect(`/jobs/${req.params.id}`)
  }
}

// Upload images for job (supports multiple files)
exports.uploadImage = async (req, res) => {
  try {
    const files = req.files || []

    if (!files || files.length === 0) {
      req.flash('error', 'No image files uploaded')
      return res.redirect(`/jobs/${req.params.id}`)
    }

    const job = await Job.findById(req.params.id)
    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    const uploadedImages = []
    const errors = []

    // Process each image
    for (const file of files) {
      try {
        // Verify temp file exists before processing
        const fs = require('fs')
        if (!fs.existsSync(file.path)) {
          console.error(`Temp file does not exist: ${file.path}`)
          errors.push(file.originalname)
          continue
        }

        // Process image and create multiple sizes (returns buffers for database storage)
        let processedImages
        try {
          processedImages = await imageService.processJobImage(
            file.path,
            req.params.id,
            file.originalname
          )
          console.log(`[Upload Image] Processed image ${file.originalname}:`, {
            hasThumbnail: !!processedImages.thumbnailData,
            hasMedium: !!processedImages.mediumData,
            hasLarge: !!processedImages.largeData,
            thumbnailSize: processedImages.thumbnailSize,
            mediumSize: processedImages.mediumSize,
            largeSize: processedImages.largeSize
          })
        } catch (processError) {
          console.error(
            `[Upload Image] Error processing image ${file.originalname}:`,
            processError
          )
          console.error(`[Upload Image] Error stack:`, processError.stack)
          errors.push(
            `${file.originalname}: ${
              processError.message || 'Processing failed'
            }`
          )
          continue
        }

        // Verify processed images were created
        if (
          !processedImages.thumbnailData ||
          !processedImages.mediumData ||
          !processedImages.largeData
        ) {
          console.error(
            `[Upload Image] Failed to process image: ${file.originalname}`,
            {
              thumbnailData: !!processedImages.thumbnailData,
              mediumData: !!processedImages.mediumData,
              largeData: !!processedImages.largeData,
              processedImages: Object.keys(processedImages)
            }
          )
          errors.push(`${file.originalname}: Missing image data`)
          continue
        }

        // Save image data to database (images stored as Buffer in database)
        // Ensure job ID is an ObjectId (not string)
        const jobIdObjectId = mongoose.Types.ObjectId.isValid(req.params.id)
          ? new mongoose.Types.ObjectId(req.params.id)
          : job._id

        const jobImage = new JobImage({
          job: jobIdObjectId, // Use ObjectId to ensure proper reference
          originalFilename: file.originalname,
          thumbnailData: processedImages.thumbnailData,
          mediumData: processedImages.mediumData,
          largeData: processedImages.largeData,
          originalSize: processedImages.originalSize,
          thumbnailSize: processedImages.thumbnailSize,
          mediumSize: processedImages.mediumSize,
          largeSize: processedImages.largeSize,
          uploadedBy: req.user._id
        })

        await jobImage.save()

        // Verify the image was saved correctly
        const savedImage = await JobImage.findById(jobImage._id)
        if (!savedImage) {
          console.error(
            `[Upload Image] Failed to save image ${file.originalname} to database`
          )
          errors.push(file.originalname)
          continue
        }

        console.log(
          `[Upload Image] Successfully saved image ${file.originalname} with ID ${savedImage._id} for job ${jobIdObjectId}`
        )
        uploadedImages.push(file.originalname)

        // Log activity for each image
        await ActivityLog.create({
          job: job._id,
          user: req.user._id,
          action: 'image_uploaded',
          details: `Uploaded image: ${file.originalname}`
        })
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error)
        errors.push(file.originalname)
      }
    }

    // Set success/error messages
    if (uploadedImages.length > 0) {
      if (uploadedImages.length === 1) {
        req.flash(
          'success',
          `Image "${uploadedImages[0]}" uploaded successfully`
        )
      } else {
        req.flash(
          'success',
          `${uploadedImages.length} images uploaded successfully`
        )
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        req.flash('error', `Failed to upload image: ${errors[0]}`)
      } else {
        req.flash('error', `Failed to upload ${errors.length} image(s)`)
      }
    }

    // Check if this is an AJAX request (more reliable detection for mobile)
    const isAjax =
      req.xhr ||
      req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest' ||
      req.headers.accept?.toLowerCase().indexOf('json') > -1 ||
      (req.headers['content-type']
        ?.toLowerCase()
        .includes('multipart/form-data') &&
        req.files &&
        req.files.length > 0)

    if (isAjax) {
      if (uploadedImages.length > 0) {
        return res.status(200).json({
          success: true,
          message:
            uploadedImages.length === 1
              ? `Image "${uploadedImages[0]}" uploaded successfully`
              : `${uploadedImages.length} images uploaded successfully`,
          uploadedCount: uploadedImages.length,
          errorCount: errors.length
        })
      } else {
        return res.status(400).json({
          success: false,
          error:
            errors.length > 0
              ? `Failed to upload ${errors.length} image(s)`
              : 'No images were uploaded'
        })
      }
    }

    res.redirect(`/jobs/${req.params.id}`)
  } catch (error) {
    console.error('Upload images error:', error)

    const isAjax =
      req.xhr ||
      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      req.headers.accept?.indexOf('json') > -1

    if (isAjax) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error uploading images'
      })
    }

    req.flash('error', error.message || 'Error uploading images')
    res.redirect(`/jobs/${req.params.id}`)
  }
}

// Serve image from database
exports.serveImage = async (req, res) => {
  try {
    const { imageId, size } = req.params
    const validSizes = ['thumbnail', 'medium', 'large']

    if (!validSizes.includes(size)) {
      console.error(`[Serve Image] Invalid size: ${size}`)
      return res.status(400).send('Invalid image size')
    }

    const jobImage = await JobImage.findById(imageId)
    if (!jobImage) {
      console.error(`[Serve Image] Image not found: ${imageId}`)
      return res.status(404).send('Image not found')
    }

    // Get the appropriate image buffer
    let imageData
    switch (size) {
      case 'thumbnail':
        imageData = jobImage.thumbnailData
        break
      case 'medium':
        imageData = jobImage.mediumData
        break
      case 'large':
        imageData = jobImage.largeData
        break
    }

    if (!imageData) {
      console.error(
        `[Serve Image] Image data not found for ${imageId}, size: ${size}`
      )
      console.error(`[Serve Image] Image document fields:`, {
        hasThumbnailData: !!jobImage.thumbnailData,
        hasMediumData: !!jobImage.mediumData,
        hasLargeData: !!jobImage.largeData,
        thumbnailPath: jobImage.thumbnailPath,
        mediumPath: jobImage.mediumPath,
        largePath: jobImage.largePath
      })
      return res
        .status(404)
        .send(
          'Image data not found - this image may have been uploaded before database storage was implemented'
        )
    }

    if (!Buffer.isBuffer(imageData)) {
      console.error(
        `[Serve Image] Image data is not a Buffer for ${imageId}, size: ${size}, type: ${typeof imageData}`
      )
      return res.status(500).send('Invalid image data format')
    }

    // Set appropriate headers
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    res.set('Content-Length', imageData.length)

    // Send the image buffer
    res.send(imageData)
  } catch (error) {
    console.error('[Serve Image] Error:', error)
    console.error('[Serve Image] Stack:', error.stack)
    res.status(500).send('Error serving image')
  }
}

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const jobImage = await JobImage.findById(req.params.imageId).populate('job')

    if (!jobImage) {
      // Check if this is an AJAX request
      const isAjax =
        req.xhr ||
        req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'
      if (isAjax) {
        return res
          .status(404)
          .json({ success: false, error: 'Image not found' })
      }
      req.flash('error', 'Image not found')
      return res.redirect('/jobs')
    }

    const jobId = jobImage.job._id.toString()

    // Images are stored in database, no files to delete
    // imageService.deleteJobImageFiles(jobImage) - no longer needed

    // Delete from database
    await JobImage.findByIdAndDelete(req.params.imageId)

    // Log activity
    await ActivityLog.create({
      job: jobImage.job._id,
      user: req.user._id,
      action: 'image_deleted',
      details: `Deleted image: ${jobImage.originalFilename}`
    })

    // Check if this is an AJAX request
    const isAjax =
      req.xhr ||
      req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'

    if (isAjax) {
      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      })
    }

    req.flash('success', 'Image deleted successfully')

    // Check if we're coming from library page
    if (req.query.from === 'library') {
      return res.redirect(`/jobs/${jobId}/images`)
    }

    res.redirect(`/jobs/${jobId}`)
  } catch (error) {
    console.error('Delete image error:', error)

    // Check if this is an AJAX request
    const isAjax =
      req.xhr ||
      req.headers['x-requested-with']?.toLowerCase() === 'xmlhttprequest'

    if (isAjax) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error deleting image'
      })
    }

    req.flash('error', error.message || 'Error deleting image')
    res.redirect('/jobs')
  }
}

// Image library view
exports.imageLibrary = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer', 'name')
      .populate('items.product', 'name')

    if (!job) {
      req.flash('error', 'Job not found')
      return res.redirect('/jobs')
    }

    // Query images but exclude image data for performance
    const images = await JobImage.find({ job: job._id })
      .populate('uploadedBy', 'name')
      .sort({ uploadedAt: -1 })
      .select('-thumbnailData -mediumData -largeData') // Exclude image data from query

    res.render('jobs/image-library', {
      title: `Image Library - Job #${job._id.toString().slice(-6)}`,
      job,
      images,
      user: req.user
    })
  } catch (error) {
    console.error('Image library error:', error)
    req.flash('error', 'Error loading image library')
    res.redirect(`/jobs/${req.params.id}`)
  }
}
