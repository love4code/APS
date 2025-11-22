const Payment = require('../models/Payment')
const Job = require('../models/Job')
const User = require('../models/User')
const Employee = require('../models/Employee')
const PercentagePayout = require('../models/PercentagePayout')
const PayrollRecord = require('../models/PayrollRecord')
const mongoose = require('mongoose')

// List all payments
exports.list = async (req, res) => {
  try {
    // Get filter parameters
    const { recipient, recipientType, dateFrom, dateTo } = req.query

    // Build query
    const query = {}

    if (recipient) {
      query.recipient = recipient
    }

    if (recipientType) {
      query.recipientType = recipientType
    }

    if (dateFrom || dateTo) {
      query.datePaid = {}
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        query.datePaid.$gte = fromDate
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        query.datePaid.$lte = toDate
      }
    }

    const payments = await Payment.find(query)
      .populate('job', 'customer totalPrice')
      .populate('job.customer', 'name')
      .populate({
        path: 'recipient',
        select: 'name email firstName lastName'
      })
      .populate('createdBy', 'name')
      .sort({ datePaid: -1 })

    // Get all installers and sales reps for filter dropdown
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const employees = await Employee.find({
      status: { $in: ['active', 'inactive'] }
    }).sort({ lastName: 1, firstName: 1 })

    // Calculate totals
    const totals = {
      total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      toInstallers: payments
        .filter(p => p.recipientType === 'installer')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      toSalesReps: payments
        .filter(p => p.recipientType === 'salesRep')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      toEmployees: payments
        .filter(p => p.recipientType === 'employee')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    }

    res.render('payments/list', {
      title: 'Payments',
      payments,
      totals,
      installers,
      salesReps,
      employees,
      filters: {
        recipient: recipient || '',
        recipientType: recipientType || '',
        dateFrom: dateFrom || '',
        dateTo: dateTo || ''
      }
    })
  } catch (error) {
    console.error('Payment list error:', error)
    req.flash('error', 'Error loading payments')
    res.redirect('/')
  }
}

