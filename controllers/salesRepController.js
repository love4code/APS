const User = require('../models/User')
const Job = require('../models/Job')
const Customer = require('../models/Customer')
const Payment = require('../models/Payment')

// List all sales reps with their stats
exports.list = async (req, res) => {
  try {
    const salesReps = await User.find({ isSalesRep: true, isActive: true })
      .sort({ name: 1 })
      .lean() // Use lean() to get plain objects

    // Calculate stats for each sales rep
    for (const rep of salesReps) {
      // Ensure _id is properly converted to string
      if (!rep._id) {
        console.warn('Sales rep missing _id:', rep)
        continue
      }
      const repJobs = await Job.find({ salesRep: rep._id }).lean()
      rep.totalJobs = repJobs.length
      rep.totalSales = repJobs.reduce(
        (sum, job) => sum + (job.totalPrice || 0),
        0
      )
      rep.paidSales = repJobs
        .filter(j => j.isPaid)
        .reduce((sum, job) => sum + (job.totalPrice || 0), 0)
      rep.unpaidSales = repJobs
        .filter(j => !j.isPaid)
        .reduce((sum, job) => sum + (job.totalPrice || 0), 0)
      rep.completedJobs = repJobs.filter(j => j.status === 'complete').length
    }

    res.render('salesReps/list', {
      title: 'Sales Reps',
      salesReps
    })
  } catch (error) {
    console.error('Sales rep list error:', error)
    req.flash('error', 'Error loading sales reps: ' + error.message)
    res.redirect('/')
  }
}

// Show detailed view of a sales rep with all their sales
exports.detail = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid sales rep ID')
      return res.redirect('/sales-reps')
    }

    const salesRep = await User.findById(req.params.id)

    if (!salesRep || !salesRep.isSalesRep) {
      req.flash('error', 'Sales rep not found')
      return res.redirect('/sales-reps')
    }

    // Get all jobs for this sales rep
    const allJobs = await Job.find({ salesRep: salesRep._id })
      .populate('customer', 'name email phone')
      .populate('installer', 'name')
      .sort({ createdAt: -1 })

    // Separate sales (isSale: true) from all jobs
    const sales = allJobs.filter(job => job.isSale === true)
    const jobs = allJobs.filter(job => job.isSale !== true)

    // Get all payments to this sales rep
    const payments = await Payment.find({
      recipient: salesRep._id,
      recipientType: 'salesRep'
    })
      .populate('job', 'customer totalPrice')
      .populate('job.customer', 'name')
      .populate('jobs', 'customer totalPrice')
      .populate('jobs.customer', 'name')
      .sort({ datePaid: -1 })

    // Calculate statistics (using allJobs for total counts)
    const stats = {
      totalJobs: allJobs.length,
      totalSales: allJobs.reduce((sum, job) => sum + (job.totalPrice || 0), 0),
      paidSales: allJobs
        .filter(j => j.isPaid)
        .reduce((sum, job) => sum + (job.totalPrice || 0), 0),
      unpaidSales: allJobs
        .filter(j => !j.isPaid)
        .reduce((sum, job) => sum + (job.totalPrice || 0), 0),
      completedJobs: allJobs.filter(j => j.status === 'complete').length,
      scheduledJobs: allJobs.filter(j => j.status === 'scheduled').length,
      deliveredJobs: allJobs.filter(j => j.status === 'delivered').length,
      averageSale:
        allJobs.length > 0
          ? allJobs.reduce((sum, job) => sum + (job.totalPrice || 0), 0) /
            allJobs.length
          : 0,
      totalPayments: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      paymentCount: payments.length
    }

    // Ensure sales rep has share token
    if (!salesRep.calendarShareToken) {
      await salesRep.save() // This will trigger the pre-save hook to generate token
    }

    // Re-fetch to get updated token
    const updatedSalesRep = await User.findById(req.params.id)

    // Generate base URL for share links
    const baseUrl = req.protocol + '://' + req.get('host')

    res.render('salesReps/detail', {
      title: `Sales Rep: ${salesRep.name}`,
      salesRep: updatedSalesRep,
      sales,
      jobs,
      payments,
      stats,
      baseUrl
    })
  } catch (error) {
    console.error('Sales rep detail error:', error)
    req.flash('error', 'Error loading sales rep details')
    res.redirect('/sales-reps')
  }
}

// Regenerate sales rep share token
exports.regenerateToken = async (req, res) => {
  try {
    const salesRep = await User.findById(req.params.id)
    if (!salesRep || !salesRep.isSalesRep) {
      req.flash('error', 'Sales rep not found')
      return res.redirect('/sales-reps')
    }

    const crypto = require('crypto')
    salesRep.calendarShareToken = crypto.randomBytes(32).toString('hex')
    await salesRep.save()

    req.flash(
      'success',
      'Calendar share token regenerated. Old links will no longer work.'
    )
    res.redirect(`/sales-reps/${req.params.id}`)
  } catch (error) {
    console.error('Regenerate token error:', error)
    req.flash('error', 'Error regenerating token')
    res.redirect('/sales-reps')
  }
}

// Send calendar invite
exports.sendInvite = async (req, res) => {
  try {
    const { email, name } = req.body
    const salesRep = await User.findById(req.params.id)

    if (!salesRep || !salesRep.isSalesRep) {
      req.flash('error', 'Sales rep not found')
      return res.redirect('/sales-reps')
    }

    if (!email || !email.trim()) {
      req.flash('error', 'Email is required')
      return res.redirect(`/sales-reps/${req.params.id}`)
    }

    const emailService = require('../services/emailService')
    if (!emailService.isEmailConfigured()) {
      req.flash(
        'error',
        'Email service is not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      )
      return res.redirect(`/sales-reps/${req.params.id}`)
    }

    const CalendarInvite = require('../models/CalendarInvite')
    const baseUrl = req.protocol + '://' + req.get('host')

    // Create invite
    const invite = new CalendarInvite({
      email: email.toLowerCase().trim(),
      name: name || '',
      inviteType: 'salesrep',
      entityId: salesRep._id,
      entityModel: 'User',
      createdBy: req.user._id
    })
    await invite.save()

    // Send email
    await emailService.sendCalendarInvite({
      to: email,
      name: name || email,
      inviteToken: invite.inviteToken,
      inviteType: 'salesrep',
      entityName: salesRep.name,
      baseUrl
    })

    req.flash('success', `Calendar invite sent to ${email}`)
    res.redirect(`/sales-reps/${req.params.id}`)
  } catch (error) {
    console.error('Send invite error:', error)
    if (error.code === 11000) {
      req.flash(
        'error',
        'An invite has already been sent to this email address'
      )
    } else {
      req.flash('error', error.message || 'Error sending invite')
    }
    res.redirect(`/sales-reps/${req.params.id}`)
  }
}
