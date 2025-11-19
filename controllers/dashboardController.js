const User = require('../models/User')
const Job = require('../models/Job')
const Product = require('../models/Product')

exports.getDashboard = async (req, res, next) => {
  try {
    console.log('Dashboard: Starting request')
    console.log('Dashboard: User authenticated:', !!req.user)
    console.log('Dashboard: Session exists:', !!req.session)

    // Check database connection
    const mongoose = require('mongoose')
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.error(
        'Database not connected, readyState:',
        mongoose.connection ? mongoose.connection.readyState : 'no connection'
      )
      // Ensure required variables are set for error view
      res.locals.isAuthenticated = res.locals.isAuthenticated || false
      res.locals.user = res.locals.user || null
      res.locals.success = res.locals.success || []
      res.locals.error = res.locals.error || []

      return res.status(503).render('error', {
        title: 'Service Unavailable',
        message: 'Database connection error. Please try again.'
      })
    }

    console.log('Dashboard: Database connected, fetching data...')

    // Get installers - with error handling
    let installers = []
    try {
      installers = await User.find({ isInstaller: true, isActive: true })
        .select('name email')
        .lean()
        .maxTimeMS(5000)
    } catch (err) {
      console.error('Error fetching installers:', err)
      installers = []
    }

    // Get sales reps - with error handling
    let salesReps = []
    try {
      salesReps = await User.find({ isSalesRep: true, isActive: true })
        .select('name email')
        .lean()
        .maxTimeMS(5000)
    } catch (err) {
      console.error('Error fetching sales reps:', err)
      salesReps = []
    }

    // Get jobs with populated data - exclude sales from recent jobs
    let jobs = []
    try {
      jobs = await Job.find({ isSale: { $ne: true } }) // Exclude sales from jobs
        .populate({
          path: 'customer',
          select: 'name',
          options: { lean: true }
        })
        .populate({
          path: 'salesRep',
          select: 'name',
          options: { lean: true }
        })
        .populate({
          path: 'installer',
          select: 'name',
          options: { lean: true }
        })
        .populate({
          path: 'createdBy',
          select: 'name',
          options: { lean: true }
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
        .maxTimeMS(5000)

      // Ensure all jobs have safe data
      jobs = jobs.map(job => ({
        ...job,
        customer: job.customer || null,
        salesRep: job.salesRep || null,
        installer: job.installer || null,
        createdBy: job.createdBy || null,
        totalPrice: job.totalPrice || 0,
        status: job.status || 'pending',
        isPaid: job.isPaid || false,
        installDate: job.installDate || null
      }))
    } catch (err) {
      console.error('Error fetching jobs:', err)
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      })
      jobs = []
    }

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

    // Get recent sales (all sales, not just pool sales) - with error handling
    let recentSales = []
    try {
      // Get all sales (isSale: true)
      recentSales = await Job.find({ isSale: true })
        .populate({
          path: 'customer',
          select: 'name',
          options: { lean: true }
        })
        .populate({
          path: 'salesRep',
          select: 'name',
          options: { lean: true }
        })
        .populate({
          path: 'items.product',
          select: 'name',
          options: { lean: true }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .maxTimeMS(5000)

      // Ensure all sales have safe data
      recentSales = recentSales.map(sale => ({
        ...sale,
        customer: sale.customer || null,
        salesRep: sale.salesRep || null,
        totalPrice: sale.totalPrice || 0,
        orderDate: sale.orderDate || null,
        deliveryDate: sale.deliveryDate || null,
        status: sale.status || 'pending'
      }))
    } catch (err) {
      console.error('Error fetching recent sales:', err)
      recentSales = []
    }

    // Ensure arrays are always defined
    const safeInstallers = Array.isArray(installers) ? installers : []
    const safeSalesReps = Array.isArray(salesReps) ? salesReps : []
    const safeJobs = Array.isArray(jobs) ? jobs : []
    const safeRecentSales = Array.isArray(recentSales) ? recentSales : []

    // req.user is already a plain object from loadUser middleware (.lean())
    // Ensure all required variables are set for the view
    res.locals.isAuthenticated = res.locals.isAuthenticated || false
    res.locals.user = req.user || null
    res.locals.success = res.locals.success || []
    res.locals.error = res.locals.error || []

    try {
      console.log('Dashboard: Rendering view with data:', {
        installersCount: safeInstallers.length,
        salesRepsCount: safeSalesReps.length,
        jobsCount: safeJobs.length,
        hasUser: !!req.user
      })

      res.render('dashboard/index', {
        title: 'Dashboard',
        installers: safeInstallers || [],
        salesReps: safeSalesReps || [],
        jobs: safeJobs || [],
        recentSales: safeRecentSales || [],
        user: req.user || null,
        isAuthenticated: res.locals.isAuthenticated || false
      })
    } catch (renderError) {
      console.error('Dashboard render error:', renderError)
      console.error('Dashboard render error name:', renderError.name)
      console.error('Dashboard render error message:', renderError.message)
      console.error('Dashboard render error stack:', renderError.stack)
      console.error('Dashboard render error details:', {
        installers: safeInstallers.length,
        salesReps: safeSalesReps.length,
        jobs: safeJobs.length,
        user: req.user ? 'exists' : 'null'
      })
      throw renderError
    }
  } catch (error) {
    console.error('Dashboard error:', error)
    console.error('Dashboard error name:', error.name)
    console.error('Dashboard error message:', error.message)
    console.error('Dashboard error stack:', error.stack)

    // Ensure variables are set before passing to error handler
    res.locals.isAuthenticated = res.locals.isAuthenticated || false
    res.locals.user = res.locals.user || null
    res.locals.success = res.locals.success || []
    res.locals.error = res.locals.error || []

    // Pass error to Express error handler
    next(error)
  }
}