// Show form to create new payment
exports.newForm = async (req, res) => {
  try {
    const { jobId, recipientId, recipientType, employeeId } = req.query

    // Get jobs that have installers or sales reps
    const jobs = await Job.find()
      .populate('customer', 'name')
      .populate('installer', 'name')
      .populate('salesRep', 'name')
      .sort({ createdAt: -1 })

    // Get installers and sales reps
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const employees = await Employee.find({
      status: { $in: ['active', 'inactive'] }
    }).sort({ lastName: 1, firstName: 1 })

    // Pre-select job and recipient if provided
    let selectedJob = null
    let selectedRecipient = null
    let selectedRecipientType = recipientType || null
    let selectedRecipientModel = 'User'

    if (jobId) {
      selectedJob = await Job.findById(jobId)
        .populate('customer', 'name')
        .populate('installer', 'name')
        .populate('salesRep', 'name')
    }

    if (recipientId) {
      selectedRecipient = await User.findById(recipientId)
    } else if (employeeId) {
      // Pre-select employee
      const employee = await Employee.findById(employeeId)
      if (employee) {
        selectedRecipient = employee
        selectedRecipientType = 'employee'
        selectedRecipientModel = 'Employee'
      }
    }

    // Calculate weekly total if employeeId is provided
    let weeklyTotal = 0
    if (employeeId) {
      // Get current week (Monday to Sunday)
      const today = new Date()
      const dayOfWeek = today.getUTCDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
      const weekStartDate = new Date(today)
      weekStartDate.setUTCDate(today.getUTCDate() + diff)
      weekStartDate.setUTCHours(0, 0, 0, 0)

      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6)
      weekEndDate.setUTCHours(23, 59, 59, 999)

      // Query payouts for the week based on createdAt (submission date)
      const weeklyPayoutQuery = {
        createdAt: { $gte: weekStartDate, $lte: weekEndDate }
      }

      const weeklyPayouts = await PercentagePayout.find(weeklyPayoutQuery)
        .populate('employeePayouts.employee', 'firstName lastName payType')
        .sort({ createdAt: 1 })
        .lean()

      // Filter payouts to only include this employee's payouts
      const employeeIdStr = employeeId.toString()

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
                  epEmployeeIdStr = empPayout.employee._id.toString()
                } else if (
                  empPayout.employee.toString &&
                  typeof empPayout.employee.toString === 'function'
                ) {
                  epEmployeeIdStr = empPayout.employee.toString()
                } else {
                  epEmployeeIdStr = String(empPayout.employee)
                }
              } else {
                epEmployeeIdStr = String(empPayout.employee)
              }
            } catch (e) {
              return
            }

            // Check if this payout is for the current employee
            if (epEmployeeIdStr === employeeIdStr) {
              weeklyTotal += empPayout.payoutAmount || 0
            }
          })
        }
      })

      // Get payroll records for the week
      const weeklyPayrollRecords = await PayrollRecord.find({
        employee: employeeId
      })
        .populate('payPeriod', 'name startDate endDate')
        .lean()

      // Filter payroll records to only include those that overlap with the current week
      const weeklyPayroll = weeklyPayrollRecords.filter(record => {
        if (
          !record.payPeriod ||
          !record.payPeriod.startDate ||
          !record.payPeriod.endDate
        ) {
          return false
        }
        const payPeriodStart = new Date(record.payPeriod.startDate)
        const payPeriodEnd = new Date(record.payPeriod.endDate)
        // Check if pay period overlaps with current week
        return payPeriodStart <= weekEndDate && payPeriodEnd >= weekStartDate
      })

      // Calculate total payroll for the week (gross pay + daily payouts)
      const weeklyPayrollTotal = weeklyPayroll.reduce(
        (sum, record) =>
          sum + (record.totalGrossPay || 0) + (record.totalDailyPayouts || 0),
        0
      )

      weeklyTotal += weeklyPayrollTotal
    }

    res.render('payments/form', {
      title: 'New Payment',
      payment: null,
      jobs,
      installers,
      salesReps,
      employees,
      selectedJob,
      selectedRecipient,
      selectedRecipientModel,
      recipientType: selectedRecipientType,
      weeklyTotal: employeeId ? weeklyTotal : null,
      fromEmployeePage: !!employeeId
    })
  } catch (error) {
    console.error('Error loading payment form:', error)
    req.flash('error', 'Error loading payment form')
    res.redirect('/payments')
  }
}

// Create new payment
exports.create = async (req, res) => {
  try {
    const {
      job,
      recipient,
      recipientType,
      amount,
      datePaid,
      paymentMethod,
      checkNumber,
      notes
    } = req.body

    if (!recipient || !recipientType || !amount) {
      req.flash('error', 'Recipient, type, and amount are required')
      return res.redirect('/payments/new')
    }

    let recipientModel = 'User'
    let recipientValid = false

    if (recipientType === 'employee') {
      // Verify employee
      const recipientEmployee = await Employee.findById(recipient)
      if (!recipientEmployee) {
        req.flash('error', 'Employee not found')
        return res.redirect('/payments/new')
      }
      recipientModel = 'Employee'
      recipientValid = true
    } else {
      // Verify the recipient matches the type (installer or salesRep)
      const recipientUser = await User.findById(recipient)
      if (!recipientUser) {
        req.flash('error', 'Recipient not found')
        return res.redirect('/payments/new')
      }

      if (recipientType === 'installer' && !recipientUser.isInstaller) {
        req.flash('error', 'Selected user is not an installer')
        return res.redirect('/payments/new')
      }

      if (recipientType === 'salesRep' && !recipientUser.isSalesRep) {
        req.flash('error', 'Selected user is not a sales rep')
        return res.redirect('/payments/new')
      }
      recipientValid = true
    }

    if (!recipientValid) {
      req.flash('error', 'Invalid recipient')
      return res.redirect('/payments/new')
    }

    const payment = new Payment({
      job: job || null,
      recipient,
      recipientModel,
      recipientType,
      amount: parseFloat(amount),
      datePaid: datePaid || new Date(),
      paymentMethod: paymentMethod || 'cash',
      checkNumber: paymentMethod === 'check' ? checkNumber || '' : '',
      notes: notes || '',
      createdBy: req.user._id
    })

    await payment.save()

    req.flash('success', 'Payment recorded successfully')
    res.redirect('/payments')
  } catch (error) {
    console.error('Error creating payment:', error)
    req.flash('error', 'Error creating payment: ' + error.message)
    res.redirect('/payments/new')
  }
}

