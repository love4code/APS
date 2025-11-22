const PercentagePayout = require('../models/PercentagePayout')
const Employee = require('../models/Employee')
const TimeEntry = require('../models/TimeEntry')
const mongoose = require('mongoose')

// Get form for calculating daily payout
exports.calculateForm = async (req, res) => {
  try {
    const date = req.query.date // Optional date parameter

    // Get all employees with percentage OR hourly pay type (for daily payout)
    // payType is an array, so we need to check if it contains percentage or hourly
    let employees = await Employee.find({
      status: 'active',
      payType: { $in: ['percentage', 'hourly'] }
    })
      .sort({ lastName: 1, firstName: 1 })
      .lean()

    // If date is provided, also get employees who worked that day (from time entries)
    let employeesWhoWorked = []
    let timeEntriesByEmployee = {} // Map employee ID to their time entries for easy lookup
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      // Time entries store dates in local time, so use local time for matching
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

      // Query for time entries on this date (include all, not just approved)
      // Try matching by date range - dates are stored as Date objects
      const timeEntries = await TimeEntry.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      })
        .populate(
          'employee',
          '_id firstName lastName hourlyRate payType defaultOvertimeMultiplier'
        )
        .lean()

      console.log(
        `[Payout Form] Date: ${date}, Found ${timeEntries.length} time entries`
      )

      // Get unique employees who worked that day (including ALL employees, not just percentage ones)
      const employeeIds = [
        ...new Set(
          timeEntries
            .map(te => {
              if (te.employee && te.employee._id) {
                return te.employee._id.toString()
              }
              return null
            })
            .filter(Boolean)
        )
      ]

      console.log(
        `[Payout Form] Unique employee IDs: ${employeeIds.length}`,
        employeeIds
      )

      if (employeeIds.length > 0) {
        employeesWhoWorked = await Employee.find({
          _id: { $in: employeeIds }
        })
          .sort({ lastName: 1, firstName: 1 })
          .lean()

        console.log(
          `[Payout Form] Loaded ${employeesWhoWorked.length} employee records`
        )
      }

      // Calculate labor cost and total hours for each employee who worked
      employeesWhoWorked = employeesWhoWorked.map(emp => {
        const empTimeEntries = timeEntries.filter(
          te => te.employee && te.employee._id.toString() === emp._id.toString()
        )

        // Store time entries for this employee for later lookup
        timeEntriesByEmployee[emp._id.toString()] = empTimeEntries.map(
          entry => ({
            hoursWorked: entry.hoursWorked || 0,
            overtimeHours: entry.overtimeHours || 0,
            flatRate: entry.flatRate || 0,
            gasMoney: entry.gasMoney || 0
          })
        )

        let laborCost = 0
        let totalHours = 0
        let totalFlatRate = 0
        empTimeEntries.forEach(entry => {
          // If flat rate is set, use flat rate instead of calculating hourly pay
          if (entry.flatRate && entry.flatRate > 0) {
            totalFlatRate += entry.flatRate
            laborCost += entry.flatRate
          } else {
            // Calculate hourly pay only if no flat rate
            const regularHours =
              (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
            const overtimeHours = entry.overtimeHours || 0
            const hourlyRate = entry.employee?.hourlyRate || emp.hourlyRate || 0
            const overtimeMultiplier =
              entry.employee?.defaultOvertimeMultiplier ||
              emp.defaultOvertimeMultiplier ||
              1.5

            laborCost +=
              regularHours * hourlyRate +
              overtimeHours * hourlyRate * overtimeMultiplier
            totalHours += entry.hoursWorked || 0
          }
        })

        return {
          ...emp,
          laborCost: laborCost,
          hoursWorked: totalHours,
          flatRate: totalFlatRate,
          timeEntriesCount: empTimeEntries.length
        }
      })
    }

    res.json({
      success: true,
      employees,
      employeesWhoWorked,
      timeEntriesByEmployee, // Map of employee ID to their time entries for the date
      date
    })
  } catch (error) {
    console.error('Error loading payout form:', error)
    res.status(500).json({
      success: false,
      error: 'Error loading payout form'
    })
  }
}

