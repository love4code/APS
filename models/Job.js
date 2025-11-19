const mongoose = require('mongoose')

const jobItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
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

const jobSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  soldByOwner: {
    type: Boolean,
    default: false
  },
  isSale: {
    type: Boolean,
    default: false
  },
  installer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  items: [jobItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  installCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  datePaid: {
    type: Date
  },
  installDate: {
    type: Date
  },
  orderDate: {
    type: Date
  },
  deliveryDate: {
    type: Date
  },
  invoicedDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'complete', 'delivered', 'undelivered', 'delayed'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    default: ''
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
jobSchema.methods.recalculateTotals = function () {
  this.subtotal = 0
  this.taxTotal = 0

  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity
      this.subtotal += itemTotal

      if (item.isTaxable) {
        this.taxTotal += itemTotal * 0.0625 // 6.25% tax
      }
    })
  }

  // Install cost is not taxable, just added to total
  this.totalPrice = this.subtotal + this.taxTotal + (this.installCost || 0)
  return {
    subtotal: this.subtotal,
    taxTotal: this.taxTotal,
    installCost: this.installCost || 0,
    totalPrice: this.totalPrice
  }
}

jobSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  // Recalculate totals before saving
  this.recalculateTotals()
  next()
})

module.exports = mongoose.model('Job', jobSchema)
