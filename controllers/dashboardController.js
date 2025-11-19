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

    // Get jobs with populated data - with error handling
    let jobs = []
    try {
      jobs = await Job.find()
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

    // Get pool sales (sales with pool products) - with error handling
    let poolSales = []
    try {
      // First, get all products that contain "pool" in the name (case-insensitive)
      const poolProducts = await Product.find({
        name: { $regex: /pool/i },
        isActive: true
      })
        .select('_id')
        .lean()
        .maxTimeMS(3000)
      
      const poolProductIds = poolProducts.map(p => p._id)
      
      if (poolProductIds.length > 0) {
        // Get sales (isSale: true) that have pool products in their items
        const allSales = await Job.find({ isSale: true })
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
        
        // Filter to only include sales that have pool products
        poolSales = allSales.filter(sale => {
          if (!sale.items || sale.items.length === 0) return false
          return sale.items.some(item => 
            item.product && poolProductIds.some(id => 
              id.toString() === item.product._id.toString()
            )
          )
        })
        
        // Ensure all pool sales have safe data
        poolSales = poolSales.map(sale => ({
          ...sale,
          customer: sale.customer || null,
          salesRep: sale.salesRep || null,
          totalPrice: sale.totalPrice || 0,
          orderDate: sale.orderDate || null,
          deliveryDate: sale.deliveryDate || null,
          status: sale.status || 'pending'
        }))
      }
    } catch (err) {
      console.error('Error fetching pool sales:', err)
      poolSales = []
    }

    // Ensure arrays are always defined
    const safeInstallers = Array.isArray(installers) ? installers : []
    const safeSalesReps = Array.isArray(salesReps) ? salesReps : []
    const safeJobs = Array.isArray(jobs) ? jobs : []
    const safePoolSales = Array.isArray(poolSales) ? poolSales : []

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
        poolSales: safePoolSales || [],
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