// Calculate and save daily payout
exports.calculate = async (req, res) => {
  try {
    const {
      date,
      employeePayouts, // Array of {employeeId, percentageRate, laborCost}
      totalRevenue,
      jobCosts,
      materials,
      laborCosts, // Can be auto-calculated or manually entered
      notes
    } = req.body

    if (
      !date ||
      !totalRevenue ||
      !employeePayouts ||
      employeePayouts.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Date, total revenue, and at least one employee payout are required'
      })
    }

    // Parse date
    const [year, month, day] = date.split('-').map(Number)
    const parsedDate = new Date(year, month - 1, day)

    // Calculate labor costs from hourly payouts in employeePayouts array
    // Labor costs = sum of all hourly worker payouts for the day
    let calculatedLaborCosts = 0

    console.log(
      `[Payout Calculate] Starting labor cost calculation. Employee payouts count: ${employeePayouts.length}`
    )
    console.log(
      `[Payout Calculate] Employee payouts data:`,
      JSON.stringify(employeePayouts, null, 2)
    )

    // ALWAYS calculate from hourly payouts in the form first (before profit calculation)
    for (const payout of employeePayouts) {
      const payType = payout.payType || 'percentage'
      console.log(
        `[Payout Calculate] Processing payout: payType=${payType}, employeeId=${payout.employeeId}, hourlyRate=${payout.hourlyRate}, hours=${payout.hours}`
      )

      if (payType === 'hourly') {
        // Get employee to get hourly rate if not provided
        const employee = await Employee.findById(payout.employeeId)
        const hourlyRate =
          parseFloat(payout.hourlyRate) ||
          (employee ? employee.hourlyRate : 0) ||
          0
        const hours = parseFloat(payout.hours) || 0
        const hourlyPayout = hourlyRate * hours
        calculatedLaborCosts += hourlyPayout
        console.log(
          `[Payout Calculate] Hourly worker: ${
            employee ? employee.firstName + ' ' + employee.lastName : 'Unknown'
          }, Rate: $${hourlyRate}, Hours: ${hours}, Labor Cost: $${hourlyPayout}`
        )
      }
    }

    console.log(
      `[Payout Calculate] Total labor costs from hourly payouts: $${calculatedLaborCosts}`
    )

    // If no hourly payouts found, try manually provided value
    if (
      calculatedLaborCosts === 0 &&
      laborCosts &&
      parseFloat(laborCosts) > 0
    ) {
      calculatedLaborCosts = parseFloat(laborCosts)
      console.log(
        `[Payout Calculate] Using manually provided labor costs: $${calculatedLaborCosts}`
      )
    }

    // If still 0, try to calculate from time entries as fallback
    if (calculatedLaborCosts === 0) {
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

      const timeEntries = await TimeEntry.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        approved: true
      })
        .populate('employee', 'hourlyRate payType defaultOvertimeMultiplier')
        .lean()

      calculatedLaborCosts = timeEntries.reduce((total, entry) => {
        // If flat rate is set, use flat rate instead of calculating hourly pay
        if (entry.flatRate && entry.flatRate > 0) {
          return total + entry.flatRate
        }

        if (!entry.employee || !entry.employee.hourlyRate) return total

        const regularHours =
          (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
        const overtimeHours = entry.overtimeHours || 0
        const hourlyRate = entry.employee.hourlyRate
        const overtimeMultiplier =
          entry.employee.defaultOvertimeMultiplier || 1.5

        return (
          total +
          regularHours * hourlyRate +
          overtimeHours * hourlyRate * overtimeMultiplier
        )
      }, 0)
      console.log(
        `[Payout Calculate] Calculated labor costs from time entries: $${calculatedLaborCosts}`
      )
    }

    console.log(
      `[Payout Calculate] Final labor costs: $${calculatedLaborCosts}`
    )

    // Calculate flat rate and gas money from time entries for this day
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    const timeEntriesForDay = await TimeEntry.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      approved: true
    }).lean()

    const totalFlatRate = timeEntriesForDay.reduce(
      (sum, entry) => sum + (entry.flatRate || 0),
      0
    )
    const totalGasMoney = timeEntriesForDay.reduce(
      (sum, entry) => sum + (entry.gasMoney || 0),
      0
    )

    console.log(
      `[Payout Calculate] Flat rate: $${totalFlatRate}, Gas money: $${totalGasMoney}`
    )

    // Calculate final labor costs
    // If calculatedLaborCosts was calculated from time entries, it already includes flat rate
    // If calculated from form hourly payouts, we need to add flat rate
    // We can check: if calculatedLaborCosts was 0 and we calculated from time entries, it includes flat rate
    // Otherwise, if it came from form hourly payouts, we need to add flat rate
    // The safest approach: always recalculate from time entries to ensure accuracy
    let finalLaborCosts = calculatedLaborCosts

    // If we calculated from form hourly payouts (not from time entries), add flat rate
    // We know it's from form if calculatedLaborCosts > 0 and we didn't use the time entries fallback
    // Actually, let's always ensure flat rate is included by checking time entries
    const laborCostsFromTimeEntries = timeEntriesForDay.reduce(
      (total, entry) => {
        // If flat rate is set, use flat rate instead of calculating hourly pay
        if (entry.flatRate && entry.flatRate > 0) {
          return total + entry.flatRate
        }

        if (!entry.employee || !entry.employee.hourlyRate) return total

        const regularHours =
          (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
        const overtimeHours = entry.overtimeHours || 0
        const hourlyRate = entry.employee.hourlyRate
        const overtimeMultiplier =
          entry.employee.defaultOvertimeMultiplier || 1.5

        return (
          total +
          regularHours * hourlyRate +
          overtimeHours * hourlyRate * overtimeMultiplier
        )
      },
      0
    )

    // Use the time entries calculation if it's more accurate (includes flat rate)
    // Or if calculatedLaborCosts is 0, use time entries calculation
    if (laborCostsFromTimeEntries > 0) {
      finalLaborCosts = laborCostsFromTimeEntries
      console.log(
        `[Payout Calculate] Using labor costs from time entries (includes flat rate): $${finalLaborCosts}`
      )
    } else if (calculatedLaborCosts > 0) {
      // If we have calculatedLaborCosts from form but no time entries calculation,
      // add flat rate to it
      finalLaborCosts = calculatedLaborCosts + totalFlatRate
      console.log(
        `[Payout Calculate] Adding flat rate to form labor costs: $${calculatedLaborCosts} + $${totalFlatRate} = $${finalLaborCosts}`
      )
    }

    // Calculate total costs (job costs + materials + labor costs + gas money)
    // Note: labor costs already includes flat rate
    const totalCosts =
      (parseFloat(jobCosts) || 0) +
      (parseFloat(materials) || 0) +
      finalLaborCosts +
      totalGasMoney
    const totalProfit = parseFloat(totalRevenue) - totalCosts

    // Calculate individual employee payouts
    const employeePayoutData = []
    let totalPercentagePayout = 0

    for (const payout of employeePayouts) {
      const employee = await Employee.findById(payout.employeeId)
      if (!employee) {
        continue
      }

      const payType = payout.payType || 'percentage'
      let payoutAmount = 0
      let percentageRate = null
      let hourlyRate = null
      let hours = null
      let flatRate = 0

      // Check for flat rate from time entries for this employee on this day
      const employeeTimeEntries = timeEntriesForDay.filter(
        entry =>
          entry.employee &&
          entry.employee.toString() === employee._id.toString()
      )
      flatRate = employeeTimeEntries.reduce(
        (sum, entry) => sum + (entry.flatRate || 0),
        0
      )

      if (payType === 'percentage') {
        // Get percentage rate (from form or employee's default)
        percentageRate =
          parseFloat(payout.percentageRate) || employee.percentageRate || 0

        // Calculate payout: (profit * percentageRate / 100)
        payoutAmount = (totalProfit * percentageRate) / 100
        totalPercentagePayout += payoutAmount
      } else if (payType === 'hourly') {
        // If flat rate exists, use it; otherwise calculate from hourly rate * hours
        if (flatRate > 0) {
          payoutAmount = flatRate
          // Don't set hourlyRate and hours when flat rate is used
          hourlyRate = null
          hours = null
        } else {
          // Calculate hourly payout: hourlyRate * hours
          hourlyRate = parseFloat(payout.hourlyRate) || employee.hourlyRate || 0
          hours = parseFloat(payout.hours) || 0
          payoutAmount = hourlyRate * hours
        }
        // Hourly payouts don't count toward percentage payout total
      }

      employeePayoutData.push({
        employee: employee._id,
        payType,
        percentageRate: percentageRate || null,
        hourlyRate: hourlyRate || null,
        hours: hours || null,
        flatRate: flatRate > 0 ? flatRate : null,
        payoutAmount
      })
    }

    // Calculate 20% of profit
    const profitPercentage = 20
    const calculatedPayout = (totalProfit * profitPercentage) / 100

    // Create payout record
    // finalLaborCosts already includes flat rate (calculated above)
    const payoutRecord = new PercentagePayout({
      date: parsedDate,
      employeePayouts: employeePayoutData,
      jobCosts: parseFloat(jobCosts) || 0,
      materials: parseFloat(materials) || 0,
      laborCosts: finalLaborCosts,
      totalRevenue: parseFloat(totalRevenue),
      totalCosts,
      totalProfit,
      totalPercentagePayout,
      profitPercentage,
      calculatedPayout,
      notes: notes || '',
      createdBy: req.user._id
    })

    console.log(`[Payout Save] ===== BEFORE SAVE =====`)
    console.log(`[Payout Save] Payout record to save:`, {
      date: payoutRecord.date,
      employeePayoutsCount: payoutRecord.employeePayouts
        ? payoutRecord.employeePayouts.length
        : 0,
      totalRevenue: payoutRecord.totalRevenue,
      totalCosts: payoutRecord.totalCosts,
      totalProfit: payoutRecord.totalProfit,
      laborCosts: payoutRecord.laborCosts,
      employeePayouts: payoutRecord.employeePayouts.map(ep => ({
        employee: ep.employee,
        payType: ep.payType,
        payoutAmount: ep.payoutAmount,
        hourlyRate: ep.hourlyRate,
        hours: ep.hours,
        percentageRate: ep.percentageRate
      }))
    })

    // Validate before saving
    try {
      await payoutRecord.validate()
      console.log(`[Payout Save] ✓ Validation passed`)
    } catch (validationError) {
      console.error(`[Payout Save] ✗ Validation failed:`, validationError)
      console.error(`[Payout Save] Validation errors:`, validationError.errors)
      throw validationError
    }

    try {
      await payoutRecord.save()
      console.log(`[Payout Save] ✓ Save successful`)
    } catch (saveError) {
      console.error(`[Payout Save] ✗ Save failed:`, saveError)
      console.error(`[Payout Save] Save error details:`, {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        errors: saveError.errors
      })
      throw saveError
    }

    // Debug: Log saved payout details
    const savedHourlyCount = payoutRecord.employeePayouts
      ? payoutRecord.employeePayouts.filter(ep => ep.payType === 'hourly')
          .length
      : 0
    const savedPercentageCount = payoutRecord.employeePayouts
      ? payoutRecord.employeePayouts.filter(ep => ep.payType === 'percentage')
          .length
      : 0
    console.log(`[Payout Save] ===== SAVED PAYOUT =====`)
    console.log(`[Payout Save] Payout ID: ${payoutRecord._id}`)
    console.log(`[Payout Save] Date: ${payoutRecord.date}`)
    console.log(
      `[Payout Save] Total employee payouts: ${
        payoutRecord.employeePayouts ? payoutRecord.employeePayouts.length : 0
      }`
    )
    console.log(
      `[Payout Save] Hourly count: ${savedHourlyCount}, Percentage count: ${savedPercentageCount}`
    )
    console.log(`[Payout Save] Labor costs: $${payoutRecord.laborCosts || 0}`)
    console.log(
      `[Payout Save] Total revenue: $${payoutRecord.totalRevenue || 0}`
    )
    console.log(`[Payout Save] Total profit: $${payoutRecord.totalProfit || 0}`)

    if (
      payoutRecord.employeePayouts &&
      payoutRecord.employeePayouts.length > 0
    ) {
      console.log(`[Payout Save] Employee payouts details:`)
      payoutRecord.employeePayouts.forEach((ep, idx) => {
        console.log(
          `[Payout Save]   ${idx + 1}. Employee ID: ${ep.employee}, Pay Type: ${
            ep.payType
          }, Amount: $${ep.payoutAmount || 0}`
        )
        if (ep.payType === 'hourly') {
          console.log(
            `[Payout Save]      Hourly Rate: $${ep.hourlyRate || 0}, Hours: ${
              ep.hours || 0
            }`
          )
        } else if (ep.payType === 'percentage') {
          console.log(
            `[Payout Save]      Percentage Rate: ${ep.percentageRate || 0}%`
          )
        }
      })
    }
    console.log(`[Payout Save] ===== END SAVED PAYOUT =====`)

    // Verify the payout was actually saved by querying it back
    const verifyPayout = await PercentagePayout.findById(
      payoutRecord._id
    ).lean()
    if (verifyPayout) {
      console.log(
        `[Payout Save] ✓ Verified payout exists in database: ${verifyPayout._id}`
      )
      console.log(
        `[Payout Save] Verified employee payouts count: ${
          verifyPayout.employeePayouts ? verifyPayout.employeePayouts.length : 0
        }`
      )
    } else {
      console.error(
        `[Payout Save] ✗ ERROR: Payout ${payoutRecord._id} not found after save!`
      )
    }

    res.json({
      success: true,
      payout: payoutRecord,
      message: 'Daily payout calculated and saved successfully'
    })
  } catch (error) {
    console.error('Error calculating payout:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Error calculating payout'
    })
  }
}

