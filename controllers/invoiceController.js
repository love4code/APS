const Invoice = require('../models/Invoice')
const Customer = require('../models/Customer')
const Job = require('../models/Job')
const User = require('../models/User')
const Store = require('../models/Store')
const Product = require('../models/Product')
const invoiceService = require('../services/invoiceService')
const emailService = require('../services/emailService')

// List all invoices
exports.list = async (req, res) => {
  try {
    const customerId = req.query.customerId || null
    let query = {}
    
    if (customerId) {
      query.customer = customerId
    }
    
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email')
      .populate('job', 'status')
      .populate('store', 'name')
      .populate('salesRep', 'name')
      .sort({ createdAt: -1 })

    let customer = null
    if (customerId) {
      customer = await Customer.findById(customerId)
    }

    res.render('invoices/list', {
      title: customer ? `Invoices - ${customer.name}` : 'Invoices',
      invoices,
      customer
    })
  } catch (error) {
    console.error('Invoice list error:', error)
    req.flash('error', 'Error loading invoices')
    res.redirect('/')
  }
}

// Show form to create new invoice
exports.newForm = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 })
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('customer', 'name')
    const products = await Product.find({ isActive: true }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber()

    // Check if creating from a job or customer
    const jobId = req.query.jobId || null
    const customerId = req.query.customerId || null
    let selectedJob = null
    let selectedCustomer = null
    
    if (jobId) {
      selectedJob = await Job.findById(jobId)
        .populate('customer')
        .populate('items.product')
        .populate('store', 'name')
        .populate('salesRep', 'name')
    }
    
    if (customerId) {
      selectedCustomer = await Customer.findById(customerId)
    }

    res.render('invoices/form', {
      title: 'New Invoice',
      invoice: null,
      customers,
      jobs,
      products,
      salesReps,
      stores,
      invoiceNumber,
      selectedJob,
      selectedCustomer
    })
  } catch (error) {
    console.error('Invoice new form error:', error)
    req.flash('error', 'Error loading form')
    res.redirect('/invoices')
  }
}

// Create new invoice
exports.create = async (req, res) => {
  try {
    const {
      invoiceNumber,
      customer,
      job,
      store,
      salesRep,
      soldByOwner,
      items,
      discount,
      taxRate,
      issueDate,
      dueDate,
      notes,
      terms,
      status
    } = req.body

    if (!customer) {
      req.flash('error', 'Customer is required')
      return res.redirect('/invoices/new')
    }

    // Parse items if it's a string
    let itemsArray = []
    if (items) {
      if (typeof items === 'string') {
        try {
          itemsArray = JSON.parse(items)
        } catch (e) {
          console.error('Error parsing items JSON:', e)
          itemsArray = []
        }
      } else if (Array.isArray(items)) {
        itemsArray = items
      }
    }

    // Validate and format items
    const validItems = itemsArray
      .filter(item => {
        if (!item || !item.description) return false
        const qty = parseFloat(item.quantity)
        const price = parseFloat(item.unitPrice)
        return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0
      })
      .map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        isTaxable: item.isTaxable === 'true' || item.isTaxable === true
      }))

    if (validItems.length === 0) {
      req.flash('error', 'Please add at least one item to the invoice')
      return res.redirect('/invoices/new')
    }

    const invoice = new Invoice({
      invoiceNumber: invoiceNumber || (await Invoice.generateInvoiceNumber()),
      customer,
      job: job || null,
      store: store || null,
      salesRep: salesRep || null,
      soldByOwner: soldByOwner === 'on' || soldByOwner === 'true',
      items: validItems,
      discount: discount ? parseFloat(discount) : 0,
      taxRate: taxRate ? parseFloat(taxRate) / 100 : 0.0625, // Convert percentage to decimal
      issueDate: issueDate || new Date(),
      dueDate: dueDate || null,
      notes: notes || '',
      terms: terms || 'Payment due within 30 days',
      status: status || 'draft',
      createdBy: req.user._id
    })

    invoice.recalculateTotals()
    await invoice.save()

    req.flash('success', 'Invoice created successfully')
    res.redirect(`/invoices/${invoice._id}`)
  } catch (error) {
    console.error('Create invoice error:', error)
    if (error.code === 11000) {
      req.flash('error', 'Invoice number already exists')
    } else {
      req.flash('error', error.message || 'Error creating invoice')
    }
    res.redirect('/invoices/new')
  }
}

// Show invoice detail
exports.detail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('job')
      .populate('store', 'name')
      .populate('salesRep', 'name')
      .populate('createdBy', 'name')

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    res.render('invoices/detail', {
      title: `Invoice ${invoice.invoiceNumber}`,
      invoice
    })
  } catch (error) {
    console.error('Invoice detail error:', error)
    req.flash('error', 'Error loading invoice')
    res.redirect('/invoices')
  }
}

// Show form to edit invoice
exports.editForm = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    const customers = await Customer.find().sort({ name: 1 })
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('customer', 'name')
    const products = await Product.find({ isActive: true }).sort({ name: 1 })
    const salesReps = await User.find({
      isSalesRep: true,
      isActive: true
    }).sort({ name: 1 })
    const stores = await Store.find({ isActive: true }).sort({ name: 1 })

    res.render('invoices/form', {
      title: 'Edit Invoice',
      invoice,
      customers,
      jobs,
      products,
      salesReps,
      stores,
      invoiceNumber: invoice.invoiceNumber,
      selectedJob: null
    })
  } catch (error) {
    console.error('Invoice edit form error:', error)
    req.flash('error', 'Error loading invoice')
    res.redirect('/invoices')
  }
}

