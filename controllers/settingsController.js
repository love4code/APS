const Settings = require('../models/Settings')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'logos')
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Generate unique filename: logo-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, 'logo-' + uniqueSuffix + ext)
  }
})

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    req.fileValidationError = 'Only image files are allowed (PNG, JPG, GIF, etc.)'
    cb(null, false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
})

// Get settings page
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings()

    res.render('settings/form', {
      title: 'Company Settings',
      settings
    })
  } catch (error) {
    console.error('Get settings error:', error)
    req.flash('error', 'Error loading settings')
    res.redirect('/')
  }
}

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    // Handle multer errors
    if (req.fileValidationError) {
      req.flash('error', req.fileValidationError)
      return res.redirect('/settings')
    }

    const {
      companyName,
      companyAddress,
      companyCity,
      companyState,
      companyZipCode,
      companyPhone,
      companyEmail,
      companyWebsite,
      taxRate,
      defaultPaymentTerms,
      invoiceFooter
    } = req.body

    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }

    settings.companyName = companyName ? companyName.trim() : ''
    settings.companyAddress = companyAddress ? companyAddress.trim() : ''
    settings.companyCity = companyCity ? companyCity.trim() : ''
    settings.companyState = companyState ? companyState.trim() : ''
    settings.companyZipCode = companyZipCode ? companyZipCode.trim() : ''
    settings.companyPhone = companyPhone ? companyPhone.trim() : ''
    settings.companyEmail = companyEmail ? companyEmail.trim() : ''
    settings.companyWebsite = companyWebsite ? companyWebsite.trim() : ''
    settings.taxRate = taxRate ? parseFloat(taxRate) / 100 : 0.0625 // Convert percentage to decimal
    settings.defaultPaymentTerms = defaultPaymentTerms ? defaultPaymentTerms.trim() : 'Payment due within 30 days'
    settings.invoiceFooter = invoiceFooter ? invoiceFooter.trim() : 'Thank you for your business!'

    // Handle logo upload if file was uploaded
    if (req.file) {
      // Delete old logo if it exists
      if (settings.logoPath) {
        const oldLogoPath = path.join(__dirname, '..', 'public', settings.logoPath)
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath)
        }
      }
      // Save new logo path (relative to public directory)
      settings.logoPath = path.join('uploads', 'logos', req.file.filename).replace(/\\/g, '/')
    }

    await settings.save()

    req.flash('success', 'Settings updated successfully')
    res.redirect('/settings')
  } catch (error) {
    console.error('Update settings error:', error)
    req.flash('error', error.message || 'Error updating settings')
    res.redirect('/settings')
  }
}

// Export upload middleware for use in routes
exports.upload = upload.single('logo')

