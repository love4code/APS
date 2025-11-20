const Employee = require('../models/Employee')
const TimeEntry = require('../models/TimeEntry')
const PayrollRecord = require('../models/PayrollRecord')
const PercentagePayout = require('../models/PercentagePayout')
const mongoose = require('mongoose')

exports.list = async (req, res) => {
  try {
    const searchQuery = req.query.search || ''
    const statusFilter = req.query.status || ''
    const departmentFilter = req.query.department || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    // Build query
    const query = {}

    if (searchQuery.trim()) {
      query.$or = [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ]
    }

    if (statusFilter) {
      query.status = statusFilter
    }

    if (departmentFilter) {
      query.department = departmentFilter
    }

    const employees = await Employee.find(query)
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Employee.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get unique departments for filter dropdown
    const departments = await Employee.distinct('department')

    res.render('employees/list', {
      title: 'Employees',
      employees,
      searchQuery,
      statusFilter,
      departmentFilter,
      departments,
      currentPage: page,
      totalPages,
      total,
      limit
    })
  } catch (error) {
    console.error('Error loading employees:', error)
    req.flash('error', 'Error loading employees')
    res.redirect('/')
  }
}

exports.newForm = async (req, res) => {
  try {
    res.render('employees/form', {
      title: 'New Employee',
      employee: null
    })
  } catch (error) {
    req.flash('error', 'Error loading form')
    res.redirect('/employees')
  }
}

exports.create = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status,
      hireDate,
      terminationDate,
      payType,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier,
      notes
    } = req.body

    // Handle payType - can be string (single) or array (multiple)
    let payTypes = []
    if (Array.isArray(payType)) {
      payTypes = payType
    } else if (payType) {
      payTypes = [payType]
    }

    // Prepare form data object for error rendering
    const formData = {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status: status || 'active',
      hireDate,
      terminationDate,
      payType: payTypes,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier: defaultOvertimeMultiplier || 1.5,
      notes
    }

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !position ||
      !department ||
      !hireDate
    ) {
      req.flash('error', 'Please fill in all required fields')
      return res.render('employees/form', {
        title: 'New Employee',
        employee: formData
      })
    }

    if (payTypes.length === 0) {
      req.flash('error', 'At least one pay type must be selected')
      return res.render('employees/form', {
        title: 'New Employee',
        employee: formData
      })
    }

    // Validate pay type specific fields
    if (payTypes.includes('hourly') && (!hourlyRate || hourlyRate <= 0)) {
      req.flash('error', 'Hourly rate is required for hourly employees')
      return res.render('employees/form', {
        title: 'New Employee',
        employee: formData
      })
    }

    if (payTypes.includes('salary') && (!annualSalary || annualSalary <= 0)) {
      req.flash('error', 'Annual salary is required for salaried employees')
      return res.render('employees/form', {
        title: 'New Employee',
        employee: formData
      })
    }

    if (
      payTypes.includes('percentage') &&
      (!percentageRate || percentageRate <= 0 || percentageRate > 100)
    ) {
      req.flash(
        'error',
        'Percentage rate is required for percentage-based employees (must be between 0 and 100)'
      )
      return res.render('employees/form', {
        title: 'New Employee',
        employee: formData
      })
    }

    // Parse dates
    let parsedHireDate = null
    let parsedTerminationDate = null

    if (hireDate) {
      const [year, month, day] = hireDate.split('-').map(Number)
      parsedHireDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (terminationDate && terminationDate.trim() !== '') {
      const [year, month, day] = terminationDate.split('-').map(Number)
      parsedTerminationDate = new Date(Date.UTC(year, month - 1, day))
    }

    const employee = new Employee({
      firstName,
      lastName,
      email,
      phone: phone || null,
      position,
      department,
      status: status || 'active',
      hireDate: parsedHireDate,
      terminationDate: parsedTerminationDate || null,
      payType: payTypes,
      hourlyRate: payTypes.includes('hourly') ? parseFloat(hourlyRate) : null,
      annualSalary: payTypes.includes('salary')
        ? parseFloat(annualSalary)
        : null,
      percentageRate: payTypes.includes('percentage')
        ? parseFloat(percentageRate)
        : null,
      defaultOvertimeMultiplier: parseFloat(defaultOvertimeMultiplier) || 1.5,
      notes: notes || ''
    })

    await employee.save()

    req.flash('success', 'Employee created successfully')
    res.redirect(`/employees/${employee._id}`)
  } catch (error) {
    console.error('Error creating employee:', error)

    // Prepare form data for error rendering
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status,
      hireDate,
      terminationDate,
      payType,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier,
      notes
    } = req.body

    let payTypes = []
    if (Array.isArray(payType)) {
      payTypes = payType
    } else if (payType) {
      payTypes = [payType]
    }

    const formData = {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status: status || 'active',
      hireDate,
      terminationDate,
      payType: payTypes,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier: defaultOvertimeMultiplier || 1.5,
      notes
    }

    if (error.code === 11000) {
      req.flash('error', 'An employee with this email already exists')
    } else {
      req.flash('error', error.message || 'Error creating employee')
    }

    return res.render('employees/form', {
      title: 'New Employee',
      employee: formData
    })
  }
}

