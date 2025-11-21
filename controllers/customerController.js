const Customer = require('../models/Customer')
const Job = require('../models/Job')
const Invoice = require('../models/Invoice')
const User = require('../models/User')

exports.list = async (req, res) => {
  try {
    const searchQuery = req.query.search || ''
    let customers = []

    if (searchQuery.trim()) {
      // Search in customer fields (name, email, phone)
      const customerFieldsQuery = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { phone: { $regex: searchQuery, $options: 'i' } }
        ]
      }

      // Find customers matching the search in their fields
      const directMatches = await Customer.find(customerFieldsQuery).sort({
        name: 1
      })

      // Search for users (sales reps or installers) matching the search term
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } }
        ]
      }).select('_id')

      const userIds = matchingUsers.map(u => u._id)

      // Find customers through jobs with matching sales rep or installer
      const jobsWithMatchingUsers = await Job.find({
        $or: [{ salesRep: { $in: userIds } }, { installer: { $in: userIds } }]
      }).distinct('customer')

      // Get customers from job matches
      const jobMatchedCustomers = await Customer.find({
        _id: { $in: jobsWithMatchingUsers }
      }).sort({ name: 1 })

      // Combine and deduplicate customers
      const allCustomerIds = new Set()
      const uniqueCustomers = []

      // Add direct matches
      directMatches.forEach(c => {
        if (!allCustomerIds.has(c._id.toString())) {
          allCustomerIds.add(c._id.toString())
          uniqueCustomers.push(c)
        }
      })

      // Add job-matched customers
      jobMatchedCustomers.forEach(c => {
        if (!allCustomerIds.has(c._id.toString())) {
          allCustomerIds.add(c._id.toString())
          uniqueCustomers.push(c)
        }
      })

      customers = uniqueCustomers.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      // No search query - return all customers
      customers = await Customer.find().sort({ name: 1 })
    }

    res.render('customers/list', {
      title: 'Customers',
      customers,
      searchQuery
    })
  } catch (error) {
    console.error('Customer list error:', error)
    req.flash('error', 'Error loading customers')
    res.redirect('/')
  }
}

exports.newForm = (req, res) => {
  res.render('customers/form', { title: 'New Customer', customer: null })
}

exports.create = async (req, res) => {
  try {
    console.log('=== Customer Create Request ===')
    console.log('Method:', req.method)
    console.log('Body:', req.body)
    console.log('Headers:', {
      'x-requested-with': req.headers['x-requested-with'],
      'accept': req.headers.accept,
      'content-type': req.headers['content-type']
    })
    console.log('Session userId:', req.session?.userId)
    
    const { name, phone, email, address, notes } = req.body

    // Check if this is an AJAX/JSON request
    const isAjax = req.xhr || 
                   req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                   req.headers.accept?.indexOf('json') > -1 ||
                   req.headers['content-type']?.indexOf('json') > -1

    console.log('Is AJAX request:', isAjax)

    if (!name) {
      console.log('Error: Customer name is missing')
      if (isAjax) {
        return res.status(400).json({ error: 'Customer name is required' })
      }
      req.flash('error', 'Customer name is required')
      return res.redirect('/customers/new')
    }

    const customer = await Customer.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || ''
    })

    console.log('Customer created successfully:', customer._id, customer.name)

    if (isAjax) {
      return res.status(201).json({ 
        success: true, 
        customer: {
          _id: customer._id.toString(),
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          notes: customer.notes || ''
        }
      })
    }

    req.flash('success', 'Customer created successfully')
    res.redirect('/customers')
  } catch (error) {
    console.error('Error creating customer:', error)
    
    // Check if this is an AJAX/JSON request
    const isAjax = req.xhr || 
                   req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                   req.headers.accept?.indexOf('json') > -1 ||
                   req.headers['content-type']?.indexOf('json') > -1
    
    if (isAjax) {
      return res.status(400).json({ error: error.message || 'Error creating customer' })
    }
    req.flash('error', error.message || 'Error creating customer')
    res.redirect('/customers/new')
  }
}

exports.detail = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/customers')
    }

    // Separate jobs and sales
    const allJobs = await Job.find({ customer: customer._id })
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('store', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })

    // Filter jobs (exclude sales)
    const jobs = allJobs.filter(job => !job.isSale)
    
    // Filter sales (only isSale = true)
    const sales = allJobs.filter(job => job.isSale === true)

    const invoices = await Invoice.find({ customer: customer._id })
      .populate('job', 'status')
      .sort({ createdAt: -1 })
      .limit(10)

    res.render('customers/detail', { 
      title: customer.name, 
      customer, 
      jobs,
      sales,
      invoices 
    })
  } catch (error) {
    req.flash('error', 'Error loading customer')
    res.redirect('/customers')
  }
}

exports.editForm = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/customers')
    }
    res.render('customers/form', { title: 'Edit Customer', customer })
  } catch (error) {
    req.flash('error', 'Error loading customer')
    res.redirect('/customers')
  }
}

exports.update = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body

    if (!name) {
      req.flash('error', 'Customer name is required')
      return res.redirect(`/customers/${req.params.id}/edit`)
    }

    await Customer.findByIdAndUpdate(req.params.id, {
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || ''
    })

    req.flash('success', 'Customer updated successfully')
    res.redirect(`/customers/${req.params.id}`)
  } catch (error) {
    req.flash('error', error.message || 'Error updating customer')
    res.redirect(`/customers/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/customers')
    }

    // Check if customer has jobs
    const jobCount = await Job.countDocuments({ customer: customer._id })
    if (jobCount > 0) {
      req.flash(
        'error',
        `Cannot delete customer with ${jobCount} job(s). Delete jobs first.`
      )
      return res.redirect(`/customers/${customer._id}`)
    }

    await Customer.findByIdAndDelete(req.params.id)
    req.flash('success', 'Customer deleted successfully')
    res.redirect('/customers')
  } catch (error) {
    req.flash('error', 'Error deleting customer')
    res.redirect('/customers')
  }
}