// Show payment detail
exports.detail = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('job')
      .populate('job.customer', 'name')
      .populate('job.installer', 'name')
      .populate('job.salesRep', 'name')
      .populate({
        path: 'recipient',
        select: 'name email firstName lastName'
      })
      .populate('createdBy', 'name')

    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    res.render('payments/detail', {
      title: `Payment - $${payment.amount.toFixed(2)}`,
      payment
    })
  } catch (error) {
    console.error('Error loading payment:', error)
    req.flash('error', 'Error loading payment')
    res.redirect('/payments')
  }
}

// Show form to edit payment
exports.editForm = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('job')
      .populate('recipient', 'name')

    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    const jobs = await Job.find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
    const installers = await User.find({
      isInstaller: true,
      isActive: true
    }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const employees = await Employee.find({
      status: { $in: ['active', 'inactive'] }
    }).sort({ lastName: 1, firstName: 1 })

    res.render('payments/form', {
      title: 'Edit Payment',
      payment,
      jobs,
      installers,
      salesReps,
      employees,
      selectedJob: payment.job,
      selectedRecipient: payment.recipient,
      selectedRecipientModel: payment.recipientModel || 'User',
      recipientType: payment.recipientType
    })
  } catch (error) {
    console.error('Error loading payment form:', error)
    req.flash('error', 'Error loading payment')
    res.redirect('/payments')
  }
}

// Update payment
exports.update = async (req, res) => {
  try {
    const {
      job,
      recipient,
      recipientType,
      amount,
      datePaid,
      paymentMethod,
      checkNumber,
      notes
    } = req.body

    const payment = await Payment.findById(req.params.id)
    if (!payment) {
      req.flash('error', 'Payment not found')
      return res.redirect('/payments')
    }

    // Determine recipient model based on recipient type
    let recipientModel = 'User'
    if (recipientType === 'employee') {
      const recipientEmployee = await Employee.findById(recipient)
      if (!recipientEmployee) {
        req.flash('error', 'Employee not found')
        return res.redirect(`/payments/${req.params.id}/edit`)
      }
      recipientModel = 'Employee'
    } else {
      const recipientUser = await User.findById(recipient)
      if (!recipientUser) {
        req.flash('error', 'Recipient not found')
        return res.redirect(`/payments/${req.params.id}/edit`)
      }
    }

    payment.job = job || null
    payment.recipient = recipient
    payment.recipientModel = recipientModel
    payment.recipientType = recipientType
    payment.amount = parseFloat(amount)
    payment.datePaid = datePaid || new Date()
    payment.paymentMethod = paymentMethod || 'cash'
    payment.checkNumber = paymentMethod === 'check' ? checkNumber || '' : ''
    payment.notes = notes || ''

    await payment.save()

    req.flash('success', 'Payment updated successfully')
    res.redirect(`/payments/${payment._id}`)
  } catch (error) {
    console.error('Error updating payment:', error)
    req.flash('error', 'Error updating payment: ' + error.message)
    res.redirect(`/payments/${req.params.id}/edit`)
  }
}

// Delete payment
exports.delete = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (payment) {
      await payment.deleteOne()
      req.flash('success', 'Payment deleted successfully')
    } else {
      req.flash('error', 'Payment not found')
    }
    res.redirect('/payments')
  } catch (error) {
    console.error('Error deleting payment:', error)
    req.flash('error', 'Error deleting payment')
    res.redirect('/payments')
  }
}
