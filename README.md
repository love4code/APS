# APS - Aboveground Pool Sales CRM

A comprehensive Customer Relationship Management (CRM) system for tracking pool sales, installations, customers, products, stores, and job management with calendar sharing, invoice generation, and email capabilities.

## 📑 Table of Contents

- [Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Features](#-features)
- [User Roles & Permissions](#-user-roles--permissions)
- [Complete User Guide](#-complete-user-guide)
  - [1. Logging In](#1-logging-in)
  - [2. Dashboard](#2-dashboard)
  - [3. Navigation Menu](#3-navigation-menu)
  - [4. Managing Customers](#4-managing-customers)
  - [5. Managing Products & Services](#5-managing-products--services)
  - [6. Managing Stores](#6-managing-stores)
  - [7. Managing Jobs](#7-managing-jobs)
  - [8. Creating a New Sale](#8-creating-a-new-sale)
  - [9. Managing Invoices](#9-managing-invoices)
  - [10. Managing Payments](#10-managing-payments)
  - [11. Managing Sales Reps](#11-managing-sales-reps)
  - [12. Managing Installers](#12-managing-installers)
  - [13. Calendar Sharing](#13-calendar-sharing)
  - [13.1. Calendar Invite System](#131-calendar-invite-system)
  - [14. Company Settings](#14-company-settings)
  - [15. Personal Views](#15-personal-views)
  - [16. Admin: Managing Users](#16-admin-managing-users)
- [Tax Calculation](#-tax-calculation)
- [Email Configuration](#-email-configuration)
- [Technical Details](#-technical-details)
- [Troubleshooting](#-troubleshooting)
- [Production Deployment](#-production-deployment)
- [Notes](#-notes)

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18, v20, or v22)
- MongoDB (running locally or MongoDB Atlas connection string)
- npm (v9.0.0 or higher)

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/aps_app
   # Or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aps_app

   # Session
   SESSION_SECRET=your_secret_session_key_here_change_in_production

   # Server
   PORT=3000
   NODE_ENV=development

   # Email Configuration (Optional - for sending invoices)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

   **Note:** For Gmail, you'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

3. **Create the admin user:**

   ```bash
   npm run create-admin
   ```

   This creates an admin account with:

   - **Email**: `admin@aps.com`
   - **Password**: `admin123`

   **⚠️ Change this password immediately after first login!**

4. **Start the server:**

   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

5. **Access the application:**
   - Open your browser to `http://localhost:3000`
   - Login with the admin credentials

## 📋 Features

### Core Features

- **Authentication & User Management**: Secure login, role-based access, user management
- **Customer Management**: Complete customer database with search functionality
- **Product & Service Management**: Manage products/services with pricing and tax settings
- **Job Management**: Track sales and installations with full job details
- **Store Management**: Manage multiple store locations
- **Sales Rep Management**: Track sales representatives and their performance
- **Installer Management**: Track installers and their assigned jobs
- **Payment Tracking**: Record and track payments for jobs
- **Invoice System**: Generate standalone invoices and PDF invoices
- **Calendar View**: Visual calendar of scheduled jobs with color-coding by store
- **Calendar Sharing**: Share calendars with stores, installers, and sales reps (direct links or email invites)
- **Calendar Invites**: Send email invitations that require login credentials
- **Email Integration**: Send PDF invoices via email
- **Company Settings**: Configure company information for invoices

## 🔐 User Roles & Permissions

### Admin

- Full access to all features
- Can manage users (create, edit, deactivate)
- Can view and manage all customers, products, jobs, stores
- Can access admin panel and settings

### User

- Can view and manage customers, products, and jobs
- Can view their own sales (if marked as sales rep)
- Can view their assigned installs (if marked as installer)
- Cannot access user management or settings

## 📖 Complete User Guide

### 1. Logging In

1. Navigate to `http://localhost:3000/login`
2. Enter your email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### 2. Dashboard

The dashboard provides an overview of:

- **Installers**: Cards showing each installer with scheduled and completed job counts
- **Sales Reps**: Cards showing total jobs and sales totals for each rep
- **Recent Jobs**: Cards showing job status, payment status, customer, and totals

Click on any card to view more details.

### 3. Navigation Menu

The main navigation includes:

- **Dashboard**: Overview of installers, sales reps, and recent jobs
- **Jobs**:
  - All Jobs: View and manage all jobs
  - Calendar: Visual calendar view of scheduled jobs
- **New Sale**: Create a new sale with multiple products
- **People** (Dropdown):
  - Customers: Manage customer database
  - Sales Reps: View sales representatives
  - Installers: View installers
- **Invoices**: Manage standalone invoices
- **Settings** (Dropdown):
  - Products: Manage products and services
  - Stores: Manage store locations
  - Payments: Manage payment records
  - Company Settings: Configure company information
  - Users: User management (admin only)
- **My** (Dropdown - if applicable):
  - My Sales: View your personal sales (if you're a sales rep)
  - My Installs: View your assigned installations (if you're an installer)

### 4. Managing Customers

#### View All Customers

1. Click **"People"** → **"Customers"** in the navigation
2. You'll see a list of all customers with their contact information

#### Search Customers

1. Use the search box at the top of the customers list
2. Search by:
   - Customer name
   - Email address
   - Phone number
   - Sales rep name (finds customers through their jobs)
   - Installer/contractor name (finds customers through their jobs)
3. Click **"Clear Search"** to show all customers again

#### Create New Customer

1. Click **"New Customer"** button
2. Fill in customer information:
   - **Name** (required)
   - Phone
   - Email
   - Address
   - City, State, Zip Code
   - Notes
3. Click **"Save"**

#### View Customer Details

1. Click on a customer name from the list
2. You'll see:
   - Contact information
   - All jobs associated with the customer
   - Option to add a new job for this customer
   - Option to create an invoice for this customer

#### Edit Customer

1. Go to customer detail page
2. Click **"Edit"** button
3. Make changes
4. Click **"Save"**

#### Delete Customer

1. Go to customer detail page
2. Click **"Delete"** button
3. **Note**: Customers can only be deleted if they have no associated jobs

### 5. Managing Products & Services

#### View All Products

1. Click **"Settings"** → **"Products"** in the navigation
2. You'll see a list of all products and services

#### Create New Product/Service

1. Click **"New Product/Service"** button
2. Fill in the form:
   - **Name** (required)
   - Description (optional)
   - **Base Price** (required)
   - **Type**: Product or Service
   - **Taxable**: Check if the item should have 6.25% tax applied
3. Click **"Save"**

#### Edit Product

1. Click **"Edit"** next to any product
2. Make changes
3. Click **"Save"**

#### Delete Product

1. Click **"Delete"** next to any product
2. Confirm deletion

**Note**: Products can be created on-the-fly when creating jobs using the "New Product/Service" button in the job form.

### 6. Managing Stores

#### View All Stores

1. Click **"Settings"** → **"Stores"** in the navigation
2. You'll see a list of all stores

#### Create New Store

1. Click **"New Store"** button
2. Fill in store information:
   - **Name** (required)
   - Address
   - City, State, Zip Code
   - Phone
   - Email
   - Notes
   - Active status
3. Click **"Save"**

#### Share Store Calendar

1. Go to Stores list
2. Click **"Share"** button next to a store
3. Copy the calendar link from the modal
4. Send the link to the store
5. The store can view their calendar without logging in

#### Edit Store

1. Click **"Edit"** next to any store
2. Make changes
3. Click **"Save"**

#### Delete Store

1. Click **"Delete"** next to any store
2. Confirm deletion

### 7. Managing Jobs

#### View All Jobs

1. Click **"Jobs"** → **"All Jobs"** in the navigation
2. You'll see a list of all jobs with status, customer, totals, and payment status

#### View Job Calendar

1. Click **"Jobs"** → **"Calendar"** in the navigation
2. You'll see a visual calendar of all scheduled jobs
3. Jobs are color-coded by store
4. Click on any event to view job details
5. Use the view switcher (Month, Week, Day, List) to change the view

#### Create New Job

1. Click **"New Job"** button (or from Jobs → All Jobs)
2. Fill in job information:
   - **Customer** (required) - Select from dropdown or create from customer page
   - **Sales Rep**: Select sales rep or check "Sold by Owner"
   - **Store**: Select store location (optional)
   - **Installer**: Select installer (optional)
   - **Install Date**: Set installation date
   - **Status**: Set job status (scheduled, complete, delivered, etc.)
3. **Add Items**:
   - Click **"Add Item"** button
   - Select product/service from dropdown
   - Quantity and price will auto-fill
   - Adjust quantity and price as needed
   - Check/uncheck "Taxable" as needed
   - Click **"New Product/Service"** to create a product on-the-fly (no page refresh)
   - Remove items by clicking **"Remove"** button
4. **Install Cost**: Enter installation cost (non-taxable, added separately)
5. **Notes**: Add any additional notes
6. Click **"Save Job"**
7. Totals are automatically calculated (subtotal, tax, total)

#### View Job Details

1. Click **"View"** on any job
2. You'll see:
   - Customer information
   - Job details (status, dates, assigned personnel, store)
   - Items list with pricing
   - Calculated totals (subtotal, tax, install cost, total)
   - Payment status
   - Activity history
   - Actions:
     - **Create Invoice**: Create a standalone invoice for this job
     - **Download PDF**: Download PDF invoice
     - **Email PDF**: Send PDF invoice via email (requires email configuration)
     - **Edit**: Edit job details
     - **Back to Jobs**: Return to jobs list

#### Update Job Status

1. Go to job detail page
2. Use the **"Update Status"** dropdown
3. Select new status
4. Status changes are automatically saved and logged

#### Update Payment Status

1. Go to job detail page
2. Check **"Is Paid"** checkbox
3. Optionally set **"Date Paid"**
4. Click **"Update Payment"**
5. Changes are automatically saved and logged

#### Edit Job

1. Go to job detail page
2. Click **"Edit"** button
3. Make changes to:
   - Customer, sales rep, installer, store
   - Install date and status
   - Items (add/remove/modify)
   - Install cost
   - Notes
4. Click **"Save Job"**

### 8. Creating a New Sale

The "New Sale" form is optimized for creating sales with multiple products.

1. Click **"New Sale"** in the navigation bar
2. Fill in customer information (left column):
   - Select customer (required)
   - Select sales rep (optional)
   - Check "Sold by Owner" if applicable
   - Select store (optional)
   - Select installer (optional)
   - Set install date and status
   - Add notes if needed
3. **Add Products** (right column):
   - Click **"Add Product"** button
   - Select a product/service from the dropdown
   - Quantity and price will auto-fill
   - Adjust as needed
   - Check/uncheck "Taxable" as needed
   - Click **"New Product/Service"** to create a product on-the-fly
   - Remove products by clicking the trash icon
   - **You can add multiple products** - keep clicking "Add Product"
4. **Set Install Cost**:
   - Enter the installation cost
   - This is **non-taxable** and added separately
5. **View Totals** (automatically calculated in real-time):
   - **Subtotal**: Sum of all products
   - **Tax (6.25%)**: Tax on taxable items only
   - **Install Cost**: Installation fee (non-taxable)
   - **Total**: Grand total
6. Click **"Save Sale"**
7. You'll be redirected to the job detail page

### 9. Managing Invoices

#### View All Invoices

1. Click **"Invoices"** in the navigation
2. You'll see a list of all standalone invoices
3. Filter by customer using the customer dropdown

#### Create New Invoice

1. Click **"New Invoice"** button
2. Or create from:
   - Job detail page: Click **"Create Invoice"** (pre-populates job data)
   - Customer detail page: Click **"New Invoice"** (pre-selects customer)
3. Fill in invoice information:
   - **Invoice Number**: Auto-generated (format: INV-YYYY-####)
   - **Customer** (required)
   - **Job**: Link to a job (optional)
   - **Store**: Select store (optional)
   - **Sales Rep**: Select sales rep or check "Sold by Owner"
   - **Issue Date**: Invoice date
   - **Due Date**: Payment due date (optional)
   - **Status**: Draft, Sent, Paid, Overdue, Cancelled
4. **Add Items**:
   - Click **"Add Item"** button
   - Enter description, quantity, unit price
   - Check "Taxable" if applicable
   - Add multiple items as needed
5. **Discount**: Enter discount amount (optional)
6. **Tax Rate**: Default 6.25% (can be adjusted)
7. **Terms**: Payment terms (default: "Payment due within 30 days")
8. **Notes**: Additional notes
9. Click **"Save Invoice"**

#### View Invoice Details

1. Click on an invoice from the list
2. You'll see:
   - Invoice number and dates
   - Customer information
   - Items and totals
   - Payment status
   - Actions:
     - **Download PDF**: Download PDF invoice
     - **Email PDF**: Send invoice via email
     - **Mark as Paid**: Update payment status
     - **Edit**: Edit invoice
     - **Delete**: Delete invoice

#### Download PDF Invoice

1. Go to invoice detail page
2. Click **"Download PDF"** button
3. PDF will download with company information from settings

#### Email Invoice

1. Go to invoice detail page
2. Click **"Email PDF"** button
3. Invoice will be sent to customer's email address
4. **Note**: Requires email configuration in `.env` file

### 10. Managing Payments

#### View All Payments

1. Click **"Settings"** → **"Payments"** in the navigation
2. You'll see a list of all payment records

#### Create New Payment

1. Click **"New Payment"** button
2. Or create from:
   - Sales Rep detail page
   - Installer detail page
   - Job detail page
3. Fill in payment information:
   - **Recipient**: Select sales rep or installer
   - **Job**: Select associated job
   - **Amount**: Payment amount
   - **Date Paid**: Payment date
   - **Payment Method**: Cash, Check, Credit Card, Bank Transfer, Other
   - **Notes**: Additional notes
4. Click **"Save Payment"**

### 11. Managing Sales Reps

#### View All Sales Reps

1. Click **"People"** → **"Sales Reps"** in the navigation
2. You'll see a list of all sales reps with statistics

#### View Sales Rep Details

1. Click on a sales rep name
2. You'll see:
   - Sales statistics (total jobs, sales, paid/unpaid)
   - All jobs/sales for this rep
   - Payment records
   - **Share Calendar** button: Share calendar showing all jobs across all stores

#### Share Sales Rep Calendar

1. Go to sales rep detail page
2. Click **"Share Calendar (All Jobs)"** button
3. Copy the calendar link from the modal
4. Send the link to the sales rep
5. The sales rep can view **all jobs across all stores** without logging in
6. Click **"Regenerate Link"** to revoke old links

### 12. Managing Installers

#### View All Installers

1. Click **"People"** → **"Installers"** in the navigation
2. You'll see a list of all installers with statistics

#### View Installer Details

1. Click on an installer name
2. You'll see:
   - Job statistics (total, scheduled, completed, etc.)
   - All jobs assigned to this installer
   - Payment records
   - **Share Calendar** button: Share calendar showing only this installer's jobs

#### Share Installer Calendar

1. Go to installer detail page
2. Click **"Share Calendar"** button
3. Copy the calendar link from the modal
4. Send the link to the installer
5. The installer can view **only their assigned jobs** without logging in
6. Click **"Regenerate Link"** to revoke old links

### 13. Calendar Sharing

The calendar sharing feature allows you to share job calendars with stores, installers, and sales reps. You can share via direct links (no login required) or send email invites (requires login credentials).

#### Share Store Calendar

**Option 1: Share Direct Link (No Login Required)**

1. Go to **"Settings"** → **"Stores"**
2. Click **"Share"** next to a store
3. Select **"Share Link"** tab
4. Copy the link from the modal
5. Send to the store
6. Store sees only jobs assigned to their store (no login required)

**Option 2: Send Email Invite (Requires Login)**

1. Go to **"Settings"** → **"Stores"**
2. Click **"Share"** next to a store
3. Select **"Send Invite"** tab
4. Enter recipient email address (required)
5. Enter recipient name (optional)
6. Click **"Send Invite"**
7. Recipient receives an email with an invite link
8. Recipient must create an account to view the calendar

#### Share Installer Calendar

**Option 1: Share Direct Link (No Login Required)**

1. Go to **"People"** → **"Installers"**
2. Click on an installer
3. Click **"Share Calendar"** button
4. Select **"Share Link"** tab
5. Copy the link from the modal
6. Send to the installer
7. Installer sees only their assigned jobs (no login required)

**Option 2: Send Email Invite (Requires Login)**

1. Go to **"People"** → **"Installers"**
2. Click on an installer
3. Click **"Share Calendar"** button
4. Select **"Send Invite"** tab
5. Enter recipient email address (required)
6. Enter recipient name (optional)
7. Click **"Send Invite"**
8. Recipient receives an email with an invite link
9. Recipient must create an account to view the calendar

#### Share Sales Rep Calendar

**Option 1: Share Direct Link (No Login Required)**

1. Go to **"People"** → **"Sales Reps"**
2. Click on a sales rep
3. Click **"Share Calendar (All Jobs)"** button
4. Select **"Share Link"** tab
5. Copy the link from the modal
6. Send to the sales rep
7. Sales rep sees **all jobs across all stores** (no login required)

**Option 2: Send Email Invite (Requires Login)**

1. Go to **"People"** → **"Sales Reps"**
2. Click on a sales rep
3. Click **"Share Calendar (All Jobs)"** button
4. Select **"Send Invite"** tab
5. Enter recipient email address (required)
6. Enter recipient name (optional)
7. Click **"Send Invite"**
8. Recipient receives an email with an invite link
9. Recipient must create an account to view the calendar

#### Regenerate Share Links

- Click **"Regenerate Link"** in any share modal
- This invalidates the old link and creates a new one
- Use this to revoke access if needed

### 13.1. Calendar Invite System

The calendar invite system allows you to send email invitations that require recipients to create login credentials before accessing the calendar.

#### How Invites Work

1. **Sending an Invite**:

   - Go to any store, installer, or sales rep detail page
   - Click **"Share"** or **"Share Calendar"** button
   - Select **"Send Invite"** tab
   - Enter email and optional name
   - Click **"Send Invite"**
   - An email is sent with a unique invite link

2. **Invite Email**:

   - Recipient receives an email with a personalized invitation
   - Email includes a button to accept the invitation
   - Invite link is valid for 30 days

3. **Accepting an Invite**:
   - Recipient clicks the invite link in the email
   - If account already exists: User is prompted to log in
   - If no account: User sees account creation form
   - User enters:
     - Name (required)
     - Password (minimum 6 characters)
     - Confirm Password
   - Account is created and user is automatically logged in
   - User is redirected to the appropriate calendar

#### Invite Features

- **30-Day Expiration**: Invites expire after 30 days
- **One-Time Use**: Each invite can only be accepted once
- **Duplicate Prevention**: Only one pending invite per email address
- **Auto-Redirect**: Users are automatically redirected to their calendar after account creation
- **Secure**: Invite tokens are cryptographically secure (32-byte random)

#### Invite Status

- **Pending**: Invite has been sent but not yet accepted
- **Accepted**: Invite has been accepted and account created
- **Expired**: Invite has expired (30 days)

#### Troubleshooting Invites

- **Invite Not Received**: Check spam folder, verify email configuration
- **Invite Expired**: Request a new invitation
- **Account Already Exists**: User should log in with existing credentials
- **Invalid Token**: Contact administrator for a new invite

### 14. Company Settings

#### Configure Company Information

1. Click **"Settings"** → **"Company Settings"**
2. Fill in company information:
   - Company Name
   - Address, City, State, Zip Code
   - Phone, Email, Website
   - Tax Rate (default: 6.25%)
   - Default Payment Terms
   - Invoice Footer Message
3. Click **"Save Settings"**
4. This information will appear on all PDF invoices

### 15. Personal Views

#### My Sales

- Access via **"My"** → **"My Sales"** in navigation (visible if you're a sales rep)
- Shows all jobs where:
  - You are the assigned sales rep, OR
  - The job was sold by owner and you created it

#### My Installs

- Access via **"My"** → **"My Installs"** in navigation (visible if you're an installer)
- Shows all jobs assigned to you as the installer
- Sorted by install date

### 16. Admin: Managing Users

1. Click **"Settings"** → **"Users"** (admin only)
2. **Create New User**:
   - Click **"New User"**
   - Enter name, email, password
   - Select role (admin or user)
   - Check **"Is Sales Rep"** if applicable
   - Check **"Is Installer"** if applicable
   - Click **"Save"**
3. **Edit User**: Click **"Edit"** next to any user
4. **Deactivate User**: Click **"Deactivate"** to disable a user account (user cannot log in but data is preserved)
5. **Delete User**: Click **"Delete"** to permanently remove a user account
   - **Warning**: This action cannot be undone
   - You cannot delete your own account
   - All user data will be permanently removed

**Note**: Sales reps and installers don't need passwords - they're just for tracking. Regular users need passwords to log in.

## 💰 Tax Calculation

- Taxable items are charged **6.25%** tax (configurable in Company Settings)
- Tax is automatically calculated on job/invoice creation and updates
- Calculation: `taxTotal = sum(taxable_item_totals) * taxRate`
- **Install cost is NOT taxable** - it's added separately to the total
- Total price = subtotal + tax total + install cost - discount

## 📧 Email Configuration

### Setting Up Email (for Sending Invoices)

1. **Gmail Setup**:

   - Go to your Google Account settings
   - Enable 2-Step Verification
   - Generate an [App Password](https://support.google.com/accounts/answer/185833)
   - Use the app password in your `.env` file

2. **Other Email Providers**:

   - Update `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` in `.env`
   - Use your email credentials

3. **Test Email Configuration**:

   ```bash
   npm run test-email
   ```

4. **Send Invoice via Email**:
   - Go to job or invoice detail page
   - Click **"Email PDF"** button
   - Invoice will be sent to customer's email address

## 🔧 Technical Details

### Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **View Engine**: EJS
- **Styling**: Bootstrap 5, Bootstrap Icons
- **Calendar**: FullCalendar.js
- **PDF Generation**: PDFKit
- **Email**: Nodemailer
- **Authentication**: Session-based with bcrypt password hashing

### Project Structure

```
APS/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── middleware/      # Auth and role middleware
├── models/          # Mongoose schemas
├── routes/          # Route definitions
├── services/        # Business logic (invoice, email)
├── views/           # EJS templates
│   ├── auth/        # Login views
│   ├── dashboard/   # Dashboard views
│   ├── customers/   # Customer views
│   ├── products/    # Product views
│   ├── jobs/        # Job views (including calendar)
│   ├── invoices/    # Invoice views
│   ├── stores/      # Store views
│   └── users/       # User management views
├── public/          # Static files (CSS, JS)
├── scripts/         # Utility scripts
├── app.js           # Express app configuration
└── server.js        # Server entry point
```

### Key Models

- **User**: Authentication, roles, sales rep/installer flags, calendar share tokens
- **Customer**: Customer information and contact details
- **Product**: Products and services with pricing
- **Job**: Sales and installation jobs with items, totals, status, install cost
- **Store**: Store locations with calendar share tokens
- **Invoice**: Standalone invoices with items and totals
- **Payment**: Payment records for sales reps and installers
- **Settings**: Company information for invoices
- **CalendarInvite**: Calendar invitation tokens and status
- **ActivityLog**: Job activity history

## 🐛 Troubleshooting

### Admin Login Not Working

1. Run `npm run create-admin` to reset the admin password
2. Ensure MongoDB is running
3. Check that the email is exactly `admin@aps.com` (case-sensitive)

### Database Connection Issues

- Verify MongoDB is running: `mongod` or check your MongoDB service
- Check `.env` file has correct `MONGODB_URI`
- For MongoDB Atlas:
  - Ensure your IP is whitelisted
  - Check connection string format
  - Verify username/password are URL-encoded

### Port Already in Use

- Change `PORT` in `.env` file
- Or stop the process using port 3000

### Email Not Sending

1. Check `.env` file has correct SMTP settings
2. For Gmail, ensure you're using an App Password (not regular password)
3. Test email configuration: `npm run test-email`
4. Check customer has a valid email address

### Calendar Not Loading

- Check browser console for errors
- Ensure FullCalendar.js is loading (check network tab)
- Verify calendar events endpoint is accessible

### PDF Invoice Issues

- Ensure company settings are configured
- Check that job/invoice has items
- Verify customer information is complete

## 🚀 Production Deployment

Before deploying to production:

1. **Environment Variables**:

   - Change `SESSION_SECRET` to a strong random string
   - Update `MONGODB_URI` to your production database
   - Set `NODE_ENV=production`
   - Configure email settings

2. **Security**:

   - Use HTTPS for secure connections
   - Set up proper MongoDB authentication
   - Use strong passwords for all accounts
   - Regularly update dependencies

3. **Performance**:

   - Use a process manager like PM2
   - Set up database indexes
   - Configure proper logging
   - Set up monitoring

4. **Backup**:
   - Regular database backups
   - Backup environment variables securely

## 📝 Notes

- Passwords are hashed using bcrypt before storage
- Sessions are stored in MongoDB
- Job totals are automatically recalculated on every save
- Activity logs track job status and payment changes
- Customers cannot be deleted if they have associated jobs
- Calendar share tokens are auto-generated and unique
- PDF invoices use company information from settings
- Email invoices require SMTP configuration
- Calendar invites expire after 30 days
- Users can be permanently deleted (admin only, cannot delete yourself)
- Invite system requires email configuration to send invitations

## 📄 License

ISC

## 👤 Author

APS Development Team

---

**Need Help?** Check the troubleshooting section or review the code comments for detailed implementation notes.
