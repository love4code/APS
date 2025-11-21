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
    // Sort by install date (earliest first) to show which jobs need to be completed first
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
        installDate: job.installDate || null,
        invoicedDate: job.invoicedDate || null
      }))

      // Sort jobs by install date (earliest first)
      // Jobs with install dates come first, ordered by date
      // Jobs without install dates come after, sorted by createdAt
      jobs.sort((a, b) => {
        const aHasDate = a.installDate && new Date(a.installDate).getTime() > 0
        const bHasDate = b.installDate && new Date(b.installDate).getTime() > 0

        if (aHasDate && bHasDate) {
          // Both have install dates - sort by date (earliest first)
          return new Date(a.installDate) - new Date(b.installDate)
        } else if (aHasDate && !bHasDate) {
          // A has date, B doesn't - A comes first
          return -1
        } else if (!aHasDate && bHasDate) {
          // B has date, A doesn't - B comes first
          return 1
        } else {
          // Neither has date - sort by createdAt (most recent first)
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bCreated - aCreated
        }
      })

      // Limit to 6 most important jobs (earliest install dates)
      jobs = jobs.slice(0, 6)
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
        // Count only sales (jobs with isSale: true)
        const repSales = repJobs.filter(job => job.isSale === true)
        rep.totalSales = repSales.length
        rep.salesTotal = repSales.reduce(
          (sum, job) => sum + (job.totalPrice || 0),
          0
        )
      } catch (err) {
        console.error(`Error calculating stats for sales rep ${rep._id}:`, err)
        rep.totalSales = 0
        rep.salesTotal = 0
      }
    }

    // Get recent sales (all sales, not just pool sales) - with error handling
    let recentSales = []
    try {
      // Get all sales (isSale: true) - limit to 6 most recent
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
        .limit(6)
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
        invoicedDate: sale.invoicedDate || null,
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

    // Calculate chart data
    let chartData = {
      salesByMonth: [],
      jobStatusCounts: {},
      salesByRep: [],
      installerPerformance: []
    }

    try {
      // Sales by month (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const allSales = await Job.find({
        isSale: true,
        createdAt: { $gte: sixMonthsAgo }
      }).select('createdAt totalPrice').lean().maxTimeMS(5000)

      // Group sales by month
      const salesByMonthMap = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      allSales.forEach(sale => {
        if (sale.createdAt) {
          const date = new Date(sale.createdAt)
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`
          const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
          
          if (!salesByMonthMap[monthKey]) {
            salesByMonthMap[monthKey] = {
              month: monthLabel,
              total: 0,
              count: 0
            }
          }
          salesByMonthMap[monthKey].total += sale.totalPrice || 0
          salesByMonthMap[monthKey].count += 1
        }
      })
      
      chartData.salesByMonth = Object.values(salesByMonthMap).sort((a, b) => {
        const aParts = a.month.split(' ')
        const bParts = b.month.split(' ')
        if (aParts[1] !== bParts[1]) return aParts[1] - bParts[1]
        return monthNames.indexOf(aParts[0]) - monthNames.indexOf(bParts[0])
      })

      // Job status counts
      const allJobsStatus = await Job.find({ isSale: { $ne: true } })
        .select('status')
        .lean()
        .maxTimeMS(3000)
      
      chartData.jobStatusCounts = {
        pending: 0,
        scheduled: 0,
        complete: 0,
        delayed: 0,
        delivered: 0
      }
      
      allJobsStatus.forEach(job => {
        const status = job.status || 'pending'
        if (chartData.jobStatusCounts.hasOwnProperty(status)) {
          chartData.jobStatusCounts[status]++
        } else {
          chartData.jobStatusCounts[status] = 1
        }
      })

      // Sales by rep (for pie chart)
      chartData.salesByRep = safeSalesReps.map(rep => ({
        name: rep.name || 'Unknown',
        total: rep.salesTotal || 0,
        count: rep.totalSales || 0
      })).filter(rep => rep.total > 0)

      // Installer performance
      chartData.installerPerformance = safeInstallers.map(installer => ({
        name: installer.name || 'Unknown',
        scheduled: installer.scheduled || 0,
        completed: installer.completed || 0
      }))
    } catch (err) {
      console.error('Error calculating chart data:', err)
      // Keep default empty chart data
    }

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
        chartData: chartData,
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