// List all payout records
exports.list = async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom || ''
    const dateTo = req.query.dateTo || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    const query = {}

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

    // First, check total count without pagination
    const totalCount = await PercentagePayout.countDocuments(query)
    console.log(`[Payout List] ===== QUERY PAYOUTS =====`)
    console.log(`[Payout List] Query:`, JSON.stringify(query, null, 2))
    console.log(`[Payout List] Total payouts matching query: ${totalCount}`)

    const payouts = await PercentagePayout.find(query)
      .populate('employeePayouts.employee', 'firstName lastName')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Also get hourly payouts from approved time entries
    // Group by date and calculate daily totals
    const hourlyPayoutsByDate = {}

    // Build date query for time entries
    const timeEntryQuery = { approved: true }
    if (dateFrom || dateTo) {
      timeEntryQuery.date = {}
      if (dateFrom) {
        const [year, month, day] = dateFrom.split('-').map(Number)
        timeEntryQuery.date.$gte = new Date(year, month - 1, day, 0, 0, 0, 0)
      }
      if (dateTo) {
        const [year, month, day] = dateTo.split('-').map(Number)
        timeEntryQuery.date.$lte = new Date(
          year,
          month - 1,
          day,
          23,
          59,
          59,
          999
        )
      }
    }

    // Get all hourly employees
    const hourlyEmployees = await Employee.find({
      payType: { $in: ['hourly'] },
      status: 'active'
    }).lean()

    // Get approved time entries for hourly employees
    if (hourlyEmployees.length > 0) {
      const employeeIds = hourlyEmployees.map(emp => emp._id)
      timeEntryQuery.employee = { $in: employeeIds }

      const timeEntries = await TimeEntry.find(timeEntryQuery)
        .populate(
          'employee',
          'firstName lastName hourlyRate defaultOvertimeMultiplier'
        )
        .sort({ date: -1 })
        .lean()

      // Group by date and calculate totals
      timeEntries.forEach(entry => {
        if (!entry.employee || !entry.date) return

        const dateKey = entry.date.toISOString().split('T')[0] // YYYY-MM-DD
        if (!hourlyPayoutsByDate[dateKey]) {
          hourlyPayoutsByDate[dateKey] = {
            date: entry.date,
            employeePayouts: [],
            totalRevenue: 0,
            totalCosts: 0,
            totalProfit: 0,
            calculatedPayout: 0,
            laborCosts: 0
          }
        }

        // If flat rate is set, use flat rate only
        if (entry.flatRate && entry.flatRate > 0) {
          hourlyPayoutsByDate[dateKey].laborCosts += entry.flatRate
          hourlyPayoutsByDate[dateKey].employeePayouts.push({
            employee: {
              _id: entry.employee._id,
              firstName: entry.employee.firstName,
              lastName: entry.employee.lastName
            },
            payType: 'hourly',
            hourlyRate: 0,
            hours: 0,
            flatRate: entry.flatRate,
            payoutAmount: entry.flatRate
          })
        } else {
          // Calculate hourly pay
          const regularHours =
            (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
          const overtimeHours = entry.overtimeHours || 0
          const hourlyRate = entry.employee.hourlyRate || 0
          const overtimeMultiplier =
            entry.employee.defaultOvertimeMultiplier || 1.5

          const regularPay = regularHours * hourlyRate
          const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier
          const totalPay = regularPay + overtimePay

          if (totalPay > 0) {
            hourlyPayoutsByDate[dateKey].laborCosts += totalPay
            hourlyPayoutsByDate[dateKey].employeePayouts.push({
              employee: {
                _id: entry.employee._id,
                firstName: entry.employee.firstName,
                lastName: entry.employee.lastName
              },
              payType: 'hourly',
              hourlyRate: hourlyRate,
              hours: entry.hoursWorked || 0,
              flatRate: 0,
              payoutAmount: totalPay
            })
          }
        }
      })

      // Convert hourly payouts to same format as PercentagePayout records
      const hourlyPayoutRecords = Object.values(hourlyPayoutsByDate).map(
        payout => ({
          _id: new mongoose.Types.ObjectId(), // Generate a temporary ID
          date: payout.date,
          employeePayouts: payout.employeePayouts,
          jobCosts: 0,
          materials: 0,
          laborCosts: payout.laborCosts,
          totalRevenue: 0,
          totalCosts: payout.laborCosts,
          totalProfit: 0,
          totalPercentagePayout: 0,
          calculatedPayout: 0,
          createdBy: null,
          createdAt: payout.date,
          isHourlyPayout: true // Flag to identify hourly payouts
        })
      )

      // Build a set of (date, employeeId) pairs from percentage payout records that include hourly employees
      // This prevents double-counting hourly employees who were added to daily payout records
      const hourlyInPayoutRecords = new Set()
      payouts.forEach(payout => {
        if (payout.employeePayouts && payout.employeePayouts.length > 0) {
          const payoutDateKey = payout.date
            ? new Date(payout.date).toISOString().split('T')[0]
            : null
          if (payoutDateKey) {
            payout.employeePayouts.forEach(empPayout => {
              if (empPayout.payType === 'hourly' && empPayout.employee) {
                let empId = null
                if (
                  typeof empPayout.employee === 'object' &&
                  empPayout.employee._id
                ) {
                  empId = empPayout.employee._id.toString()
                } else if (typeof empPayout.employee === 'object') {
                  empId = empPayout.employee.toString()
                } else {
                  empId = String(empPayout.employee)
                }
                if (empId) {
                  hourlyInPayoutRecords.add(`${payoutDateKey}-${empId}`)
                }
              }
            })
          }
        }
      })

      // Filter out hourly payouts that are already in payout records
      const filteredHourlyPayoutRecords = hourlyPayoutRecords.filter(
        hourlyPayout => {
          const dateKey = hourlyPayout.date
            ? new Date(hourlyPayout.date).toISOString().split('T')[0]
            : null
          if (!dateKey) return true

          // Check if any employee in this hourly payout is already in a payout record
          const hasDuplicate = hourlyPayout.employeePayouts.some(ep => {
            if (!ep.employee) return false
            const empId = ep.employee._id
              ? ep.employee._id.toString()
              : String(ep.employee)
            return hourlyInPayoutRecords.has(`${dateKey}-${empId}`)
          })

          return !hasDuplicate
        }
      )

      // Merge with regular payouts and sort by date
      const allPayouts = [...payouts, ...filteredHourlyPayoutRecords].sort(
        (a, b) => {
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          return dateB - dateA
        }
      )

      // Get all employees for employee totals
      const allEmployees = await Employee.find({})
        .select('_id firstName lastName status')
        .lean()

      const allEmployeeIds = new Set(
        allEmployees.map(emp => emp._id.toString())
      )

      // Group payouts by employee and calculate totals
      const employeeTotals = {}

      allPayouts.forEach(payout => {
        if (payout.employeePayouts && payout.employeePayouts.length > 0) {
          payout.employeePayouts.forEach(empPayout => {
            if (!empPayout.employee) return

            let empId = null
            if (
              typeof empPayout.employee === 'object' &&
              empPayout.employee._id
            ) {
              empId = empPayout.employee._id.toString()
            } else if (typeof empPayout.employee === 'object') {
              empId = empPayout.employee.toString()
            } else {
              empId = String(empPayout.employee)
            }

            if (!empId || !allEmployeeIds.has(empId)) return

            let employeeObj = null
            if (
              typeof empPayout.employee === 'object' &&
              empPayout.employee._id
            ) {
              employeeObj = empPayout.employee
            } else {
              employeeObj = allEmployees.find(
                emp => emp._id.toString() === empId
              )
            }

            if (!employeeObj) return

            if (!employeeTotals[empId]) {
              employeeTotals[empId] = {
                employee: employeeObj,
                totalPayout: 0,
                payoutCount: 0,
                payouts: []
              }
            }

            employeeTotals[empId].totalPayout += empPayout.payoutAmount || 0
            employeeTotals[empId].payoutCount += 1
            employeeTotals[empId].payouts.push({
              date: payout.date,
              createdAt: payout.createdAt || payout.date,
              payoutAmount: empPayout.payoutAmount || 0,
              payType: empPayout.payType,
              percentageRate: empPayout.percentageRate,
              hourlyRate: empPayout.hourlyRate,
              hours: empPayout.hours,
              payoutId: payout._id
            })
          })
        }
      })

      // Convert to array and sort by total payout descending
      const employeeTotalsArray = Object.values(employeeTotals).sort(
        (a, b) => b.totalPayout - a.totalPayout
      )

      // Calculate summary totals
      const totalEmployeePayout = employeeTotalsArray.reduce(
        (sum, empTotal) => sum + (empTotal.totalPayout || 0),
        0
      )
      const totalRevenue = allPayouts.reduce(
        (sum, p) => sum + (p.totalRevenue || 0),
        0
      )
      const summaryTotal = {
        totalRevenue: totalRevenue,
        totalCosts: allPayouts.reduce((sum, p) => sum + (p.totalCosts || 0), 0),
        totalProfit: totalRevenue - totalEmployeePayout,
        totalEmployeePayout: totalEmployeePayout
      }

      // Apply pagination to merged list
      const paginatedPayouts = allPayouts.slice(skip, skip + limit)
      const total = allPayouts.length
      const totalPages = Math.ceil(total / limit)

      // Debug: Log payout details
      console.log(
        `[Payout List] Retrieved ${payouts.length} percentage payouts, ${filteredHourlyPayoutRecords.length} hourly payout days`
      )
      console.log(
        `[Payout List] Total combined: ${total} payouts, showing page ${page} of ${totalPages}`
      )

      console.log(`[Payout List] ===== END QUERY PAYOUTS =====`)

      return res.render('percentage-payouts/list', {
        title: 'Daily Payouts',
        payouts: paginatedPayouts,
        employeeTotals: employeeTotalsArray,
        summaryTotal,
        dateFrom,
        dateTo,
        currentPage: page,
        totalPages,
        total,
        limit
      })
    }

    // Get all employees for employee totals
    const allEmployees = await Employee.find({})
      .select('_id firstName lastName status')
      .lean()

    const allEmployeeIds = new Set(allEmployees.map(emp => emp._id.toString()))

    // Group payouts by employee and calculate totals
    const employeeTotals = {}

    payouts.forEach(payout => {
      if (payout.employeePayouts && payout.employeePayouts.length > 0) {
        payout.employeePayouts.forEach(empPayout => {
          if (!empPayout.employee) return

          let empId = null
          if (
            typeof empPayout.employee === 'object' &&
            empPayout.employee._id
          ) {
            empId = empPayout.employee._id.toString()
          } else if (typeof empPayout.employee === 'object') {
            empId = empPayout.employee.toString()
          } else {
            empId = String(empPayout.employee)
          }

          if (!empId || !allEmployeeIds.has(empId)) return

          let employeeObj = null
          if (
            typeof empPayout.employee === 'object' &&
            empPayout.employee._id
          ) {
            employeeObj = empPayout.employee
          } else {
            employeeObj = allEmployees.find(emp => emp._id.toString() === empId)
          }

          if (!employeeObj) return

          if (!employeeTotals[empId]) {
            employeeTotals[empId] = {
              employee: employeeObj,
              totalPayout: 0,
              payoutCount: 0,
              payouts: []
            }
          }

          employeeTotals[empId].totalPayout += empPayout.payoutAmount || 0
          employeeTotals[empId].payoutCount += 1
          employeeTotals[empId].payouts.push({
            date: payout.date,
            createdAt: payout.createdAt || payout.date,
            payoutAmount: empPayout.payoutAmount || 0,
            payType: empPayout.payType,
            percentageRate: empPayout.percentageRate,
            hourlyRate: empPayout.hourlyRate,
            hours: empPayout.hours,
            payoutId: payout._id
          })
        })
      }
    })

    // Convert to array and sort by total payout descending
    const employeeTotalsArray = Object.values(employeeTotals).sort(
      (a, b) => b.totalPayout - a.totalPayout
    )

    // Calculate summary totals
    const totalEmployeePayout = employeeTotalsArray.reduce(
      (sum, empTotal) => sum + (empTotal.totalPayout || 0),
      0
    )
    const totalRevenue = payouts.reduce(
      (sum, p) => sum + (p.totalRevenue || 0),
      0
    )
    const summaryTotal = {
      totalRevenue: totalRevenue,
      totalCosts: payouts.reduce((sum, p) => sum + (p.totalCosts || 0), 0),
      totalProfit: totalRevenue - totalEmployeePayout,
      totalEmployeePayout: totalEmployeePayout
    }

    const total = await PercentagePayout.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    console.log(`[Payout List] ===== END QUERY PAYOUTS =====`)

    res.render('percentage-payouts/list', {
      title: 'Daily Payouts',
      payouts,
      employeeTotals: employeeTotalsArray,
      summaryTotal,
      dateFrom,
      dateTo,
      currentPage: page,
      totalPages,
      total,
      limit
    })
  } catch (error) {
    console.error('Error loading payout records:', error)
    req.flash('error', 'Error loading payout records')
    res.redirect('/')
  }
}

