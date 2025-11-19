# Email Service Setup Guide

## Quick Setup for Gmail

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled
4. After enabling 2-Step Verification, go back to Security
5. Under "Signing in to Google", click **App passwords**
6. Select **Mail** and **Other (Custom name)**
7. Enter "APS Invoice System" as the name
8. Click **Generate**
9. Copy the 16-character password (you'll need this)

### Step 2: Add to .env File

Open your `.env` file in the APS directory and add these lines:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
```

**Important:** 
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password` with the app password you generated
- Do NOT use your regular Gmail password - you MUST use an App Password

### Step 3: Restart Your Server

After adding the environment variables, restart your Node.js server:

```bash
# If running locally
npm start

# Or if using nodemon
npm run dev
```

## Alternative: Other Email Services

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

## Testing Your Configuration

You can test if your email is configured correctly by trying to send an invoice. If you get an error, check:

1. **Environment variables are loaded**: Make sure your `.env` file is in the root of the APS directory
2. **Server restarted**: After changing `.env`, you must restart the server
3. **App Password is correct**: For Gmail, make sure you're using the App Password, not your regular password
4. **2-Step Verification enabled**: Gmail requires 2-Step Verification to generate App Passwords

## Troubleshooting

### "Invalid login" error
- Make sure you're using an App Password for Gmail, not your regular password
- Verify the email address is correct
- Check that 2-Step Verification is enabled

### "Connection timeout" error
- Check your firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct
- Try using port 465 with SMTP_SECURE=true

### "Email service is not configured" error
- Make sure SMTP_USER and SMTP_PASS are set in your .env file
- Restart your server after adding the variables
- Check that the .env file is in the correct location (root of APS directory)

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file should already be in `.gitignore`
- App Passwords are safer than using your main password
- For production, consider using a dedicated email service like SendGrid or Mailgun

