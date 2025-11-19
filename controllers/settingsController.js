const Settings = require('../models/Settings')

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
    settings.taxRate = taxRate ? parseFloat(taxRate) : 0.0625
    settings.defaultPaymentTerms = defaultPaymentTerms ? defaultPaymentTerms.trim() : 'Payment due within 30 days'
    settings.invoiceFooter = invoiceFooter ? invoiceFooter.trim() : 'Thank you for your business!'

    await settings.save()

    req.flash('success', 'Settings updated successfully')
    res.redirect('/settings')
  } catch (error) {
    console.error('Update settings error:', error)
    req.flash('error', error.message || 'Error updating settings')
    res.redirect('/settings')
  }
}