// Get payout detail
exports.detail = async (req, res) => {
  try {
    const payout = await PercentagePayout.findById(req.params.id)
      .populate('employeePayouts.employee', 'firstName lastName')
      .populate('createdBy', 'name')

    if (!payout) {
      req.flash('error', 'Payout record not found')
      return res.redirect('/payouts')
    }

    // Debug: Log payout details
    const hourlyCount = payout.employeePayouts
      ? payout.employeePayouts.filter(ep => ep.payType === 'hourly').length
      : 0
    const percentageCount = payout.employeePayouts
      ? payout.employeePayouts.filter(ep => ep.payType === 'percentage').length
      : 0
    console.log(
      `[Payout Detail] Payout ${
        req.params.id
      }: ${hourlyCount} hourly, ${percentageCount} percentage, laborCosts: $${
        payout.laborCosts || 0
      }`
    )

    res.render('percentage-payouts/detail', {
      title: 'Daily Payout Details',
      payout
    })
  } catch (error) {
    console.error('Error loading payout:', error)
    req.flash('error', 'Error loading payout record')
    res.redirect('/payouts')
  }
}

// Delete payout
exports.delete = async (req, res) => {
  try {
    const payout = await PercentagePayout.findById(req.params.id)

    if (!payout) {
      req.flash('error', 'Payout record not found')
      return res.redirect('/payouts')
    }

    await payout.deleteOne()

    req.flash('success', 'Payout deleted successfully')
    res.redirect('/payouts')
  } catch (error) {
    console.error('Error deleting payout:', error)
    req.flash('error', 'Error deleting payout')
    res.redirect(`/payouts/${req.params.id}`)
  }
}

