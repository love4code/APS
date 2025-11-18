const User = require('../models/User')
const Job = require('../models/Job')

exports.getDashboard = async (req, res) => {
  try {
    // Get installers
    const installers = await User.find({ isInstaller: true, isActive: true })
      .select('name email')
      .lean()

    // Get sales reps
    const salesReps = await User.find({ isSalesRep: true, isActive: true })
      .select('name email')
      .lean()

    // Get jobs with populated data
    const jobs = await Job.find()
      .populate('customer', 'name')
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    // Calculate stats for installers
    for (const installer of installers) {
      const installerJobs = await Job.find({ installer: installer._id })
      installer.scheduled = installerJobs.filter(
        j => j.status === 'scheduled'
      ).length
      installer.completed = installerJobs.filter(
        j => j.status === 'complete'
      ).length
    }

    // Calculate stats for sales reps
    for (const rep of salesReps) {
      const repJobs = await Job.find({ salesRep: rep._id })
      rep.totalJobs = repJobs.length
      rep.salesTotal = repJobs.reduce(
        (sum, job) => sum + (job.totalPrice || 0),
        0
      )
    }

    res.render('dashboard/index', {
      title: 'Dashboard',
      installers,
      salesReps,
      jobs,
      user: req.user
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    req.flash('error', 'Error loading dashboard')
    res.redirect('/login')
  }
}
