/**
 * Test Email Configuration Script
 * 
 * This script tests your email configuration by sending a test email
 * 
 * Usage: node scripts/test-email.js
 */

require('dotenv').config()
const emailService = require('../services/emailService')

async function testEmail() {
  console.log('=== Testing Email Configuration ===\n')

  // Check if email is configured
  if (!emailService.isEmailConfigured()) {
    console.error('❌ Email service is not configured!')
    console.error('\nPlease set the following environment variables in your .env file:')
    console.error('  SMTP_USER=your-email@gmail.com')
    console.error('  SMTP_PASS=your-app-password')
    console.error('\nSee EMAIL_SETUP.md for detailed instructions.')
    process.exit(1)
  }

  console.log('✅ Email service is configured')
  console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`)
  console.log(`   SMTP Port: ${process.env.SMTP_PORT || '587'}`)
  console.log(`   SMTP User: ${process.env.SMTP_USER}`)
  console.log(`   SMTP Pass: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'Not set'}`)
  console.log('\n')

  // Get test email address
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  readline.question('Enter a test email address to send to: ', async (testEmail) => {
    if (!testEmail || !testEmail.includes('@')) {
      console.error('❌ Invalid email address')
      readline.close()
      process.exit(1)
    }

    try {
      console.log(`\n📧 Sending test email to ${testEmail}...`)
      
      // Create a simple test PDF buffer
      const PDFDocument = require('pdfkit')
      const buffers = []
      const doc = new PDFDocument()
      
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers)
        
        try {
          await emailService.sendInvoiceEmail({
            to: testEmail,
            customerName: 'Test Customer',
            pdfBuffer: pdfBuffer,
            jobId: 'TEST-1234'
          })
          
          console.log('✅ Test email sent successfully!')
          console.log(`   Check the inbox of ${testEmail}`)
          readline.close()
          process.exit(0)
        } catch (error) {
          console.error('❌ Error sending test email:')
          console.error(`   ${error.message}`)
          
          if (error.message.includes('Invalid login')) {
            console.error('\n💡 Tip: Make sure you\'re using a Gmail App Password, not your regular password.')
            console.error('   See EMAIL_SETUP.md for instructions on creating an App Password.')
          }
          
          readline.close()
          process.exit(1)
        }
      })
      
      doc.text('Test Invoice', { align: 'center' })
      doc.text('This is a test email from APS Invoice System.')
      doc.end()
    } catch (error) {
      console.error('❌ Error:', error.message)
      readline.close()
      process.exit(1)
    }
  })
}

testEmail()

