# Invoice PDF and Email Setup

## Overview
The application now supports generating PDF invoices and sending them via email to customers.

## Features
- **Download Invoice**: Generate and download a PDF invoice for any job
- **Email Invoice**: Send the invoice directly to the customer's email address
- **Professional Format**: Clean, professional invoice layout with all job details

## Email Configuration

To enable email functionality, you need to configure SMTP settings using environment variables.

### Option 1: Gmail (Recommended for Development)

1. Enable "Less secure app access" or use an App Password:
   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Generate an App Password for "Mail"

2. Set environment variables:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Option 2: Other SMTP Services

For production, use a professional email service like:
- SendGrid
- Mailgun
- AWS SES
- Your company's SMTP server

Set the appropriate environment variables:
```bash
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=false  # or true for port 465
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

### Heroku Configuration

If deploying to Heroku, set the environment variables:
```bash
heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_SECURE=false
heroku config:set SMTP_USER=your-email@gmail.com
heroku config:set SMTP_PASS=your-app-password
```

## Usage

### Download Invoice
1. Navigate to any job detail page
2. Click "Download Invoice" button
3. PDF will be generated and downloaded

### Email Invoice
1. Navigate to any job detail page
2. Ensure the customer has an email address
3. Click "Email Invoice" button
4. Invoice will be sent to the customer's email

## Invoice Contents

The PDF invoice includes:
- Invoice number (based on job ID)
- Invoice date
- Company information
- Customer billing information
- Job details (status, install date, installer, store)
- Itemized list of products/services
- Quantity, unit price, and totals
- Tax calculations (6.25%)
- Install cost
- Total amount
- Payment status
- Notes (if any)

## Troubleshooting

### Email Not Sending
- Verify SMTP credentials are set correctly
- Check that customer has an email address
- Review server logs for error messages
- For Gmail, ensure App Password is used (not regular password)

### PDF Generation Errors
- Ensure all job data is properly populated
- Check that customer information exists
- Verify job items are correctly formatted

## Notes

- Invoices are generated on-demand (not stored)
- Email sending is logged in the activity log
- PDF format is optimized for printing
- Email includes a professional HTML template