// Update invoice
exports.update = async (req, res) => {
  try {
    const {
      customer,
      job,
      store,
      salesRep,
      soldByOwner,
      items,
      discount,
      taxRate,
      issueDate,
      dueDate,
      notes,
      terms,
      status
    } = req.body

    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    if (!customer) {
      req.flash('error', 'Customer is required')
      return res.redirect(`/invoices/${req.params.id}/edit`)
    }

    // Parse items
    let itemsArray = []
    if (items) {
      if (typeof items === 'string') {
        try {
          itemsArray = JSON.parse(items)
        } catch (e) {
          console.error('Error parsing items JSON:', e)
          itemsArray = []
        }
      } else if (Array.isArray(items)) {
        itemsArray = items
      }
    }

    // Validate and format items
    const validItems = itemsArray
      .filter(item => {
        if (!item || !item.description) return false
        const qty = parseFloat(item.quantity)
        const price = parseFloat(item.unitPrice)
        return !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0
      })
      .map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        isTaxable: item.isTaxable === 'true' || item.isTaxable === true
      }))

    if (validItems.length === 0) {
      req.flash('error', 'Please add at least one item to the invoice')
      return res.redirect(`/invoices/${req.params.id}/edit`)
    }

    invoice.customer = customer
    invoice.job = job || null
    invoice.store = store || null
    invoice.salesRep = salesRep || null
    invoice.soldByOwner = soldByOwner === 'on' || soldByOwner === 'true'
    invoice.items = validItems
    invoice.discount = discount ? parseFloat(discount) : 0
    invoice.taxRate = taxRate ? parseFloat(taxRate) / 100 : 0.0625 // Convert percentage to decimal
    invoice.issueDate = issueDate || invoice.issueDate
    invoice.dueDate = dueDate || null
    invoice.notes = notes || ''
    invoice.terms = terms || 'Payment due within 30 days'
    invoice.status = status || invoice.status

    invoice.recalculateTotals()
    await invoice.save()

    req.flash('success', 'Invoice updated successfully')
    res.redirect(`/invoices/${invoice._id}`)
  } catch (error) {
    console.error('Update invoice error:', error)
    req.flash('error', error.message || 'Error updating invoice')
    res.redirect(`/invoices/${req.params.id}/edit`)
  }
}

// Mark invoice as paid
exports.markPaid = async (req, res) => {
  try {
    const { datePaid, paymentMethod } = req.body
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    invoice.status = 'paid'
    invoice.datePaid = datePaid || new Date()
    invoice.paymentMethod = paymentMethod || null
    await invoice.save()

    req.flash('success', 'Invoice marked as paid')
    res.redirect(`/invoices/${invoice._id}`)
  } catch (error) {
    console.error('Mark paid error:', error)
    req.flash('error', 'Error updating invoice')
    res.redirect('/invoices')
  }
}

// Delete invoice
exports.delete = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    await Invoice.findByIdAndDelete(req.params.id)

    req.flash('success', 'Invoice deleted successfully')
    res.redirect('/invoices')
  } catch (error) {
    console.error('Delete invoice error:', error)
    req.flash('error', 'Error deleting invoice')
    res.redirect('/invoices')
  }
}

// Download PDF invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('job')
      .populate('store', 'name')
      .populate('salesRep', 'name')
      .populate('createdBy', 'name')

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    const pdfBuffer = await invoiceService.generateInvoicePDFFromInvoice(
      invoice
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    )
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Invoice generation error:', error)
    req.flash('error', 'Error generating invoice')
    res.redirect(`/invoices/${req.params.id}`)
  }
}

// Send invoice via email
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('job')
      .populate('store', 'name')
      .populate('salesRep', 'name')

    if (!invoice) {
      req.flash('error', 'Invoice not found')
      return res.redirect('/invoices')
    }

    if (!invoice.customer || !invoice.customer.email) {
      req.flash(
        'error',
        'Customer email not found. Please add an email address to the customer.'
      )
      return res.redirect(`/invoices/${req.params.id}`)
    }

    if (!emailService.isEmailConfigured()) {
      req.flash(
        'error',
        'Email service is not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      )
      return res.redirect(`/invoices/${req.params.id}`)
    }

    // Generate PDF
    const pdfBuffer = await invoiceService.generateInvoicePDFFromInvoice(
      invoice
    )

    // Send email
    await emailService.sendInvoiceEmail({
      to: invoice.customer.email,
      customerName: invoice.customer.name || 'Valued Customer',
      pdfBuffer: pdfBuffer,
      jobId: invoice.invoiceNumber
    })

    // Update invoice status
    if (invoice.status === 'draft') {
      invoice.status = 'sent'
      await invoice.save()
    }

    req.flash(
      'success',
      `Invoice sent successfully to ${invoice.customer.email}`
    )
    res.redirect(`/invoices/${req.params.id}`)
  } catch (error) {
    console.error('Send invoice error:', error)
    req.flash('error', error.message || 'Error sending invoice')
    res.redirect(`/invoices/${req.params.id}`)
  }
}
