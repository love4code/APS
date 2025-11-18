const Payment = require('../models/Payment')
const Job = require('../models/Job')
const User = require('../models/User')

// List all payments
exports.list = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('job', 'customer totalPrice')
      .populate('job.customer', 'name')
      .populate('recipient', 'name email')
      .populate('createdBy', 'name')
      .sort({ datePaid: -1 })

    // Calculate totals
    const totals = {
      total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      toInstallers: payments
        .filter(p => p.recipientType === 'installer')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      toSalesReps: payments
        .filter(p => p.recipientType === 'salesRep')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    }

    res.render('payments/list', {
      title: 'Payments',
      payments,
      totals
    })
  } catch (error) {
    console.error('Payment list error:', error)
    req.flash('error', 'Error loading payments')
    res.redirect('/')
  }
}

// Show form to create new payment
exports.newForm = async (req, res) => {
  try {
    const { jobId, recipientId, recipientType } = req.query

    // Get jobs that have installers or sales reps
    const jobs = await Job.find()
      .populate('customer', 'name')
      .populate('installer', 'name')
      .populate('salesRep', 'name')
      .sort({ createdAt: -1 })

    // Get installers and sales reps
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })

    // Pre-select job and recipient if provided
    let selectedJob = null
    let selectedRecipient = null

    if (jobId) {
      selectedJob = await Job.findById(jobId)
        .populate('customer', 'name')
        .populate('installer', 'name')
        .populate('salesRep', 'name')
    }

    if (recipientId) {
      selectedRecipient = await User.findById(recipientId)
    }

    res.render('payments/form', {
      title: 'New Payment',
      payment: null,
      jobs,
      installers,
      salesReps,
      selectedJob,
      selectedRecipient,
      recipientType: recipientType || null
    })
  } catch (error) {
    console.error('Error loading payment form:', error)
    req.flash('error', 'Error loading payment form')
    res.redirect('/payments')
  }
}

// Create new payment
exports.create = async (req, res) => {
  try {
    const {
      job,
      recipient,
      recipientType,
      amount,
      datePaid,
      paymentMethod,
      notes
    } = req.body

    if (!job || !recipient || !recipientType || !amount) {
      req.flash('error', 'Job, recipient, type, and amount are required')
      return res.redirect('/payments/new')
    }

    // Verify the recipient matches the type
    const recipientUser = await User.findById(recipient)
    if (!recipientUser) {
      req.flash('error', 'Recipient not found')
      return res.redirect('/payments/new')
    }

    if (recipientType === 'installer' && !recipientUser.isInstaller) {
      req.flash('error', 'Selected user is not an installer')
      return res.redirect('/payments/new')
    }

    if (recipientType === 'salesRep' && !recipientUser.isSalesRep) {
      req.flash('error', 'Selected user is not a sales rep')
      return res.redirect('/payments/new')
    }

    const payment = new Payment({
      job,
      recipient,
      recipientType,
      amount: parseFloat(amount),
      datePaid: datePaid || new Date(),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      createdBy: req.user._id
    })

    await payment.save()

    req.flash('success', 'Payment recorded successfully')
    res.redirect('/payments')
  } catch (error) {
    console.error('Error creating payment:', error)
    req.flash('error', 'Error creating payment: ' + error.message)
    res.redirect('/payments/new')
  }
}

// Show payment detail
exports.detail = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('job')
      .populate('job.customer', 'name')
      .populate('job.installer', 'name')
      .populate('job.salesRep', 'name')
      .populate('recipient', 'name email')
      .populate('createdBy', 'name')

    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    res.render('payments/detail', {
      title: `Payment - $${payment.amount.toFixed(2)}`,
      payment
    })
  } catch (error) {
    console.error('Error loading payment:', error)
    req.flash('error', 'Error loading payment')
    res.redirect('/payments')
  }
}

// Show form to edit payment
exports.editForm = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('job')
      .populate('recipient', 'name')

    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    const jobs = await Job.find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })

    res.render('payments/form', {
      title: 'Edit Payment',
      payment,
      jobs,
      installers,
      salesReps,
      selectedJob: payment.job,
      selectedRecipient: payment.recipient,
      recipientType: payment.recipientType
    })
  } catch (error) {
    console.error('Error loading payment form:', error)
    req.flash('error', 'Error loading payment')
    res.redirect('/payments')
  }
}

// Update payment
exports.update = async (req, res) => {
  try {
    const {
      job,
      recipient,
      recipientType,
      amount,
      datePaid,
      paymentMethod,
      notes
    } = req.body

    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    payment.job = job
    payment.recipient = recipient
    payment.recipientType = recipientType
    payment.amount = parseFloat(amount)
    payment.datePaid = datePaid || new Date()
    payment.paymentMethod = paymentMethod || 'cash'
    payment.notes = notes || ''

    await payment.save()

    req.flash('success', 'Payment updated successfully')
    res.redirect(`/payments/${payment._id}`)
  } catch (error) {
    console.error('Error updating payment:', error)
    req.flash('error', 'Error updating payment: ' + error.message)
    res.redirect(`/payments/${req.params.id}/edit`)
  }
}

// Delete payment
exports.delete = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (payment) {
      await payment.deleteOne()
      req.flash('success', 'Payment deleted successfully')
    } else {
      req.flash('error', 'Payment not found')
    }
    res.redirect('/payments')
  } catch (error) {
    console.error('Error deleting payment:', error)
    req.flash('error', 'Error deleting payment')
    res.redirect('/payments')
  }
}
