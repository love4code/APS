const User = require('../models/User')
const Job = require('../models/Job')
const Customer = require('../models/Customer')
const Payment = require('../models/Payment')

// List all installers with their stats
exports.list = async (req, res) => {
  try {
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })

    // Calculate stats for each installer
    for (const installer of installers) {
      const installerJobs = await Job.find({ installer: installer._id })
      installer.totalJobs = installerJobs.length
      installer.scheduled = installerJobs.filter(
        j => j.status === 'scheduled'
      ).length
      installer.completed = installerJobs.filter(
        j => j.status === 'complete'
      ).length
      installer.delivered = installerJobs.filter(
        j => j.status === 'delivered'
      ).length
      installer.delayed = installerJobs.filter(
        j => j.status === 'delayed'
      ).length
    }

    res.render('installers/list', {
      title: 'Installers',
      installers
    })
  } catch (error) {
    console.error('Installer list error:', error)
    req.flash('error', 'Error loading installers')
    res.redirect('/')
  }
}

// Show detailed view of an installer with all their jobs
exports.detail = async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      req.flash('error', 'Invalid installer ID')
      return res.redirect('/installers')
    }

    const installer = await User.findById(req.params.id)

    if (!installer || !installer.isInstaller) {
      req.flash('error', 'Installer not found')
      return res.redirect('/installers')
    }

    // Get all jobs for this installer
    const jobs = await Job.find({ installer: installer._id })
      .populate('customer', 'name email phone')
      .populate('salesRep', 'name')
      .sort({ installDate: -1, createdAt: -1 })

    // Get all payments to this installer
    const payments = await Payment.find({
      recipient: installer._id,
      recipientType: 'installer'
    })
      .populate('job', 'customer totalPrice')
      .populate('job.customer', 'name')
      .sort({ datePaid: -1 })

    // Calculate statistics
    const stats = {
      totalJobs: jobs.length,
      scheduled: jobs.filter(j => j.status === 'scheduled').length,
      completed: jobs.filter(j => j.status === 'complete').length,
      delivered: jobs.filter(j => j.status === 'delivered').length,
      undelivered: jobs.filter(j => j.status === 'undelivered').length,
      delayed: jobs.filter(j => j.status === 'delayed').length,
      paidJobs: jobs.filter(j => j.isPaid).length,
      unpaidJobs: jobs.filter(j => !j.isPaid).length,
      totalPayments: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      paymentCount: payments.length
    }

    // Ensure installer has share token
    if (!installer.calendarShareToken) {
      await installer.save() // This will trigger the pre-save hook to generate token
      await installer.populate() // Re-populate if needed
    }
    
    // Re-fetch to get updated token
    const updatedInstaller = await User.findById(req.params.id)
    
    // Generate base URL for share links
    const baseUrl = req.protocol + '://' + req.get('host')
    
    res.render('installers/detail', {
      title: `Installer: ${installer.name}`,
      installer: updatedInstaller,
      jobs,
      payments,
      stats,
      baseUrl
    })
  } catch (error) {
    console.error('Installer detail error:', error)
    req.flash('error', 'Error loading installer details')
    res.redirect('/installers')
  }
}

// Regenerate installer share token
exports.regenerateToken = async (req, res) => {
  try {
    const installer = await User.findById(req.params.id)
    if (!installer || !installer.isInstaller) {
      req.flash('error', 'Installer not found')
      return res.redirect('/installers')
    }
    
    const crypto = require('crypto')
    installer.calendarShareToken = crypto.randomBytes(32).toString('hex')
    await installer.save()
    
    req.flash('success', 'Calendar share token regenerated. Old links will no longer work.')
    res.redirect(`/installers/${req.params.id}`)
  } catch (error) {
    console.error('Regenerate token error:', error)
    req.flash('error', 'Error regenerating token')
    res.redirect('/installers')
  }
}
