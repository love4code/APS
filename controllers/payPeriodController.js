const PayPeriod = require('../models/PayPeriod')
const TimeEntry = require('../models/TimeEntry')
const PayrollRecord = require('../models/PayrollRecord')
const Employee = require('../models/Employee')
const PercentagePayout = require('../models/PercentagePayout')

exports.list = async (req, res) => {
  try {
    const statusFilter = req.query.status || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const query = {}
    if (statusFilter) {
      query.status = statusFilter
    }

    const payPeriods = await PayPeriod.find(query)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Get summary stats for each pay period
    for (const period of payPeriods) {
      const records = await PayrollRecord.find({ payPeriod: period._id }).lean()
      period.totalEmployees = records.length
      period.totalGrossPay = records.reduce(
        (sum, r) => sum + (r.totalGrossPay || 0),
        0
      )
      period.totalHours = records.reduce(
        (sum, r) =>
          sum + (r.totalRegularHours || 0) + (r.totalOvertimeHours || 0),
        0
      )
    }

    const total = await PayPeriod.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    res.render('pay-periods/list', {
      title: 'Pay Periods',
      payPeriods,
      statusFilter,
      currentPage: page,
      totalPages,
      total,
      limit
    })
  } catch (error) {
    console.error('Error loading pay periods:', error)
    req.flash('error', 'Error loading pay periods')
    res.redirect('/')
  }
}

exports.newForm = async (req, res) => {
  try {
    res.render('pay-periods/form', {
      title: 'New Pay Period',
      payPeriod: null
    })
  } catch (error) {
    req.flash('error', 'Error loading form')
    res.redirect('/pay-periods')
  }
}

exports.create = async (req, res) => {
  try {
    const { name, startDate, endDate, notes } = req.body

    if (!name || !startDate || !endDate) {
      req.flash('error', 'Name, start date, and end date are required')
      return res.redirect('/pay-periods/new')
    }

    // Parse dates
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
    const parsedStartDate = new Date(
      Date.UTC(startYear, startMonth - 1, startDay)
    )
    const parsedEndDate = new Date(Date.UTC(endYear, endMonth - 1, endDay))

    if (parsedEndDate < parsedStartDate) {
      req.flash('error', 'End date must be after start date')
      return res.redirect('/pay-periods/new')
    }

    const payPeriod = new PayPeriod({
      name,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status: 'open',
      notes: notes || ''
    })

    await payPeriod.save()

    req.flash('success', 'Pay period created successfully')
    res.redirect(`/pay-periods/${payPeriod._id}`)
  } catch (error) {
    console.error('Error creating pay period:', error)
    req.flash('error', error.message || 'Error creating pay period')
    res.redirect('/pay-periods/new')
  }
}