exports.detail = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)

    if (!employee) {
      req.flash('error', 'Employee not found')
      return res.redirect('/employees')
    }

    // Get recent time entries
    const recentTimeEntries = await TimeEntry.find({ employee: employee._id })
      .sort({ date: -1 })
      .limit(10)
      .lean()

    // Get recent payroll records
    const recentPayrollRecords = await PayrollRecord.find({
      employee: employee._id
    })
      .populate('payPeriod', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    // Fetch recent percentage payouts for this employee
    // Simple approach: fetch all payouts and filter in memory
    const employeeId = employee._id
    const employeeIdStr = employeeId.toString()

    // Fetch all payouts (no limit, we'll filter)
    // Note: We need to populate employeePayouts.employee to match correctly
    const allPayouts = await PercentagePayout.find({})
      .populate('employeePayouts.employee', 'firstName lastName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean()

    console.log(`[Employee Detail] ===== START PAYOUT SEARCH =====`)
    console.log(`[Employee Detail] Employee ID: ${employeeIdStr}`)
    console.log(
      `[Employee Detail] Total payouts in database: ${allPayouts.length}`
    )

    // Debug: Log first few payouts to see their structure
    if (allPayouts.length > 0) {
      console.log(`[Employee Detail] Sample payout structure:`, {
        payoutId: allPayouts[0]._id,
        employeePayoutsCount: allPayouts[0].employeePayouts
          ? allPayouts[0].employeePayouts.length
          : 0,
        firstEmployeePayout:
          allPayouts[0].employeePayouts &&
          allPayouts[0].employeePayouts.length > 0
            ? {
                employee: allPayouts[0].employeePayouts[0].employee,
                employeeType: typeof allPayouts[0].employeePayouts[0].employee,
                payType: allPayouts[0].employeePayouts[0].payType,
                payoutAmount: allPayouts[0].employeePayouts[0].payoutAmount
              }
            : null
      })
    }
    console.log(
      `[Employee Detail] Employee ID type: ${typeof employeeId}, is ObjectId: ${
        employeeId instanceof mongoose.Types.ObjectId
      }`
    )
    console.log(
      `[Employee Detail] Fetched ${allPayouts.length} total payouts from database`
    )

    // Filter payouts to only include those with this employee
    let totalPayoutAmount = 0
    const filteredPayouts = []

    allPayouts.forEach((payout, payoutIndex) => {
      if (!payout.employeePayouts || payout.employeePayouts.length === 0) {
        return
      }

      console.log(
        `[Employee Detail] Processing payout ${payoutIndex + 1}/${
          allPayouts.length
        }:`,
        {
          payoutId: payout._id,
          employeePayoutsCount: payout.employeePayouts.length
        }
      )

      // Find this employee's payout in the array
      const empPayout = payout.employeePayouts.find((ep, epIndex) => {
        if (!ep.employee) {
          console.log(
            `[Employee Detail] Payout ${payout._id} - employeePayout ${epIndex}: no employee field, payType=${ep.payType}`
          )
          return false
        }

        // Handle different employee ID formats and compare ObjectIds properly
        let matches = false
        let epEmployeeIdStr = null

        try {
          // Extract employee ID string from various formats
          if (typeof ep.employee === 'object') {
            if (ep.employee._id) {
              // Populated employee object
              epEmployeeIdStr = ep.employee._id.toString()
            } else if (
              ep.employee.toString &&
              typeof ep.employee.toString === 'function'
            ) {
              // It's an ObjectId - call toString() directly
              epEmployeeIdStr = ep.employee.toString()
            } else {
              // Fallback: try to convert to string
              epEmployeeIdStr = String(ep.employee)
            }
          } else {
            epEmployeeIdStr = String(ep.employee)
          }

          // Simple string comparison
          matches = epEmployeeIdStr === employeeIdStr

          // Also try ObjectId.equals() if available and string comparison didn't match
          if (
            !matches &&
            typeof ep.employee === 'object' &&
            ep.employee.equals &&
            typeof ep.employee.equals === 'function' &&
            employeeId instanceof mongoose.Types.ObjectId
          ) {
            try {
              matches = ep.employee.equals(employeeId)
            } catch (e) {
              // If equals fails, stick with string comparison
            }
          }
        } catch (e) {
          console.error(`[Employee Detail] Error comparing employee ID:`, e)
          return false
        }
        if (matches) {
          console.log(`[Employee Detail] ✓ MATCH FOUND!`, {
            payoutId: payout._id,
            epEmployeeId: epEmployeeIdStr,
            employeeIdStr: employeeIdStr,
            payType: ep.payType,
            payoutAmount: ep.payoutAmount
          })
        } else if (epIndex === 0) {
          // Debug: log why it didn't match (only log first one per payout)
          console.log(
            `[Employee Detail] ✗ No match for payout ${payout._id}:`,
            {
              epEmployeeId: epEmployeeIdStr,
              employeeIdStr: employeeIdStr,
              epEmployeeType: typeof ep.employee,
              payType: ep.payType
            }
          )
        }
        return matches
      })

      if (empPayout) {
        totalPayoutAmount += empPayout.payoutAmount || 0

        // Create a payout object with only this employee's payout
        filteredPayouts.push({
          _id: payout._id,
          date: payout.date,
          createdAt: payout.createdAt,
          createdBy: payout.createdBy,
          employeePayouts: [
            {
              ...empPayout,
              employee: {
                _id: employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName
              }
            }
          ]
        })
      }
    })

    // Sort by createdAt and limit to 10 most recent
    const recentPayouts = filteredPayouts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)

    // Debug logging
    console.log(`[Employee Detail] ===== END PAYOUT SEARCH =====`)
    console.log(
      `[Employee Detail] Results: ${allPayouts.length} total payouts, ${filteredPayouts.length} filtered payouts`
    )
    console.log(
      `[Employee Detail] Total payout amount: $${(
        totalPayoutAmount || 0
      ).toFixed(2)}`
    )
    console.log(
      `[Employee Detail] Recent payouts to display: ${recentPayouts.length}`
    )

    if (recentPayouts.length > 0) {
      console.log(
        `[Employee Detail] ✓ SUCCESS - Found ${recentPayouts.length} payouts for employee`
      )
      console.log(`[Employee Detail] First payout:`, {
        payoutId: recentPayouts[0]._id,
        date: recentPayouts[0].date,
        employeePayoutsCount: recentPayouts[0].employeePayouts.length,
        firstEmployeePayout: recentPayouts[0].employeePayouts[0]
      })
    } else {
      console.log(`[Employee Detail] ✗ No payouts found for this employee`)
      if (allPayouts.length > 0) {
        console.log(`[Employee Detail] Sample payout in database:`, {
          payoutId: allPayouts[0]._id,
          employeePayoutsCount: allPayouts[0].employeePayouts
            ? allPayouts[0].employeePayouts.length
            : 0,
          firstEmployeePayout: allPayouts[0].employeePayouts
            ? allPayouts[0].employeePayouts[0]
            : null
        })
      }
    }

    // Calculate totals for this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const monthlyTimeEntries = await TimeEntry.find({
      employee: employee._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      approved: true
    }).lean()

    const monthlyStats = {
      totalHours: monthlyTimeEntries.reduce(
        (sum, entry) => sum + (entry.hoursWorked || 0),
        0
      ),
      totalOvertime: monthlyTimeEntries.reduce(
        (sum, entry) => sum + (entry.overtimeHours || 0),
        0
      ),
      totalPTO: monthlyTimeEntries
        .filter(e => e.type === 'pto' || e.type === 'sick')
        .reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0)
    }

    // Calculate hourly payout from approved time entries (for hourly employees)
    let hourlyPayoutTotal = 0
    let hourlyPayoutBreakdown = []

    if (
      employee.payType &&
      (Array.isArray(employee.payType)
        ? employee.payType.includes('hourly')
        : employee.payType === 'hourly')
    ) {
      // Get all approved time entries (not just recent ones)
      const allApprovedTimeEntries = await TimeEntry.find({
        employee: employee._id,
        approved: true
      })
        .sort({ date: -1 })
        .lean()

      // Calculate payout for each time entry
      allApprovedTimeEntries.forEach(entry => {
        const regularHours =
          (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
        const overtimeHours = entry.overtimeHours || 0
        const hourlyRate = employee.hourlyRate || 0
        const overtimeMultiplier = employee.defaultOvertimeMultiplier || 1.5

        const regularPay = regularHours * hourlyRate
        const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier
        const totalPay = regularPay + overtimePay

        if (totalPay > 0) {
          hourlyPayoutTotal += totalPay
          hourlyPayoutBreakdown.push({
            date: entry.date,
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            regularPay: regularPay,
            overtimePay: overtimePay,
            totalPay: totalPay,
            entryId: entry._id
          })
        }
      })

      // Sort breakdown by date (newest first)
      hourlyPayoutBreakdown.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    // Calculate weekly payouts for this employee
    const weekStart = req.query.weekStart || ''
    const weekEnd = req.query.weekEnd || ''

    let weekStartDate = null
    let weekEndDate = null

    // If dates provided, parse them
    if (weekStart) {
      const [year, month, day] = weekStart.split('-').map(Number)
      weekStartDate = new Date(Date.UTC(year, month - 1, day))
    } else {
      // Default to current week (Monday to Sunday)
      const today = new Date()
      const dayOfWeek = today.getUTCDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
      weekStartDate = new Date(today)
      weekStartDate.setUTCDate(today.getUTCDate() + diff)
      weekStartDate.setUTCHours(0, 0, 0, 0)
    }

    if (weekEnd) {
      const [year, month, day] = weekEnd.split('-').map(Number)
      weekEndDate = new Date(Date.UTC(year, month - 1, day))
      weekEndDate.setUTCHours(23, 59, 59, 999)
    } else if (weekStartDate) {
      // Default to Sunday of the same week
      weekEndDate = new Date(weekStartDate)
      weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6)
      weekEndDate.setUTCHours(23, 59, 59, 999)
    }

    // Query payouts for the week based on createdAt (submission date)
    const weeklyPayoutQuery = {}
    if (weekStartDate && weekEndDate) {
      weeklyPayoutQuery.createdAt = { $gte: weekStartDate, $lte: weekEndDate }
    }

    const weeklyPayouts = await PercentagePayout.find(weeklyPayoutQuery)
      .populate('employeePayouts.employee', 'firstName lastName payType')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 })
      .lean()

    // Filter payouts to only include this employee's payouts
    const employeeIdStrWeekly = employee._id.toString()
    let weeklyTotal = 0
    let weeklyPayoutCount = 0
    const weeklyPayoutDetails = []

    weeklyPayouts.forEach(payout => {
      if (payout.employeePayouts && payout.employeePayouts.length > 0) {
        payout.employeePayouts.forEach(empPayout => {
          if (!empPayout.employee) {
            return
          }

          // Extract employee ID string from various formats
          let epEmployeeIdStr = null
          try {
            if (typeof empPayout.employee === 'object') {
              if (empPayout.employee._id) {
                // Populated employee object
                epEmployeeIdStr = empPayout.employee._id.toString()
              } else if (
                empPayout.employee.toString &&
                typeof empPayout.employee.toString === 'function'
              ) {
                // It's an ObjectId - call toString() directly
                epEmployeeIdStr = empPayout.employee.toString()
              } else {
                // Fallback: try to convert to string
                epEmployeeIdStr = String(empPayout.employee)
              }
            } else {
              epEmployeeIdStr = String(empPayout.employee)
            }
          } catch (e) {
            return
          }

          // Check if this payout is for the current employee
          if (epEmployeeIdStr === employeeIdStrWeekly) {
            // Include ALL payouts (percentage and hourly)
            weeklyTotal += empPayout.payoutAmount || 0
            weeklyPayoutCount += 1
            weeklyPayoutDetails.push({
              date: payout.date,
              createdAt: payout.createdAt,
              payoutAmount: empPayout.payoutAmount || 0,
              payType: empPayout.payType,
              percentageRate: empPayout.percentageRate,
              hourlyRate: empPayout.hourlyRate,
              hours: empPayout.hours,
              payoutId: payout._id
            })
          }
        })
      }
    })

    // Sort weekly payouts by date
    weeklyPayoutDetails.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    )

    // Get payroll records for the week
    let weeklyPayroll = []
    let weeklyPayrollTotal = 0

    if (weekStartDate && weekEndDate) {
      const weeklyPayrollRecords = await PayrollRecord.find({
        employee: employee._id
      })
        .populate('payPeriod', 'name startDate endDate')
        .lean()

      // Filter payroll records to only include those that overlap with the selected week
      weeklyPayroll = weeklyPayrollRecords.filter(record => {
        if (
          !record.payPeriod ||
          !record.payPeriod.startDate ||
          !record.payPeriod.endDate
        ) {
          return false
        }
        const payPeriodStart = new Date(record.payPeriod.startDate)
        const payPeriodEnd = new Date(record.payPeriod.endDate)
        // Check if pay period overlaps with selected week
        return payPeriodStart <= weekEndDate && payPeriodEnd >= weekStartDate
      })

      // Calculate total payroll for the week (gross pay + daily payouts)
      weeklyPayrollTotal = weeklyPayroll.reduce(
        (sum, record) =>
          sum + (record.totalGrossPay || 0) + (record.totalDailyPayouts || 0),
        0
      )
    }

    res.render('employees/detail', {
      title: `${employee.firstName} ${employee.lastName}`,
      employee,
      recentTimeEntries,
      recentPayrollRecords,
      recentPayouts,
      totalPayoutAmount,
      monthlyStats,
      hourlyPayoutTotal,
      hourlyPayoutBreakdown,
      weeklyTotal,
      weeklyPayoutCount,
      weeklyPayoutDetails,
      weeklyPayroll,
      weeklyPayrollTotal,
      weekStart: weekStartDate ? weekStartDate.toISOString().split('T')[0] : '',
      weekEnd: weekEndDate ? weekEndDate.toISOString().split('T')[0] : ''
    })
  } catch (error) {
    console.error('Error loading employee:', error)
    console.error('Error stack:', error.stack)
    req.flash(
      'error',
      'Error loading employee: ' + (error.message || 'Unknown error')
    )
    res.redirect('/employees')
  }
}

