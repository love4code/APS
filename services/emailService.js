const nodemailer = require('nodemailer')

/**
 * Create email transporter
 * Uses environment variables for SMTP configuration
 */
const createTransporter = () => {
  // For development, you can use Gmail or other SMTP services
  // For production, configure with your actual SMTP settings
  
  // Remove spaces from password (Gmail App Passwords sometimes have spaces)
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : null
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass
    }
  })

  return transporter
}

/**
 * Send invoice email to customer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.customerName - Customer name
 * @param {Buffer} options.pdfBuffer - PDF invoice buffer
 * @param {string} options.jobId - Job ID for filename
 * @returns {Promise<Object>} Email result
 */
exports.sendInvoiceEmail = async ({ to, customerName, pdfBuffer, jobId }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.')
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: `"APS - Aboveground Pool Sales" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `Invoice #${jobId.slice(-8).toUpperCase()} - Aboveground Pool Sales`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d6efd;">Invoice from APS</h2>
          <p>Dear ${customerName},</p>
          <p>Please find attached your invoice for the aboveground pool installation.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your business!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            APS - Aboveground Pool Sales<br>
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${jobId.slice(-8).toUpperCase()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}

/**
 * Test email configuration
 * @returns {Promise<boolean>} True if email is configured
 */
exports.isEmailConfigured = () => {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