exports.detail = async (req, res) => {
  try {
    const payPeriod = await PayPeriod.findById(req.params.id)

    if (!payPeriod) {
      req.flash('error', 'Pay period not found')
      return res.redirect('/pay-periods')
    }

    // Get all time entries in this period
    const timeEntries = await TimeEntry.find({
      date: { $gte: payPeriod.startDate, $lte: payPeriod.endDate },
      approved: true
    })
      .populate(
        'employee',
        'firstName lastName hourlyRate annualSalary payType defaultOvertimeMultiplier'
      )
      .sort({ employee: 1, date: 1 })
      .lean()

    // Get payroll records if processed
    const payrollRecords = await PayrollRecord.find({
      payPeriod: payPeriod._id
    })
      .populate('employee', 'firstName lastName')
      .sort({ 'employee.lastName': 1 })
      .lean()

    // Calculate summary stats
    const summary = {
      totalEmployees: new Set(timeEntries.map(e => e.employee._id.toString()))
        .size,
      totalRegularHours: timeEntries.reduce(
        (sum, e) => sum + (e.type === 'regular' ? e.hoursWorked : 0),
        0
      ),
      totalOvertimeHours: timeEntries.reduce(
        (sum, e) => sum + (e.overtimeHours || 0),
        0
      ),
      totalPTOHours: timeEntries.reduce(
        (sum, e) =>
          sum + (e.type === 'pto' || e.type === 'sick' ? e.hoursWorked : 0),
        0
      ),
      totalGrossPay: payrollRecords.reduce(
        (sum, r) => sum + (r.totalGrossPay || 0),
        0
      )
    }

    // Group time entries by employee for display
    const employeeTimeMap = {}
    timeEntries.forEach(entry => {
      const empId = entry.employee._id.toString()
      if (!employeeTimeMap[empId]) {
        employeeTimeMap[empId] = {
          employee: entry.employee,
          entries: [],
          totalRegular: 0,
          totalOvertime: 0,
          totalPTO: 0
        }
      }
      employeeTimeMap[empId].entries.push(entry)
      if (entry.type === 'regular') {
        employeeTimeMap[empId].totalRegular += entry.hoursWorked || 0
        employeeTimeMap[empId].totalOvertime += entry.overtimeHours || 0
      } else if (entry.type === 'pto' || entry.type === 'sick') {
        employeeTimeMap[empId].totalPTO += entry.hoursWorked || 0
      }
    })

    const employeeTimeData = Object.values(employeeTimeMap)

    res.render('pay-periods/detail', {
      title: payPeriod.name,
      payPeriod,
      employeeTimeData,
      payrollRecords,
      summary
    })
  } catch (error) {
    console.error('Error loading pay period:', error)
    req.flash('error', 'Error loading pay period')
    res.redirect('/pay-periods')
  }
}

exports.lock = async (req, res) => {
  try {
    const payPeriod = await PayPeriod.findById(req.params.id)

    if (!payPeriod) {
      req.flash('error', 'Pay period not found')
      return res.redirect('/pay-periods')
    }

    payPeriod.status = 'locked'
    await payPeriod.save()

    req.flash('success', 'Pay period locked successfully')
    res.redirect(`/pay-periods/${payPeriod._id}`)
  } catch (error) {
    console.error('Error locking pay period:', error)
    req.flash('error', 'Error locking pay period')
    res.redirect(`/pay-periods/${req.params.id}`)
  }
}