exports.editForm = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)

    if (!employee) {
      req.flash('error', 'Employee not found')
      return res.redirect('/employees')
    }

    res.render('employees/form', {
      title: 'Edit Employee',
      employee
    })
  } catch (error) {
    req.flash('error', 'Error loading employee')
    res.redirect('/employees')
  }
}

exports.update = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)

    if (!employee) {
      req.flash('error', 'Employee not found')
      return res.redirect('/employees')
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status,
      hireDate,
      terminationDate,
      payType,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier,
      notes
    } = req.body

    // Handle payType - can be string (single) or array (multiple)
    let payTypes = []
    if (Array.isArray(payType)) {
      payTypes = payType
    } else if (payType) {
      payTypes = [payType]
    }

    // Prepare form data object for error rendering (merge with existing employee data)
    const formData = {
      _id: employee._id,
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status: status || employee.status,
      hireDate,
      terminationDate,
      payType: payTypes,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier:
        defaultOvertimeMultiplier || employee.defaultOvertimeMultiplier || 1.5,
      notes
    }

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !position ||
      !department ||
      !hireDate
    ) {
      req.flash('error', 'Please fill in all required fields')
      return res.render('employees/form', {
        title: 'Edit Employee',
        employee: formData
      })
    }

    if (payTypes.length === 0) {
      req.flash('error', 'At least one pay type must be selected')
      return res.render('employees/form', {
        title: 'Edit Employee',
        employee: formData
      })
    }

    // Validate pay type specific fields
    if (payTypes.includes('hourly') && (!hourlyRate || hourlyRate <= 0)) {
      req.flash('error', 'Hourly rate is required for hourly employees')
      return res.render('employees/form', {
        title: 'Edit Employee',
        employee: formData
      })
    }

    if (payTypes.includes('salary') && (!annualSalary || annualSalary <= 0)) {
      req.flash('error', 'Annual salary is required for salaried employees')
      return res.render('employees/form', {
        title: 'Edit Employee',
        employee: formData
      })
    }

    if (
      payTypes.includes('percentage') &&
      (!percentageRate || percentageRate <= 0 || percentageRate > 100)
    ) {
      req.flash(
        'error',
        'Percentage rate is required for percentage-based employees (must be between 0 and 100)'
      )
      return res.render('employees/form', {
        title: 'Edit Employee',
        employee: formData
      })
    }

    // Parse dates
    let parsedHireDate = null
    let parsedTerminationDate = null

    if (hireDate) {
      const [year, month, day] = hireDate.split('-').map(Number)
      parsedHireDate = new Date(Date.UTC(year, month - 1, day))
    }

    if (terminationDate && terminationDate.trim() !== '') {
      const [year, month, day] = terminationDate.split('-').map(Number)
      parsedTerminationDate = new Date(Date.UTC(year, month - 1, day))
    }

    employee.firstName = firstName
    employee.lastName = lastName
    employee.email = email
    employee.phone = phone || null
    employee.position = position
    employee.department = department
    employee.status = status
    employee.hireDate = parsedHireDate
    employee.terminationDate = parsedTerminationDate || null
    employee.payType = payTypes
    employee.hourlyRate = payTypes.includes('hourly')
      ? parseFloat(hourlyRate)
      : null
    employee.annualSalary = payTypes.includes('salary')
      ? parseFloat(annualSalary)
      : null
    employee.percentageRate = payTypes.includes('percentage')
      ? parseFloat(percentageRate)
      : null
    employee.defaultOvertimeMultiplier =
      parseFloat(defaultOvertimeMultiplier) || 1.5
    employee.notes = notes || ''

    await employee.save()

    req.flash('success', 'Employee updated successfully')
    res.redirect(`/employees/${employee._id}`)
  } catch (error) {
    console.error('Error updating employee:', error)

    // Prepare form data for error rendering
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status,
      hireDate,
      terminationDate,
      payType,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier,
      notes
    } = req.body

    let payTypes = []
    if (Array.isArray(payType)) {
      payTypes = payType
    } else if (payType) {
      payTypes = [payType]
    }

    const formData = {
      _id: employee._id,
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      status: status || employee.status,
      hireDate,
      terminationDate,
      payType: payTypes,
      hourlyRate,
      annualSalary,
      percentageRate,
      defaultOvertimeMultiplier:
        defaultOvertimeMultiplier || employee.defaultOvertimeMultiplier || 1.5,
      notes
    }

    if (error.code === 11000) {
      req.flash('error', 'An employee with this email already exists')
    } else {
      req.flash('error', error.message || 'Error updating employee')
    }

    return res.render('employees/form', {
      title: 'Edit Employee',
      employee: formData
    })
  }
}

exports.archive = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)

    if (!employee) {
      req.flash('error', 'Employee not found')
      return res.redirect('/employees')
    }

    const action = req.body.action || 'inactive' // inactive, terminated, on_leave

    employee.status = action
    if (action === 'terminated' && !employee.terminationDate) {
      employee.terminationDate = new Date()
    }

    await employee.save()

    req.flash('success', `Employee status updated to ${action}`)
    res.redirect(`/employees/${employee._id}`)
  } catch (error) {
    console.error('Error archiving employee:', error)
    req.flash('error', 'Error updating employee status')
    res.redirect(`/employees/${req.params.id}`)
  }
}