// Get weekly payouts view
exports.weekly = async (req, res) => {
  try {
    const weekStart = req.query.weekStart || ''
    const weekEnd = req.query.weekEnd || ''

    let startDate = null
    let endDate = null

    // If dates provided, parse them
    if (weekStart) {
      const [year, month, day] = weekStart.split('-').map(Number)
      startDate = new Date(Date.UTC(year, month - 1, day))
    } else {
      // Default to current week (Monday to Sunday)
      const today = new Date()
      const dayOfWeek = today.getUTCDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
      startDate = new Date(today)
      startDate.setUTCDate(today.getUTCDate() + diff)
      startDate.setUTCHours(0, 0, 0, 0)
    }

    if (weekEnd) {
      const [year, month, day] = weekEnd.split('-').map(Number)
      endDate = new Date(Date.UTC(year, month - 1, day))
      endDate.setUTCHours(23, 59, 59, 999)
    } else if (startDate) {
      // Default to Sunday of the same week
      endDate = new Date(startDate)
      endDate.setUTCDate(startDate.getUTCDate() + 6)
      endDate.setUTCHours(23, 59, 59, 999)
    }

    // Query payouts for the week based on createdAt (submission date)
    const query = {}
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate }
    }

    const payouts = await PercentagePayout.find(query)
      .populate('employeePayouts.employee', 'firstName lastName payType')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 })
      .lean()

    // Build a set of (date, employeeId) pairs from percentage payout records that include hourly employees
    // This prevents double-counting hourly employees who were added to daily payout records
    const hourlyInPayoutRecords = new Set()
    payouts.forEach(payout => {
      if (payout.employeePayouts && payout.employeePayouts.length > 0) {
        const payoutDateKey = payout.date
          ? new Date(payout.date).toISOString().split('T')[0]
          : null
        if (payoutDateKey) {
          payout.employeePayouts.forEach(empPayout => {
            // Only track hourly employees in percentage payout records
            if (empPayout.payType === 'hourly' && empPayout.employee) {
              let empId = null
              if (
                typeof empPayout.employee === 'object' &&
                empPayout.employee._id
              ) {
                empId = empPayout.employee._id.toString()
              } else if (typeof empPayout.employee === 'object') {
                empId = empPayout.employee.toString()
              } else {
                empId = String(empPayout.employee)
              }
              if (empId) {
                hourlyInPayoutRecords.add(`${payoutDateKey}-${empId}`)
                console.log(
                  `[Weekly Payouts] Hourly employee ${empId} already in payout record for ${payoutDateKey}, will exclude from time entries`
                )
              }
            }
          })
        }
      }
    })

    // Also get hourly payouts from approved time entries for the week
    const hourlyPayoutsByDate = {}

    if (startDate && endDate) {
      // Get all hourly employees
      const hourlyEmployees = await Employee.find({
        payType: { $in: ['hourly'] },
        status: 'active'
      }).lean()

      if (hourlyEmployees.length > 0) {
        const employeeIds = hourlyEmployees.map(emp => emp._id)

        // Convert UTC dates to local dates for time entry query
        const localStartDate = new Date(startDate)
        const localEndDate = new Date(endDate)

        const timeEntries = await TimeEntry.find({
          employee: { $in: employeeIds },
          approved: true,
          date: { $gte: localStartDate, $lte: localEndDate }
        })
          .populate(
            'employee',
            'firstName lastName hourlyRate defaultOvertimeMultiplier payType'
          )
          .sort({ date: 1 })
          .lean()

        // Group by date and calculate totals
        timeEntries.forEach(entry => {
          if (!entry.employee || !entry.date) return

          const dateKey = entry.date.toISOString().split('T')[0] // YYYY-MM-DD
          const empId = entry.employee._id.toString()
          const dateEmpKey = `${dateKey}-${empId}`

          // Skip if this hourly employee is already in a payout record for this date
          if (hourlyInPayoutRecords.has(dateEmpKey)) {
            console.log(
              `[Weekly Payouts] Skipping time entry for hourly employee ${empId} on ${dateKey} - already in payout record`
            )
            return
          }

          if (!hourlyPayoutsByDate[dateKey]) {
            hourlyPayoutsByDate[dateKey] = {
              date: entry.date,
              createdAt: entry.date, // Use date as createdAt for sorting
              employeePayouts: []
            }
          }

          // If flat rate is set, use flat rate only
          if (entry.flatRate && entry.flatRate > 0) {
            hourlyPayoutsByDate[dateKey].employeePayouts.push({
              employee: {
                _id: entry.employee._id,
                firstName: entry.employee.firstName,
                lastName: entry.employee.lastName,
                payType: 'hourly'
              },
              payType: 'hourly',
              hourlyRate: 0,
              hours: 0,
              flatRate: entry.flatRate,
              payoutAmount: entry.flatRate
            })
          } else {
            // Calculate hourly pay
            const regularHours =
              (entry.hoursWorked || 0) - (entry.overtimeHours || 0)
            const overtimeHours = entry.overtimeHours || 0
            const hourlyRate = entry.employee.hourlyRate || 0
            const overtimeMultiplier =
              entry.employee.defaultOvertimeMultiplier || 1.5

            const regularPay = regularHours * hourlyRate
            const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier
            const totalPay = regularPay + overtimePay

            if (totalPay > 0) {
              hourlyPayoutsByDate[dateKey].employeePayouts.push({
                employee: {
                  _id: entry.employee._id,
                  firstName: entry.employee.firstName,
                  lastName: entry.employee.lastName,
                  payType: 'hourly'
                },
                payType: 'hourly',
                hourlyRate: hourlyRate,
                hours: entry.hoursWorked || 0,
                flatRate: 0,
                payoutAmount: totalPay
              })
            }
          }
        })
      }
    }

    // Get ALL employees (not just active) to include historical payouts
    const allEmployees = await Employee.find({})
      .select('_id firstName lastName status')
      .lean()

    const employeeIds = new Set(allEmployees.map(emp => emp._id.toString()))
    console.log(
      `[Weekly Payouts] Found ${allEmployees.length} total employees (including inactive)`
    )

    // Convert hourly payouts to same format as PercentagePayout records
    const hourlyPayoutRecords = Object.values(hourlyPayoutsByDate).map(
      payout => ({
        _id: new mongoose.Types.ObjectId(),
        date: payout.date,
        createdAt: payout.createdAt,
        employeePayouts: payout.employeePayouts,
        isHourlyPayout: true
      })
    )

    // Combine with regular payouts
    const allPayoutsForWeek = [...payouts, ...hourlyPayoutRecords]

    // Debug: Log all payouts found
    console.log(
      `[Weekly Payouts] Found ${payouts.length} percentage payouts, ${hourlyPayoutRecords.length} hourly payout days`
    )
    console.log(
      `[Weekly Payouts] Total combined: ${allPayoutsForWeek.length} payouts for the week`
    )
    allPayoutsForWeek.forEach((payout, idx) => {
      const hourlyCount = payout.employeePayouts
        ? payout.employeePayouts.filter(ep => ep.payType === 'hourly').length
        : 0
      const percentageCount = payout.employeePayouts
        ? payout.employeePayouts.filter(ep => ep.payType === 'percentage')
            .length
        : 0
      console.log(
        `[Weekly Payouts] Payout ${idx + 1} (${
          payout.isHourlyPayout ? 'Hourly' : 'Percentage'
        }): ${hourlyCount} hourly, ${percentageCount} percentage`
      )
    })

    // Group payouts by employee and calculate weekly totals (all payouts)
    const employeeWeeklyTotals = {}

    allPayoutsForWeek.forEach(payout => {
      if (payout.employeePayouts && payout.employeePayouts.length > 0) {
        payout.employeePayouts.forEach(empPayout => {
          if (!empPayout.employee) {
            console.log(
              `[Weekly Payouts] Skipping payout - no employee field, payType=${empPayout.payType}`
            )
            return
          }

          // Handle both populated (object) and unpopulated (ObjectId) cases
          let empId = null
          if (
            typeof empPayout.employee === 'object' &&
            empPayout.employee._id
          ) {
            empId = empPayout.employee._id.toString()
          } else if (typeof empPayout.employee === 'object') {
            empId = empPayout.employee.toString()
          } else {
            empId = String(empPayout.employee)
          }

          if (!empId) {
            console.log(
              `[Weekly Payouts] Skipping payout - could not extract employee ID, payType=${empPayout.payType}`
            )
            return
          }

          if (!employeeIds.has(empId)) {
            console.log(
              `[Weekly Payouts] Skipping payout - employee ${empId} not in active employees list, payType=${empPayout.payType}`
            )
            return
          }

          // Include ALL payouts (percentage and hourly)
          console.log(
            `[Weekly Payouts] Processing payout for employee ${empId}, payType=${empPayout.payType}, amount=${empPayout.payoutAmount}`
          )

          // Get employee object (either from populated field or fetch from allEmployees)
          let employeeObj = null
          if (
            typeof empPayout.employee === 'object' &&
            empPayout.employee._id
          ) {
            employeeObj = empPayout.employee
          } else {
            // Find employee from allEmployees array
            employeeObj = allEmployees.find(emp => emp._id.toString() === empId)
          }

          if (!employeeObj) {
            console.log(
              `[Weekly Payouts] Skipping payout - could not find employee object for ${empId}, payType=${empPayout.payType}`
            )
            return
          }

          if (!employeeWeeklyTotals[empId]) {
            employeeWeeklyTotals[empId] = {
              employee: employeeObj,
              totalPayout: 0,
              payoutCount: 0,
              payouts: []
            }
          }
          employeeWeeklyTotals[empId].totalPayout += empPayout.payoutAmount || 0
          employeeWeeklyTotals[empId].payoutCount += 1
          employeeWeeklyTotals[empId].payouts.push({
            date: payout.date,
            createdAt: payout.createdAt, // Track submission date
            payoutAmount: empPayout.payoutAmount || 0,
            payType: empPayout.payType,
            percentageRate: empPayout.percentageRate,
            hourlyRate: empPayout.hourlyRate,
            hours: empPayout.hours,
            payoutId: payout._id
          })
        })
      }
    })

    console.log(
      `[Weekly Payouts] Employee weekly totals:`,
      Object.keys(employeeWeeklyTotals).map(empId => ({
        employeeId: empId,
        employeeName: employeeWeeklyTotals[empId].employee
          ? `${employeeWeeklyTotals[empId].employee.firstName} ${employeeWeeklyTotals[empId].employee.lastName}`
          : 'Unknown',
        totalPayout: employeeWeeklyTotals[empId].totalPayout,
        payoutCount: employeeWeeklyTotals[empId].payoutCount,
        hourlyPayouts: employeeWeeklyTotals[empId].payouts.filter(
          p => p.payType === 'hourly'
        ).length,
        percentagePayouts: employeeWeeklyTotals[empId].payouts.filter(
          p => p.payType === 'percentage'
        ).length
      }))
    )

    // Convert to array and sort by total payout descending
    const weeklyTotals = Object.values(employeeWeeklyTotals).sort(
      (a, b) => b.totalPayout - a.totalPayout
    )

    // Calculate week totals (from all payouts)
    // Filter combined payouts to only include those with at least one employee payout
    const filteredPayoutsForWeek = allPayoutsForWeek.filter(payout => {
      if (!payout.employeePayouts || payout.employeePayouts.length === 0)
        return false
      return payout.employeePayouts.some(ep => {
        if (!ep.employee) return false

        // Handle both populated and unpopulated employee cases
        let empId = null
        if (typeof ep.employee === 'object' && ep.employee._id) {
          empId = ep.employee._id.toString()
        } else if (typeof ep.employee === 'object') {
          empId = ep.employee.toString()
        } else {
          empId = String(ep.employee)
        }

        return empId && employeeIds.has(empId)
      })
    })

    // Calculate total of all employee weekly totals for company payout
    const totalEmployeeWeeklyPayouts = weeklyTotals.reduce(
      (sum, empTotal) => sum + (empTotal.totalPayout || 0),
      0
    )

    const totalRevenue = filteredPayoutsForWeek.reduce(
      (sum, p) => sum + (p.totalRevenue || 0),
      0
    )
    const totalEmployeePayout = filteredPayoutsForWeek.reduce((sum, p) => {
      // Count all payouts (percentage and hourly)
      const payoutTotal = (p.employeePayouts || []).reduce((empSum, ep) => {
        if (!ep.employee) return empSum

        // Handle both populated and unpopulated employee cases
        let empId = null
        if (typeof ep.employee === 'object' && ep.employee._id) {
          empId = ep.employee._id.toString()
        } else if (typeof ep.employee === 'object') {
          empId = ep.employee.toString()
        } else {
          empId = String(ep.employee)
        }

        if (empId && employeeIds.has(empId)) {
          return empSum + (ep.payoutAmount || 0)
        }
        return empSum
      }, 0)
      return sum + payoutTotal
    }, 0)

    const weekTotal = {
      totalRevenue: totalRevenue,
      totalCosts: filteredPayoutsForWeek.reduce(
        (sum, p) => sum + (p.totalCosts || 0),
        0
      ),
      totalProfit: totalRevenue - totalEmployeePayout,
      totalEmployeePayout: totalEmployeePayout,
      totalCompanyPayout: totalEmployeeWeeklyPayouts
    }

    res.render('percentage-payouts/weekly', {
      title: 'Weekly Payouts',
      weeklyTotals,
      weekTotal,
      weekStart: startDate ? startDate.toISOString().split('T')[0] : '',
      weekEnd: endDate ? endDate.toISOString().split('T')[0] : ''
    })
  } catch (error) {
    console.error('Error loading weekly payouts:', error)
    req.flash('error', 'Error loading weekly payouts')
    res.redirect('/payouts')
  }
}
