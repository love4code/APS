const mongoose = require('mongoose')

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isTaxable: {
    type: Boolean,
    default: true
  }
})

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  soldByOwner: {
    type: Boolean,
    default: false
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0.0625, // 6.25%
    min: 0,
    max: 1
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  datePaid: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'credit_card', 'bank_transfer', 'other'],
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  terms: {
    type: String,
    default: 'Payment due within 30 days'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Method to recalculate totals
invoiceSchema.methods.recalculateTotals = function () {
  this.subtotal = 0
  this.taxTotal = 0

  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity
      this.subtotal += itemTotal

      if (item.isTaxable) {
        this.taxTotal += itemTotal * this.taxRate
      }
    })
  }

  // Apply discount
  const subtotalAfterDiscount = this.subtotal - (this.discount || 0)
  this.totalPrice = Math.max(0, subtotalAfterDiscount + this.taxTotal)
  
  return {
    subtotal: this.subtotal,
    taxTotal: this.taxTotal,
    discount: this.discount || 0,
    totalPrice: this.totalPrice
  }
}

// Generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  
  // Find the highest invoice number for this year
  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ invoiceNumber: -1 })

  let sequence = 1
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]) || 0
    sequence = lastSequence + 1
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

invoiceSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  // Recalculate totals before saving
  this.recalculateTotals()
  next()
})

module.exports = mongoose.model('Invoice', invoiceSchema)