exports.process = async (req, res) => {
  try {
    const payPeriod = await PayPeriod.findById(req.params.id)

    if (!payPeriod) {
      req.flash('error', 'Pay period not found')
      return res.redirect('/pay-periods')
    }

    if (payPeriod.status !== 'locked') {
      req.flash('error', 'Pay period must be locked before processing')
      return res.redirect(`/pay-periods/${payPeriod._id}`)
    }

    // Get all approved time entries in this period
    const timeEntries = await TimeEntry.find({
      date: { $gte: payPeriod.startDate, $lte: payPeriod.endDate },
      approved: true
    })
      .populate('employee')
      .lean()

    // Group by employee
    const employeeTimeMap = {}
    timeEntries.forEach(entry => {
      const empId = entry.employee._id.toString()
      if (!employeeTimeMap[empId]) {
        employeeTimeMap[empId] = {
          employee: entry.employee,
          entries: []
        }
      }
      employeeTimeMap[empId].entries.push(entry)
    })

    // Calculate payroll for each employee
    for (const empId in employeeTimeMap) {
      const { employee, entries } = employeeTimeMap[empId]

      // Calculate totals
      let totalRegularHours = 0
      let totalOvertimeHours = 0
      let totalPTOHours = 0

      entries.forEach(entry => {
        if (entry.type === 'regular') {
          totalRegularHours += entry.hoursWorked || 0
          totalOvertimeHours += entry.overtimeHours || 0
        } else if (entry.type === 'pto' || entry.type === 'sick') {
          totalPTOHours += entry.hoursWorked || 0
        }
      })

      // Calculate gross pay from time entries
      let totalGrossPay = 0
      const overtimeMultiplier = employee.defaultOvertimeMultiplier || 1.5

      if (
        Array.isArray(employee.payType) &&
        employee.payType.includes('hourly')
      ) {
        const regularPay = totalRegularHours * (employee.hourlyRate || 0)
        const overtimePay =
          totalOvertimeHours * (employee.hourlyRate || 0) * overtimeMultiplier
        const ptoPay = totalPTOHours * (employee.hourlyRate || 0)
        totalGrossPay = regularPay + overtimePay + ptoPay
      } else if (employee.payType === 'hourly') {
        const regularPay = totalRegularHours * (employee.hourlyRate || 0)
        const overtimePay =
          totalOvertimeHours * (employee.hourlyRate || 0) * overtimeMultiplier
        const ptoPay = totalPTOHours * (employee.hourlyRate || 0)
        totalGrossPay = regularPay + overtimePay + ptoPay
      } else if (
        Array.isArray(employee.payType) &&
        employee.payType.includes('salary')
      ) {
        // For salary, calculate based on pay period length
        const daysInPeriod =
          Math.ceil(
            (payPeriod.endDate - payPeriod.startDate) / (1000 * 60 * 60 * 24)
          ) + 1
        const dailyRate = (employee.annualSalary || 0) / 365
        totalGrossPay = dailyRate * daysInPeriod
        // PTO is typically already included in salary, but track hours
      } else if (employee.payType === 'salary') {
        // For salary, calculate based on pay period length
        const daysInPeriod =
          Math.ceil(
            (payPeriod.endDate - payPeriod.startDate) / (1000 * 60 * 60 * 24)
          ) + 1
        const dailyRate = (employee.annualSalary || 0) / 365
        totalGrossPay = dailyRate * daysInPeriod
        // PTO is typically already included in salary, but track hours
      }

      // Add daily percentage payouts for this employee during the pay period
      // Query payouts where the date falls within the pay period
      // Fetch all payouts for the period and filter in memory for reliability
      const allDailyPayouts = await PercentagePayout.find({
        date: { $gte: payPeriod.startDate, $lte: payPeriod.endDate }
      }).lean()

      let totalDailyPayoutAmount = 0
      const employeeIdStr = employee._id.toString()

      allDailyPayouts.forEach(payout => {
        if (payout.employeePayouts && payout.employeePayouts.length > 0) {
          payout.employeePayouts.forEach(ep => {
            if (!ep.employee || ep.payType !== 'percentage') return

            // Handle both populated and unpopulated employee cases
            let empId = null
            if (typeof ep.employee === 'object' && ep.employee._id) {
              empId = ep.employee._id.toString()
            } else if (typeof ep.employee === 'object') {
              empId = ep.employee.toString()
            } else {
              empId = String(ep.employee)
            }

            if (empId === employeeIdStr) {
              totalDailyPayoutAmount += ep.payoutAmount || 0
            }
          })
        }
      })

      // Add daily payouts to gross pay
      totalGrossPay += totalDailyPayoutAmount

      // Check if payroll record already exists
      let payrollRecord = await PayrollRecord.findOne({
        employee: employee._id,
        payPeriod: payPeriod._id
      })

      if (payrollRecord) {
        // Update existing record
        payrollRecord.totalRegularHours = totalRegularHours
        payrollRecord.totalOvertimeHours = totalOvertimeHours
        payrollRecord.totalPTOHours = totalPTOHours
        payrollRecord.totalGrossPay = totalGrossPay
        payrollRecord.totalDailyPayouts = totalDailyPayoutAmount
        payrollRecord.overtimeMultiplierUsed = overtimeMultiplier
      } else {
        // Create new record
        payrollRecord = new PayrollRecord({
          employee: employee._id,
          payPeriod: payPeriod._id,
          totalRegularHours,
          totalOvertimeHours,
          totalPTOHours,
          totalGrossPay,
          totalDailyPayouts: totalDailyPayoutAmount,
          overtimeMultiplierUsed: overtimeMultiplier,
          paymentStatus: 'unpaid'
        })
      }

      await payrollRecord.save()
    }

    payPeriod.status = 'processed'
    await payPeriod.save()

    req.flash('success', 'Pay period processed successfully')
    res.redirect(`/pay-periods/${payPeriod._id}`)
  } catch (error) {
    console.error('Error processing pay period:', error)
    req.flash('error', error.message || 'Error processing pay period')
    res.redirect(`/pay-periods/${req.params.id}`)
  }
}
