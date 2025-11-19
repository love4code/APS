const TimeEntry = require('../models/TimeEntry')
const Employee = require('../models/Employee')
const User = require('../models/User')
const PayPeriod = require('../models/PayPeriod')

exports.list = async (req, res) => {
  try {
    const employeeFilter = req.query.employee || ''
    const dateFrom = req.query.dateFrom || ''
    const dateTo = req.query.dateTo || ''
    const typeFilter = req.query.type || ''
    const approvedFilter = req.query.approved || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    // Build query
    const query = {}

    if (employeeFilter) {
      query.employee = employeeFilter
    }

    if (dateFrom || dateTo) {
      query.date = {}
      if (dateFrom) {
        const [year, month, day] = dateFrom.split('-').map(Number)
        query.date.$gte = new Date(Date.UTC(year, month - 1, day))
      }
      if (dateTo) {
        const [year, month, day] = dateTo.split('-').map(Number)
        const endDate = new Date(Date.UTC(year, month - 1, day))
        endDate.setUTCHours(23, 59, 59, 999)
        query.date.$lte = endDate
      }
    }

    if (typeFilter) {
      query.type = typeFilter
    }

    if (approvedFilter === 'true') {
      query.approved = true
    } else if (approvedFilter === 'false') {
      query.approved = false
    }

    const timeEntries = await TimeEntry.find(query)
      .populate('employee', 'firstName lastName')
      .populate('approvedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await TimeEntry.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get employees for filter dropdown
    const employees = await Employee.find({ status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName _id')
      .lean()

    res.render('time-entries/list', {
      title: 'Time Entries',
      timeEntries,
      employees,
      employeeFilter,
      dateFrom,
      dateTo,
      typeFilter,
      approvedFilter,
      currentPage: page,
      totalPages,
      total,
      limit
    })
  } catch (error) {
    console.error('Error loading time entries:', error)
    req.flash('error', 'Error loading time entries')
    res.redirect('/')
  }
}

exports.newForm = async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .lean()

    // Pre-select employee if provided
    const employeeId = req.query.employeeId || null

    res.render('time-entries/form', {
      title: 'New Time Entry',
      timeEntry: null,
      employees,
      selectedEmployeeId: employeeId
    })
  } catch (error) {
    req.flash('error', 'Error loading form')
    res.redirect('/time-entries')
  }
}

exports.create = async (req, res) => {
  try {
    const {
      employee,
      date,
      startTime,
      endTime,
      hoursWorked,
      breakMinutes,
      overtimeHours,
      type,
      projectOrJobId,
      jobName,
      notes
    } = req.body

    if (!employee || !date) {
      req.flash('error', 'Employee and date are required')
      return res.redirect('/time-entries/new')
    }

    // Parse date
    let parsedDate = null
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      parsedDate = new Date(Date.UTC(year, month - 1, day))
    }

    // Parse start/end times if provided
    let parsedStartTime = null
    let parsedEndTime = null
    let calculatedHours = parseFloat(hoursWorked) || 0

    if (startTime && endTime) {
      // Combine date with time
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      parsedStartTime = new Date(parsedDate)
      parsedStartTime.setUTCHours(startHour, startMin, 0, 0)
      
      parsedEndTime = new Date(parsedDate)
      parsedEndTime.setUTCHours(endHour, endMin, 0, 0)
      
      if (parsedEndTime < parsedStartTime) {
        // End time is next day
        parsedEndTime.setUTCDate(parsedEndTime.getUTCDate() + 1)
      }
      
      // Calculate hours
      const diffMs = parsedEndTime - parsedStartTime
      const diffHours = diffMs / (1000 * 60 * 60)
      const breakHours = (parseFloat(breakMinutes) || 0) / 60
      calculatedHours = Math.max(0, diffHours - breakHours)
    }

    // Get employee to check pay type and calculate overtime
    const employeeDoc = await Employee.findById(employee)
    if (!employeeDoc) {
      req.flash('error', 'Employee not found')
      return res.redirect('/time-entries/new')
    }

    // Calculate overtime (simplified: hours over 8 in a day or over 40 in a week)
    let calculatedOvertime = parseFloat(overtimeHours) || 0
    if (type === 'regular' && calculatedHours > 0) {
      // Check if hours exceed daily limit (8 hours)
      if (calculatedHours > 8) {
        calculatedOvertime = calculatedHours - 8
      }
      // TODO: Add weekly overtime calculation (check total hours for the week)
    }

    const timeEntry = new TimeEntry({
      employee,
      date: parsedDate,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      hoursWorked: calculatedHours,
      breakMinutes: parseFloat(breakMinutes) || 0,
      overtimeHours: calculatedOvertime,
      type: type || 'regular',
      projectOrJobId: projectOrJobId || null,
      jobName: jobName || null,
      notes: notes || '',
      approved: false
    })

    await timeEntry.save()

    req.flash('success', 'Time entry created successfully')
    res.redirect(`/time-entries/${timeEntry._id}`)
  } catch (error) {
    console.error('Error creating time entry:', error)
    req.flash('error', error.message || 'Error creating time entry')
    res.redirect('/time-entries/new')
  }
}

