const User = require('../models/User')
const Job = require('../models/Job')

exports.getDashboard = async (req, res, next) => {
  try {
    // Check database connection
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) {
      console.error(
        'Database not connected, readyState:',
        mongoose.connection.readyState
      )
      return res.status(503).render('error', {
        title: 'Service Unavailable',
        message: 'Database connection error. Please try again.'
      })
    }

    // Get installers
    const installers = await User.find({ isInstaller: true, isActive: true })
      .select('name email')
      .lean()
      .maxTimeMS(5000)

    // Get sales reps
    const salesReps = await User.find({ isSalesRep: true, isActive: true })
      .select('name email')
      .lean()
      .maxTimeMS(5000)

    // Get jobs with populated data
    const jobs = await Job.find()
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .maxTimeMS(5000)

    // Calculate stats for installers
    for (const installer of installers) {
      try {
        const installerJobs = await Job.find({ installer: installer._id })
          .maxTimeMS(3000)
          .lean()
        installer.scheduled = installerJobs.filter(
          j => j.status === 'scheduled'
        ).length
        installer.completed = installerJobs.filter(
          j => j.status === 'complete'
        ).length
      } catch (err) {
        console.error(
          `Error calculating stats for installer ${installer._id}:`,
          err
        )
        installer.scheduled = 0
        installer.completed = 0
      }
    }

    // Calculate stats for sales reps
    for (const rep of salesReps) {
      try {
        const repJobs = await Job.find({ salesRep: rep._id })
          .maxTimeMS(3000)
          .lean()
        rep.totalJobs = repJobs.length
        rep.salesTotal = repJobs.reduce(
          (sum, job) => sum + (job.totalPrice || 0),
          0
        )
      } catch (err) {
        console.error(`Error calculating stats for sales rep ${rep._id}:`, err)
        rep.totalJobs = 0
        rep.salesTotal = 0
      }
    }

    // Ensure arrays are always defined
    const safeInstallers = Array.isArray(installers) ? installers : []
    const safeSalesReps = Array.isArray(salesReps) ? salesReps : []
    const safeJobs = Array.isArray(jobs) ? jobs : []

    res.render('dashboard/index', {
      title: 'Dashboard',
      installers: safeInstallers,
      salesReps: safeSalesReps,
      jobs: safeJobs,
      user: req.user || null
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    console.error('Dashboard error stack:', error.stack)
    // Pass error to Express error handler
    next(error)
  }
}
