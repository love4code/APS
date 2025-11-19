const PayrollRecord = require('../models/PayrollRecord')
const PayPeriod = require('../models/PayPeriod')
const Employee = require('../models/Employee')

exports.list = async (req, res) => {
  try {
    const employeeFilter = req.query.employee || ''
    const payPeriodFilter = req.query.payPeriod || ''
    const paymentStatusFilter = req.query.paymentStatus || ''
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    const query = {}

    if (employeeFilter) {
      query.employee = employeeFilter
    }

    if (payPeriodFilter) {
      query.payPeriod = payPeriodFilter
    }

    if (paymentStatusFilter) {
      query.paymentStatus = paymentStatusFilter
    }

    const payrollRecords = await PayrollRecord.find(query)
      .populate('employee', 'firstName lastName')
      .populate('payPeriod', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await PayrollRecord.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get employees and pay periods for filters
    const employees = await Employee.find({ status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName _id')
      .lean()

    const payPeriods = await PayPeriod.find()
      .sort({ startDate: -1 })
      .select('name _id')
      .lean()

    res.render('payroll/list', {
      title: 'Payroll Records',
      payrollRecords,
      employees,
      payPeriods,
      employeeFilter,
      payPeriodFilter,
      paymentStatusFilter,
      currentPage: page,
      totalPages,
      total,
      limit
    })
  } catch (error) {
    console.error('Error loading payroll records:', error)
    req.flash('error', 'Error loading payroll records')
    res.redirect('/')
  }
}

exports.detail = async (req, res) => {
  try {
    const payrollRecord = await PayrollRecord.findById(req.params.id)
      .populate('employee')
      .populate('payPeriod')

    if (!payrollRecord) {
      req.flash('error', 'Payroll record not found')
      return res.redirect('/payroll-records')
    }

    res.render('payroll/detail', {
      title: 'Payroll Record',
      payrollRecord
    })
  } catch (error) {
    console.error('Error loading payroll record:', error)
    req.flash('error', 'Error loading payroll record')
    res.redirect('/payroll-records')
  }
}

exports.markPaid = async (req, res) => {
  try {
    const payrollRecord = await PayrollRecord.findById(req.params.id)

    if (!payrollRecord) {
      req.flash('error', 'Payroll record not found')
      return res.redirect('/payroll-records')
    }

    const {
      paymentStatus,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes
    } = req.body

    // Parse payment date
    let parsedPaymentDate = null
    if (paymentDate && paymentDate.trim() !== '') {
      const [year, month, day] = paymentDate.split('-').map(Number)
      parsedPaymentDate = new Date(Date.UTC(year, month - 1, day))
    }

    payrollRecord.paymentStatus = paymentStatus || 'paid'
    payrollRecord.paymentDate = parsedPaymentDate || new Date()
    payrollRecord.paymentMethod = paymentMethod || null
    payrollRecord.transactionReference = transactionReference || null
    payrollRecord.notes = notes || payrollRecord.notes || ''

    await payrollRecord.save()

    req.flash('success', 'Payroll record updated successfully')
    res.redirect(`/payroll-records/${payrollRecord._id}`)
  } catch (error) {
    console.error('Error updating payroll record:', error)
    req.flash('error', error.message || 'Error updating payroll record')
    res.redirect(`/payroll-records/${req.params.id}`)
  }
}

exports.exportCSV = async (req, res) => {
  try {
    const payPeriodId = req.query.payPeriod

    let query = {}
    if (payPeriodId) {
      query.payPeriod = payPeriodId
    }

    const payrollRecords = await PayrollRecord.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('payPeriod', 'name startDate endDate')
      .sort({ 'employee.lastName': 1 })
      .lean()

    // Helper function to escape CSV fields
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return ''
      const str = String(field)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Prepare CSV data
    const csvRows = []
    
    // Header row
    csvRows.push([
      'Employee Name',
      'Email',
      'Pay Period',
      'Regular Hours',
      'Overtime Hours',
      'PTO Hours',
      'Gross Pay',
      'Payment Status',
      'Payment Date',
      'Payment Method'
    ].map(escapeCSV).join(','))

    // Data rows
    payrollRecords.forEach(record => {
      csvRows.push([
        `${record.employee.firstName} ${record.employee.lastName}`,
        record.employee.email || '',
        record.payPeriod ? record.payPeriod.name : '',
        (record.totalRegularHours || 0).toFixed(2),
        (record.totalOvertimeHours || 0).toFixed(2),
        (record.totalPTOHours || 0).toFixed(2),
        (record.totalGrossPay || 0).toFixed(2),
        record.paymentStatus || 'unpaid',
        record.paymentDate
          ? new Date(record.paymentDate).toLocaleDateString()
          : '',
        record.paymentMethod || ''
      ].map(escapeCSV).join(','))
    })

    const csvString = csvRows.join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-export-${Date.now()}.csv"`
    )
    res.send(csvString)
  } catch (error) {
    console.error('Error exporting payroll CSV:', error)
    req.flash('error', 'Error exporting payroll data')
    res.redirect('/payroll-records')
  }
}