exports.detail = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)
      .populate('employee')
      .populate('approvedBy', 'name')

    if (!timeEntry) {
      req.flash('error', 'Time entry not found')
      return res.redirect('/time-entries')
    }

    res.render('time-entries/detail', {
      title: 'Time Entry Details',
      timeEntry,
      user: req.user
    })
  } catch (error) {
    console.error('Error loading time entry:', error)
    req.flash('error', 'Error loading time entry')
    res.redirect('/time-entries')
  }
}

exports.editForm = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)
      .populate('employee')

    if (!timeEntry) {
      req.flash('error', 'Time entry not found')
      return res.redirect('/time-entries')
    }

    const employees = await Employee.find({ status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .lean()

    res.render('time-entries/form', {
      title: 'Edit Time Entry',
      timeEntry,
      employees,
      selectedEmployeeId: timeEntry.employee._id.toString()
    })
  } catch (error) {
    req.flash('error', 'Error loading time entry')
    res.redirect('/time-entries')
  }
}

exports.update = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)

    if (!timeEntry) {
      req.flash('error', 'Time entry not found')
      return res.redirect('/time-entries')
    }

    // Check if time entry is in a locked pay period
    const payPeriods = await PayPeriod.find({
      status: 'locked',
      startDate: { $lte: timeEntry.date },
      endDate: { $gte: timeEntry.date }
    })

    if (payPeriods.length > 0) {
      req.flash('error', 'Cannot edit time entry: it is in a locked pay period')
      return res.redirect(`/time-entries/${timeEntry._id}`)
    }

    const {
      employee,
      date,
      startTime,
      endTime,
      hoursWorked,
      breakMinutes,
      overtimeHours,
      type,
      projectOrJobId,
      jobName,
      notes
    } = req.body

    // Parse date
    let parsedDate = null
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      parsedDate = new Date(Date.UTC(year, month - 1, day))
    }

    // Parse start/end times if provided
    let parsedStartTime = null
    let parsedEndTime = null
    let calculatedHours = parseFloat(hoursWorked) || 0

    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      
      parsedStartTime = new Date(parsedDate)
      parsedStartTime.setUTCHours(startHour, startMin, 0, 0)
      
      parsedEndTime = new Date(parsedDate)
      parsedEndTime.setUTCHours(endHour, endMin, 0, 0)
      
      if (parsedEndTime < parsedStartTime) {
        parsedEndTime.setUTCDate(parsedEndTime.getUTCDate() + 1)
      }
      
      const diffMs = parsedEndTime - parsedStartTime
      const diffHours = diffMs / (1000 * 60 * 60)
      const breakHours = (parseFloat(breakMinutes) || 0) / 60
      calculatedHours = Math.max(0, diffHours - breakHours)
    }

    // Calculate overtime
    let calculatedOvertime = parseFloat(overtimeHours) || 0
    if (type === 'regular' && calculatedHours > 0) {
      if (calculatedHours > 8) {
        calculatedOvertime = calculatedHours - 8
      }
    }

    timeEntry.employee = employee
    timeEntry.date = parsedDate
    timeEntry.startTime = parsedStartTime
    timeEntry.endTime = parsedEndTime
    timeEntry.hoursWorked = calculatedHours
    timeEntry.breakMinutes = parseFloat(breakMinutes) || 0
    timeEntry.overtimeHours = calculatedOvertime
    timeEntry.type = type || 'regular'
    timeEntry.projectOrJobId = projectOrJobId || null
    timeEntry.jobName = jobName || null
    timeEntry.notes = notes || ''
    // Reset approval if hours changed
    if (timeEntry.approved && (timeEntry.hoursWorked !== calculatedHours || timeEntry.overtimeHours !== calculatedOvertime)) {
      timeEntry.approved = false
      timeEntry.approvedBy = null
    }

    await timeEntry.save()

    req.flash('success', 'Time entry updated successfully')
    res.redirect(`/time-entries/${timeEntry._id}`)
  } catch (error) {
    console.error('Error updating time entry:', error)
    req.flash('error', error.message || 'Error updating time entry')
    res.redirect(`/time-entries/${req.params.id}/edit`)
  }
}

exports.approve = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)

    if (!timeEntry) {
      req.flash('error', 'Time entry not found')
      return res.redirect('/time-entries')
    }

    timeEntry.approved = true
    timeEntry.approvedBy = req.user._id

    await timeEntry.save()

    req.flash('success', 'Time entry approved')
    res.redirect(`/time-entries/${timeEntry._id}`)
  } catch (error) {
    console.error('Error approving time entry:', error)
    req.flash('error', 'Error approving time entry')
    res.redirect(`/time-entries/${req.params.id}`)
  }
}

