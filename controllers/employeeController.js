const Employee = require('../models/Employee')
const TimeEntry = require('../models/TimeEntry')
const PayrollRecord = require('../models/PayrollRecord')

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
      defaultOvertimeMultiplier,
      notes
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !position || !department || !hireDate || !payType) {
      req.flash('error', 'Please fill in all required fields')
      return res.redirect('/employees/new')
    }

    // Validate pay type specific fields
    if (payType === 'hourly' && (!hourlyRate || hourlyRate <= 0)) {
      req.flash('error', 'Hourly rate is required for hourly employees')
      return res.redirect('/employees/new')
    }

    if (payType === 'salary' && (!annualSalary || annualSalary <= 0)) {
      req.flash('error', 'Annual salary is required for salaried employees')
      return res.redirect('/employees/new')
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
      payType,
      hourlyRate: payType === 'hourly' ? parseFloat(hourlyRate) : null,
      annualSalary: payType === 'salary' ? parseFloat(annualSalary) : null,
      defaultOvertimeMultiplier: parseFloat(defaultOvertimeMultiplier) || 1.5,
      notes: notes || ''
    })

    await employee.save()

    req.flash('success', 'Employee created successfully')
    res.redirect(`/employees/${employee._id}`)
  } catch (error) {
    console.error('Error creating employee:', error)
    if (error.code === 11000) {
      req.flash('error', 'An employee with this email already exists')
    } else {
      req.flash('error', error.message || 'Error creating employee')
    }
    res.redirect('/employees/new')
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
    const recentPayrollRecords = await PayrollRecord.find({ employee: employee._id })
      .populate('payPeriod', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

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
      totalHours: monthlyTimeEntries.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0),
      totalOvertime: monthlyTimeEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0),
      totalPTO: monthlyTimeEntries.filter(e => e.type === 'pto' || e.type === 'sick').reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0)
    }

    res.render('employees/detail', {
      title: `${employee.firstName} ${employee.lastName}`,
      employee,
      recentTimeEntries,
      recentPayrollRecords,
      monthlyStats
    })
  } catch (error) {
    console.error('Error loading employee:', error)
    req.flash('error', 'Error loading employee')
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
      defaultOvertimeMultiplier,
      notes
    } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !position || !department || !hireDate || !payType) {
      req.flash('error', 'Please fill in all required fields')
      return res.redirect(`/employees/${employee._id}/edit`)
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
    employee.payType = payType
    employee.hourlyRate = payType === 'hourly' ? parseFloat(hourlyRate) : null
    employee.annualSalary = payType === 'salary' ? parseFloat(annualSalary) : null
    employee.defaultOvertimeMultiplier = parseFloat(defaultOvertimeMultiplier) || 1.5
    employee.notes = notes || ''

    await employee.save()

    req.flash('success', 'Employee updated successfully')
    res.redirect(`/employees/${employee._id}`)
  } catch (error) {
    console.error('Error updating employee:', error)
    if (error.code === 11000) {
      req.flash('error', 'An employee with this email already exists')
    } else {
      req.flash('error', error.message || 'Error updating employee')
    }
    res.redirect(`/employees/${req.params.id}/edit`)
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

