const Customer = require('../models/Customer')
const Job = require('../models/Job')

exports.list = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 })
    res.render('customers/list', { title: 'Customers', customers })
  } catch (error) {
    req.flash('error', 'Error loading customers')
    res.redirect('/')
  }
}

exports.newForm = (req, res) => {
  res.render('customers/form', { title: 'New Customer', customer: null })
}

exports.create = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body

    if (!name) {
      req.flash('error', 'Customer name is required')
      return res.redirect('/customers/new')
    }

    await Customer.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || ''
    })

    req.flash('success', 'Customer created successfully')
    res.redirect('/customers')
  } catch (error) {
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

    const jobs = await Job.find({ customer: customer._id })
      .populate('salesRep', 'name')
      .populate('installer', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })

    res.render('customers/detail', { title: customer.name, customer, jobs })
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
