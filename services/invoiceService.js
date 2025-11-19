const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const Settings = require('../models/Settings')

/**
 * Get company settings
 * @returns {Promise<Object>} Settings object
 */
const getCompanySettings = async () => {
  try {
    const settings = await Settings.getSettings()
    return settings
  } catch (error) {
    console.error('Error loading settings:', error)
    // Return default values if settings can't be loaded
    return {
      companyName: 'APS - Aboveground Pool Sales',
      companyAddress: '',
      companyCity: '',
      companyState: '',
      companyZipCode: '',
      companyPhone: '',
      companyEmail: '',
      companyWebsite: '',
      taxRate: 0.0625,
      defaultPaymentTerms: 'Payment due within 30 days',
      invoiceFooter: 'Thank you for your business!'
    }
  }
}

/**
 * Generate a PDF invoice for a job
 * @param {Object} job - Job object with populated customer, items, etc.
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.generateInvoicePDF = async job => {
  return new Promise(async (resolve, reject) => {
    try {
      const settings = await getCompanySettings()
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const buffers = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Add logo if available (position on left side)
      let logoHeight = 0
      const logoX = 50
      const logoY = 50
      if (settings.logoPath) {
        try {
          const logoPath = path.join(
            __dirname,
            '..',
            'public',
            settings.logoPath
          )
          if (fs.existsSync(logoPath)) {
            // Add logo (max width 120px, max height 80px, maintain aspect ratio)
            doc.image(logoPath, logoX, logoY, {
              width: 120,
              height: 80,
              fit: [120, 80]
            })
            logoHeight = 80
          }
        } catch (error) {
          console.error('Error loading logo:', error)
          // Continue without logo if there's an error
        }
      }

      // Invoice details (right side, top)
      const invoiceDetailsY = 50
      doc.fontSize(12)
      doc.text(`Invoice #: ${job._id.toString().slice(-8).toUpperCase()}`, {
        align: 'right',
        y: invoiceDetailsY
      })
      doc.text(
        `Date: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        { align: 'right', y: invoiceDetailsY + 15 }
      )

      // Header (centered, below logo/invoice details area)
      const headerY = Math.max(logoY + logoHeight, invoiceDetailsY + 30) + 20
      doc.fontSize(24).text('INVOICE', { align: 'center', y: headerY })

      // Company info from settings (position on left side, below logo)
      doc.fontSize(10)
      const companyX = 50 // Left side of page
      // Start company info below the logo
      let companyY = logoY + logoHeight + 20 // Below logo with spacing

      // If no logo, start at top
      if (logoHeight === 0) {
        companyY = 50
      }

      if (settings.companyName) {
        doc.text(settings.companyName, companyX, companyY)
        companyY += 15
      }
      if (settings.companyAddress) {
        doc.text(settings.companyAddress, companyX, companyY)
        companyY += 15
      }
      const cityStateZip = [
        settings.companyCity,
        settings.companyState,
        settings.companyZipCode
      ]
        .filter(Boolean)
        .join(', ')
      if (cityStateZip) {
        doc.text(cityStateZip, companyX, companyY)
        companyY += 15
      }
      if (settings.companyPhone) {
        doc.text(`Phone: ${settings.companyPhone}`, companyX, companyY)
        companyY += 15
      }
      if (settings.companyEmail) {
        doc.text(`Email: ${settings.companyEmail}`, companyX, companyY)
        companyY += 15
      }
      if (settings.companyWebsite) {
        doc.text(`Website: ${settings.companyWebsite}`, companyX, companyY)
        companyY += 15
      }

      // Move down to start customer info section (below header and company info)
      const customerInfoStartY = Math.max(headerY + 30, companyY) + 20
      doc.y = customerInfoStartY
      doc.moveDown(1)

      // Customer info
      const customerY = doc.y
      doc.fontSize(12).text('Bill To:', 50, customerY)
      doc.fontSize(10)
      if (job.customer) {
        doc.text(job.customer.name || 'N/A', 50, customerY + 20)
        if (job.customer.address) {
          doc.text(job.customer.address, 50, customerY + 35)
        }
        if (job.customer.city || job.customer.state || job.customer.zipCode) {
          const cityStateZip = [
            job.customer.city,
            job.customer.state,
            job.customer.zipCode
          ]
            .filter(Boolean)
            .join(', ')
          doc.text(cityStateZip, 50, customerY + 50)
        }
        if (job.customer.phone) {
          doc.text(`Phone: ${job.customer.phone}`, 50, customerY + 65)
        }
        if (job.customer.email) {
          doc.text(`Email: ${job.customer.email}`, 50, customerY + 80)
        }
      }

      // Job details
      doc.moveDown(2)
      doc.fontSize(12).text('Job Details:', 50)
      doc.fontSize(10)
      doc.text(`Status: ${job.status || 'N/A'}`, 50, doc.y + 15)
      if (job.installDate) {
        doc.text(
          `Install Date: ${new Date(job.installDate).toLocaleDateString()}`,
          50,
          doc.y + 15
        )
      }
      if (job.installer) {
        doc.text(`Installer: ${job.installer.name || 'N/A'}`, 50, doc.y + 15)
      }
      if (job.store) {
        doc.text(`Store: ${job.store.name || 'N/A'}`, 50, doc.y + 15)
      }
      doc.moveDown(2)

      // Items table
      const tableTop = doc.y
      const itemHeight = 20
      let currentY = tableTop

      // Table header
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Item', 50, currentY)
      doc.text('Quantity', 200, currentY)
      doc.text('Unit Price', 300, currentY)
      doc.text('Taxable', 400, currentY)
      doc.text('Total', 450, currentY)

      currentY += itemHeight
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke()
      currentY += 5

      // Table rows
      doc.font('Helvetica')
      let totalItems = 0

      if (job.items && job.items.length > 0) {
        job.items.forEach(item => {
          const itemName = item.product ? item.product.name : 'Unknown Product'
          const quantity = item.quantity || 0
          const unitPrice = item.unitPrice || 0
          const itemTotal = quantity * unitPrice
          totalItems += itemTotal

          doc.fontSize(9)
          doc.text(itemName.substring(0, 30), 50, currentY)
          doc.text(quantity.toString(), 200, currentY)
          doc.text(`$${unitPrice.toFixed(2)}`, 300, currentY)
          doc.text(item.isTaxable ? 'Yes' : 'No', 400, currentY)
          doc.text(`$${itemTotal.toFixed(2)}`, 450, currentY)

          currentY += itemHeight
        })
      } else {
        doc.text('No items', 50, currentY)
        currentY += itemHeight
      }

      currentY += 10
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke()
      currentY += 20

      // Totals section - right aligned
      const totalsStartX = 400
      const totalsEndX = 550
      const totalsWidth = totalsEndX - totalsStartX

      const subtotal = job.subtotal || 0
      const taxTotal = job.taxTotal || 0
      const installCost = job.installCost || 0
      const totalPrice = job.totalPrice || 0

      doc.fontSize(10).font('Helvetica')

      // Subtotal
      const subtotalLabel = 'Subtotal:'
      const subtotalValue = `$${subtotal.toFixed(2)}`
      const subtotalLabelWidth = doc.widthOfString(subtotalLabel)
      const subtotalValueWidth = doc.widthOfString(subtotalValue)
      doc.text(subtotalLabel, totalsStartX, currentY)
      doc.text(subtotalValue, totalsEndX - subtotalValueWidth, currentY)
      currentY += 20

      // Tax
      if (taxTotal > 0) {
        const taxLabel = 'Tax (6.25%):'
        const taxValue = `$${taxTotal.toFixed(2)}`
        const taxValueWidth = doc.widthOfString(taxValue)
        doc.text(taxLabel, totalsStartX, currentY)
        doc.text(taxValue, totalsEndX - taxValueWidth, currentY)
        currentY += 20
      }

      // Install Cost
      if (installCost > 0) {
        const installLabel = 'Install Cost:'
        const installValue = `$${installCost.toFixed(2)}`
        const installValueWidth = doc.widthOfString(installValue)
        doc.text(installLabel, totalsStartX, currentY)
        doc.text(installValue, totalsEndX - installValueWidth, currentY)
        currentY += 20
      }

      // Divider line
      currentY += 5
      doc.moveTo(totalsStartX, currentY).lineTo(totalsEndX, currentY).stroke()
      currentY += 15

      // Total
      doc.fontSize(12).font('Helvetica-Bold')
      const totalLabel = 'Total:'
      const totalValue = `$${totalPrice.toFixed(2)}`
      const totalValueWidth = doc.widthOfString(totalValue)
      doc.text(totalLabel, totalsStartX, currentY)
      doc.text(totalValue, totalsEndX - totalValueWidth, currentY)

      // Payment status
      currentY += 30
      doc.fontSize(10).font('Helvetica')
      doc.text(
        `Payment Status: ${job.isPaid ? 'PAID' : 'UNPAID'}`,
        50,
        currentY
      )
      if (job.isPaid && job.datePaid) {
        doc.text(
          `Paid Date: ${new Date(job.datePaid).toLocaleDateString()}`,
          50,
          currentY + 15
        )
      }

      // Notes
      if (job.notes) {
        currentY += 40
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text('Notes:', 50, currentY)
        doc.font('Helvetica')
        doc.text(job.notes, 50, currentY + 15, { width: 500 })
      }

      // Footer
      const pageHeight = doc.page.height
      const footerY = pageHeight - 50
      doc.fontSize(8)
      doc.text(
        settings.invoiceFooter || 'Thank you for your business!',
        50,
        footerY,
        { align: 'center' }
      )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate a PDF invoice from an Invoice model
 * @param {Object} invoice - Invoice object with populated customer, items, etc.
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.generateInvoicePDFFromInvoice = async invoice => {
  return new Promise(async (resolve, reject) => {
    try {
      const settings = await getCompanySettings()
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const buffers = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Add logo if available (position on left side)
      let logoHeight = 0
      const logoX = 50
      const logoY = 50
      if (settings.logoPath) {
        try {
          const logoPath = path.join(
            __dirname,
            '..',
            'public',
            settings.logoPath
          )
          if (fs.existsSync(logoPath)) {
            // Add logo (max width 120px, max height 80px, maintain aspect ratio)
            doc.image(logoPath, logoX, logoY, {
              width: 120,
              height: 80,
              fit: [120, 80]
            })
            logoHeight = 80
          }
        } catch (error) {
          console.error('Error loading logo:', error)
          // Continue without logo if there's an error
        }
      }

      // Invoice details (right side, top)
      const invoiceDetailsY = 50
      doc.fontSize(12)
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, {
        align: 'right',
        y: invoiceDetailsY
      })
      doc.text(
        `Date: ${new Date(invoice.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        { align: 'right', y: invoiceDetailsY + 15 }
      )
      if (invoice.dueDate) {
        doc.text(
          `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          { align: 'right', y: invoiceDetailsY + 30 }
        )
      }

      // Header (centered, below logo/invoice details area)
      const headerY =
        Math.max(
          logoY + logoHeight,
          invoiceDetailsY + (invoice.dueDate ? 45 : 30)
        ) + 20
      doc.fontSize(24).text('INVOICE', { align: 'center', y: headerY })

      // Company info from settings (position on left side, below logo)
      doc.fontSize(10)
      const companyX = 50 // Left side of page
      // Start company info below the logo
      let companyY = logoY + logoHeight + 20 // Below logo with spacing

      // If no logo, start at top
      if (logoHeight === 0) {
        companyY = 50
      }

      if (settings.companyName) {
        doc.text(settings.companyName, companyX, companyY)
        companyY += 15
      }
      if (settings.companyAddress) {
        doc.text(settings.companyAddress, companyX, companyY)
        companyY += 15
      }
      const cityStateZip = [
        settings.companyCity,
        settings.companyState,
        settings.companyZipCode
      ]
        .filter(Boolean)
        .join(', ')
      if (cityStateZip) {
        doc.text(cityStateZip, companyX, companyY)
        companyY += 15
      }
      if (settings.companyPhone) {
        doc.text(`Phone: ${settings.companyPhone}`, companyX, companyY)
        companyY += 15
      }
      if (settings.companyEmail) {
        doc.text(`Email: ${settings.companyEmail}`, companyX, companyY)
        companyY += 15
      }
      if (settings.companyWebsite) {
        doc.text(`Website: ${settings.companyWebsite}`, companyX, companyY)
        companyY += 15
      }

      // Move down to start customer info section (below header and company info)
      const customerInfoStartY = Math.max(headerY + 30, companyY) + 20
      doc.y = customerInfoStartY
      doc.moveDown(1)

      // Customer info
      const customerY = doc.y
      doc.fontSize(12).text('Bill To:', 50, customerY)
      doc.fontSize(10)
      if (invoice.customer) {
        doc.text(invoice.customer.name || 'N/A', 50, customerY + 20)
        if (invoice.customer.address) {
          doc.text(invoice.customer.address, 50, customerY + 35)
        }
        if (
          invoice.customer.city ||
          invoice.customer.state ||
          invoice.customer.zipCode
        ) {
          const cityStateZip = [
            invoice.customer.city,
            invoice.customer.state,
            invoice.customer.zipCode
          ]
            .filter(Boolean)
            .join(', ')
          doc.text(cityStateZip, 50, customerY + 50)
        }
        if (invoice.customer.phone) {
          doc.text(`Phone: ${invoice.customer.phone}`, 50, customerY + 65)
        }
        if (invoice.customer.email) {
          doc.text(`Email: ${invoice.customer.email}`, 50, customerY + 80)
        }
      }

      // Invoice details
      doc.moveDown(2)
      doc.fontSize(12).text('Invoice Details:', 50)
      doc.fontSize(10)
      doc.text(`Status: ${invoice.status || 'N/A'}`, 50, doc.y + 15)
      if (invoice.store) {
        doc.text(`Store: ${invoice.store.name || 'N/A'}`, 50, doc.y + 15)
      }
      if (invoice.salesRep) {
        doc.text(`Sales Rep: ${invoice.salesRep.name || 'N/A'}`, 50, doc.y + 15)
      } else if (invoice.soldByOwner) {
        doc.text('Sold by: Owner', 50, doc.y + 15)
      }
      doc.moveDown(2)

      // Items table
      const tableTop = doc.y
      const itemHeight = 20
      let currentY = tableTop

      // Table header
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Description', 50, currentY)
      doc.text('Quantity', 250, currentY)
      doc.text('Unit Price', 350, currentY)
      doc.text('Taxable', 450, currentY)
      doc.text('Total', 500, currentY)

      currentY += itemHeight
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke()
      currentY += 5

      // Table rows
      doc.font('Helvetica')

      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => {
          const description = item.description || 'Unknown Item'
          const quantity = item.quantity || 0
          const unitPrice = item.unitPrice || 0
          const itemTotal = quantity * unitPrice

          doc.fontSize(9)
          doc.text(description.substring(0, 40), 50, currentY, { width: 180 })
          doc.text(quantity.toString(), 250, currentY)
          doc.text(`$${unitPrice.toFixed(2)}`, 350, currentY)
          doc.text(item.isTaxable ? 'Yes' : 'No', 450, currentY)
          doc.text(`$${itemTotal.toFixed(2)}`, 500, currentY)

          currentY += itemHeight
        })
      } else {
        doc.text('No items', 50, currentY)
        currentY += itemHeight
      }

      currentY += 10
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke()
      currentY += 20

      // Totals section - right aligned
      const totalsStartX = 400
      const totalsEndX = 550

      const subtotal = invoice.subtotal || 0
      const taxTotal = invoice.taxTotal || 0
      const discount = invoice.discount || 0
      const totalPrice = invoice.totalPrice || 0

      doc.fontSize(10).font('Helvetica')

      // Subtotal
      const subtotalLabel = 'Subtotal:'
      const subtotalValue = `$${subtotal.toFixed(2)}`
      const subtotalValueWidth = doc.widthOfString(subtotalValue)
      doc.text(subtotalLabel, totalsStartX, currentY)
      doc.text(subtotalValue, totalsEndX - subtotalValueWidth, currentY)
      currentY += 20

      // Discount
      if (discount > 0) {
        const discountLabel = 'Discount:'
        const discountValue = `-$${discount.toFixed(2)}`
        const discountValueWidth = doc.widthOfString(discountValue)
        doc.text(discountLabel, totalsStartX, currentY)
        doc.text(discountValue, totalsEndX - discountValueWidth, currentY)
        currentY += 20
      }

      // Tax
      if (taxTotal > 0) {
        const taxRatePercent = ((invoice.taxRate || 0.0625) * 100).toFixed(2)
        const taxLabel = `Tax (${taxRatePercent}%):`
        const taxValue = `$${taxTotal.toFixed(2)}`
        const taxValueWidth = doc.widthOfString(taxValue)
        doc.text(taxLabel, totalsStartX, currentY)
        doc.text(taxValue, totalsEndX - taxValueWidth, currentY)
        currentY += 20
      }

      // Divider line
      currentY += 5
      doc.moveTo(totalsStartX, currentY).lineTo(totalsEndX, currentY).stroke()
      currentY += 15

      // Total
      doc.fontSize(12).font('Helvetica-Bold')
      const totalLabel = 'Total:'
      const totalValue = `$${totalPrice.toFixed(2)}`
      const totalValueWidth = doc.widthOfString(totalValue)
      doc.text(totalLabel, totalsStartX, currentY)
      doc.text(totalValue, totalsEndX - totalValueWidth, currentY)

      // Payment status
      currentY += 30
      doc.fontSize(10).font('Helvetica')
      doc.text(
        `Payment Status: ${
          invoice.status === 'paid' ? 'PAID' : invoice.status.toUpperCase()
        }`,
        50,
        currentY
      )
      if (invoice.status === 'paid' && invoice.datePaid) {
        doc.text(
          `Paid Date: ${new Date(invoice.datePaid).toLocaleDateString()}`,
          50,
          currentY + 15
        )
      }
      if (invoice.paymentMethod) {
        const methodNames = {
          cash: 'Cash',
          check: 'Check',
          credit_card: 'Credit Card',
          bank_transfer: 'Bank Transfer',
          other: 'Other'
        }
        doc.text(
          `Payment Method: ${
            methodNames[invoice.paymentMethod] || invoice.paymentMethod
          }`,
          50,
          currentY + 30
        )
      }

      // Terms
      if (invoice.terms) {
        currentY += 50
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text('Payment Terms:', 50, currentY)
        doc.font('Helvetica')
        doc.text(invoice.terms, 50, currentY + 15, { width: 500 })
      }

      // Notes
      if (invoice.notes) {
        currentY += 40
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text('Notes:', 50, currentY)
        doc.font('Helvetica')
        doc.text(invoice.notes, 50, currentY + 15, { width: 500 })
      }

      // Footer
      const pageHeight = doc.page.height
      const footerY = pageHeight - 50
      doc.fontSize(8)
      doc.text(
        settings.invoiceFooter || 'Thank you for your business!',
        50,
        footerY,
        { align: 'center' }
      )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
