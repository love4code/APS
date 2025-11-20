const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'APS - Aboveground Pool Sales',
      trim: true
    },
    companyAddress: {
      type: String,
      default: '',
      trim: true
    },
    companyCity: {
      type: String,
      default: '',
      trim: true
    },
    companyState: {
      type: String,
      default: '',
      trim: true
    },
    companyZipCode: {
      type: String,
      default: '',
      trim: true
    },
    companyPhone: {
      type: String,
      default: '',
      trim: true
    },
    companyEmail: {
      type: String,
      default: '',
      trim: true
    },
    companyWebsite: {
      type: String,
      default: '',
      trim: true
    },
    taxRate: {
      type: Number,
      default: 0.0625, // 6.25%
      min: 0,
      max: 1
    },
    defaultPaymentTerms: {
      type: String,
      default: 'Payment due within 30 days',
      trim: true
    },
    invoiceFooter: {
      type: String,
      default: 'Thank you for your business!',
      trim: true
    },
    logoPath: {
      type: String,
      default: '',
      trim: true
    },
    layoutType: {
      type: String,
      enum: ['navbar', 'sidebar'],
      default: 'navbar'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    // Only allow one settings document
    collection: 'settings'
  }
)

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne()
  if (!settings) {
    settings = new this()
    await settings.save()
  }
  return settings
}

settingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Settings', settingsSchema)
