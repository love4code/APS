const nodemailer = require('nodemailer')

/**
 * Create email transporter
 * Uses environment variables for SMTP configuration
 */
const createTransporter = () => {
  // For development, you can use Gmail or other SMTP services
  // For production, configure with your actual SMTP settings

  // Remove spaces from password (Gmail App Passwords sometimes have spaces)
  const smtpPass = process.env.SMTP_PASS
    ? process.env.SMTP_PASS.replace(/\s/g, '')
    : null

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
      throw new Error(
        'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      )
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: `"APS - Aboveground Pool Sales" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `Invoice #${jobId
        .slice(-8)
        .toUpperCase()} - Aboveground Pool Sales`,
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
 * Send calendar invite email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.inviteToken - Invite token
 * @param {string} options.inviteType - Type of invite (store, installer, salesrep)
 * @param {string} options.entityName - Name of store/installer/sales rep
 * @param {string} options.baseUrl - Base URL for the application
 * @returns {Promise<Object>} Email result
 */
exports.sendCalendarInvite = async ({
  to,
  name,
  inviteToken,
  inviteType,
  entityName,
  baseUrl
}) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
      )
    }

    const transporter = createTransporter()

    const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}`

    let calendarType = ''
    if (inviteType === 'store') {
      calendarType = 'store calendar'
    } else if (inviteType === 'installer') {
      calendarType = 'installation calendar'
    } else if (inviteType === 'salesrep') {
      calendarType = 'all jobs calendar'
    }

    const mailOptions = {
      from: `"APS - Aboveground Pool Sales" <${process.env.SMTP_USER}>`,
      to: to,
      subject: `Calendar Access Invitation - ${entityName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0d6efd;">Calendar Access Invitation</h2>
          <p>Hello ${name || 'there'},</p>
          <p>You have been invited to view the ${calendarType} for <strong>${entityName}</strong>.</p>
          <p>To accept this invitation and set up your account, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #0d6efd; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Accept Invitation & Create Account
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            <strong>Note:</strong> This invitation will expire in 30 days. After accepting, you'll need to create login credentials to access the calendar.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            APS - Aboveground Pool Sales<br>
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Calendar invite email error:', error)
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
