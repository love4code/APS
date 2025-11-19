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
  - [17. Employee Management & Payroll](#17-employee-management--payroll)
    - [17.1. Managing Employees](#171-managing-employees)
    - [17.2. Recording Time Entries](#172-recording-time-entries)
    - [17.3. Managing Pay Periods](#173-managing-pay-periods)
    - [17.4. Processing Payroll](#174-processing-payroll)
    - [17.5. Exporting Payroll Data](#175-exporting-payroll-data)
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
- **Customer Management**: Complete customer database with search functionality, separate sales and jobs views
- **Product & Service Management**: Manage products/services with pricing and tax settings, searchable dropdowns with type filtering
- **Job Management**: Track sales and installations with full job details, extended price calculations
- **Store Management**: Manage multiple store locations
- **Sales Rep Management**: Track sales representatives and their performance
- **Installer Management**: Track installers and their assigned jobs
- **Payment Tracking**: Record and track payments for jobs
- **Invoice System**: Generate standalone invoices and PDF invoices with extended price display, delete functionality
- **Calendar View**: Visual calendar of scheduled jobs (jobs only, not sales) with color-coding by store, clickable events with read-only job details
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
   - **Sales Section**: All sales (isSale = true) for this customer
   - **Jobs Section**: All jobs (installations) for this customer
   - Option to add a new job or sale for this customer
   - Option to create an invoice for this customer
   - Recent invoices

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

**Note**: Products can be created on-the-fly when creating jobs or sales using the "New Product/Service" button in the form (no page refresh required).

#### Product/Service Search Features

When adding items to jobs, sales, or invoices:

- **Searchable Dropdown**: Type to filter products/services by name
- **Type Filter**: Use the dropdown to filter by "All", "Products", or "Services"
- **Real-time Filtering**: Results update as you type
- **Extended Price Display**: Automatically shows quantity × unit price

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
4. **Click on any event** to view job details in a read-only modal:
   - Customer information
   - Job details (status, dates, assigned personnel, store)
   - Items list with pricing
   - Calculated totals
   - Payment status
   - Notes
5. Use the view switcher (Month, Week, Day, List) to change the view
6. **Note**: Only jobs (not sales) appear on the calendar

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
   - **Search for products/services**: Type in the search field to filter products/services
   - **Filter by type**: Use the dropdown to filter by "All", "Products", or "Services"
   - Select product/service from the filtered results
   - Quantity and price will auto-fill
   - **Extended Price** is automatically calculated and displayed (quantity × unit price)
   - Adjust quantity and price as needed (extended price updates in real-time)
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
   - **Search for products/services**: Type in the search field to filter products/services
   - **Filter by type**: Use the dropdown to filter by "All", "Products", or "Services"
   - Select a product/service from the filtered results
   - Quantity and price will auto-fill
   - **Extended Price** is automatically calculated and displayed (quantity × unit price)
   - Adjust as needed (extended price updates in real-time)
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
   - **Extended Price** is automatically calculated and displayed (quantity × unit price)
   - Extended price updates in real-time as you change quantity or unit price
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
   - Items table showing:
     - Description
     - Quantity
     - Unit Price
     - Extended Price (quantity × unit price)
     - Taxable status
     - Item Total
   - Calculated totals (subtotal, discount, tax, total)
   - Payment status
   - Actions:
     - **Download PDF**: Download PDF invoice
     - **Email PDF**: Send invoice via email
     - **Mark as Paid**: Update payment status
     - **Edit**: Edit invoice
     - **Delete**: Delete invoice (with confirmation)

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
7. **Click on any calendar event** to view job details in a read-only modal

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
8. **Click on any calendar event** to view job details in a read-only modal

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
8. **Click on any calendar event** to view job details in a read-only modal

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

### 17. Employee Management & Payroll

The Employee Management & Payroll system allows you to track employee information, record time worked, manage pay periods, calculate payroll, and export data for accounting.

#### 17.1. Managing Employees

**Access**: Click **"People"** → **"Employees"** in the navigation menu.

**Creating a New Employee**:

1. Click **"New Employee"** button
2. Fill in required information:
   - **First Name** and **Last Name** (required)
   - **Email** (required, must be unique)
   - **Phone** (optional)
   - **Position** (e.g., Installer, Sales Rep, Manager)
   - **Department** (e.g., Sales, Installations, Admin)
   - **Status**: Active, Inactive, Terminated, or On Leave
   - **Hire Date** (required)
   - **Termination Date** (optional, auto-set if status is "Terminated")
   - **Pay Type**: Hourly or Salary (required)
   - **Hourly Rate** (required if Pay Type is Hourly)
   - **Annual Salary** (required if Pay Type is Salary)
   - **Overtime Multiplier** (default: 1.5 for time and a half)
   - **Notes** (optional)
3. Click **"Save Employee"**

**Viewing Employee Details**:

- Click on any employee name to view their detail page
- The detail page shows:
  - Employee information
  - This month's summary (total hours, overtime, PTO)
  - Recent time entries
  - Recent payroll records
  - Quick actions (Add Time Entry, Mark Inactive, Terminate)

**Editing an Employee**:

1. Go to employee detail page
2. Click **"Edit"** button
3. Update any fields
4. Click **"Save Employee"**

**Changing Employee Status**:

- **Mark Inactive**: From employee detail page, click **"Mark Inactive"** (employee remains in system but is filtered out of active lists)
- **Terminate**: Click **"Terminate"** button (sets status to "Terminated" and records termination date)

**Filtering Employees**:

- Use the search box to find employees by name or email
- Filter by **Status** (Active, Inactive, Terminated, On Leave)
- Filter by **Department**

#### 17.2. Recording Time Entries

**Access**: Click **"Payroll"** → **"Time Entries"** in the navigation menu.

**Creating a Time Entry**:

1. Click **"New Time Entry"** button
2. Fill in the form:
   - **Employee** (required): Select from dropdown
   - **Date** (required)
   - **Start Time** and **End Time** (optional): If provided, hours will be auto-calculated
   - **Hours Worked** (required): Enter directly or auto-calculated from start/end time
   - **Break Minutes**: Time taken for breaks (subtracted from total hours)
   - **Overtime Hours**: Auto-calculated if hours > 8 in a day (can be manually adjusted)
   - **Type**: Regular, Overtime, PTO, Sick, or Holiday
   - **Job/Project Name** (optional): Link to a specific job or project
   - **Job/Project ID** (optional): Reference ID
   - **Notes** (optional)
3. Click **"Save Time Entry"**

**Time Calculation Rules**:

- If **Start Time** and **End Time** are provided:
  - Hours = (End Time - Start Time) - Break Minutes
  - Automatically calculated when times are entered
- **Overtime Calculation**:
  - For "Regular" type entries: Hours over 8 in a day are counted as overtime
  - Weekly overtime (over 40 hours) is tracked but not auto-calculated in the UI
  - Overtime multiplier is applied during payroll processing

**Approving Time Entries**:

- Time entries start as **"Pending"** status
- **Admins** can approve time entries:
  1. Go to time entry detail page
  2. Click **"Approve"** button
  3. Entry is marked as approved and can be included in payroll processing

**Editing Time Entries**:

- Time entries can be edited if:
  - They are not yet approved, OR
  - The pay period they belong to is not locked
- Once a pay period is locked, time entries cannot be edited (prevents payroll errors)

**Filtering Time Entries**:

- Filter by **Employee**
- Filter by **Date Range** (From/To dates)
- Filter by **Type** (Regular, Overtime, PTO, Sick, Holiday)
- Filter by **Approval Status** (All, Approved, Pending)

#### 17.3. Managing Pay Periods

**Access**: Click **"Payroll"** → **"Pay Periods"** in the navigation menu.

**Creating a Pay Period**:

1. Click **"New Pay Period"** button
2. Fill in:
   - **Name** (required): e.g., "Pay Period 2025-01-01 to 2025-01-15"
   - **Start Date** (required)
   - **End Date** (required, must be after start date)
   - **Notes** (optional)
3. Click **"Create Pay Period"**

**Pay Period Statuses**:

- **Open**: Pay period is active, time entries can be added/edited
- **Locked**: Pay period is locked, time entries cannot be edited (prevents changes before processing)
- **Processed**: Payroll has been calculated and payroll records created

**Viewing Pay Period Details**:

- Click on any pay period name to view details
- The detail page shows:
  - Summary cards: Total employees, Regular hours, Overtime hours, Total gross pay
  - Employee time summary (if not processed)
  - Payroll records (if processed)

**Locking a Pay Period**:

1. Go to pay period detail page
2. Click **"Lock Period"** button
3. Confirm the action
4. This prevents further edits to time entries in this period

**Note**: Once locked, time entries in this period cannot be edited until the period is unlocked (requires manual database change or admin override).

#### 17.4. Processing Payroll

**Processing a Pay Period**:

1. Ensure the pay period is **Locked** (see above)
2. Go to pay period detail page
3. Click **"Process Payroll"** button
4. Confirm the action
5. The system will:
   - Fetch all approved time entries within the pay period date range
   - Group entries by employee
   - Calculate totals:
     - Total Regular Hours
     - Total Overtime Hours
     - Total PTO Hours
   - Calculate gross pay for each employee:
     - **Hourly Employees**: (Regular Hours × Hourly Rate) + (Overtime Hours × Hourly Rate × Overtime Multiplier) + (PTO Hours × Hourly Rate)
     - **Salaried Employees**: (Annual Salary / 365) × Days in Pay Period
   - Create or update PayrollRecord for each employee
   - Mark pay period as **"Processed"**

**Payroll Calculation Details**:

- **Overtime Multiplier**: Default is 1.5 (time and a half), can be customized per employee
- **Daily Overtime**: Hours over 8 in a day are counted as overtime
- **Weekly Overtime**: Currently tracked but not auto-calculated in UI (can be manually adjusted)
- **PTO/Sick Time**: Paid at regular rate for hourly employees, included in salary for salaried employees

**Viewing Payroll Records**:

- Access via **"Payroll"** → **"Payroll Records"** in navigation
- Shows all processed payroll records
- Filter by:
  - **Employee**
  - **Pay Period**
  - **Payment Status** (Unpaid, Scheduled, Paid)

**Marking Payroll as Paid**:

1. Go to payroll record detail page
2. Fill in payment information:
   - **Payment Status**: Unpaid, Scheduled, or Paid
   - **Payment Date**
   - **Payment Method**: Check, Direct Deposit, Cash, or Other
   - **Transaction Reference**: Check number, transaction ID, etc.
   - **Notes** (optional)
3. Click **"Update Payment Information"**

#### 17.5. Exporting Payroll Data

**Exporting to CSV**:

1. Go to a processed pay period detail page
2. Click **"Export CSV"** button
3. CSV file will download with columns:
   - Employee Name
   - Email
   - Pay Period
   - Regular Hours
   - Overtime Hours
   - PTO Hours
   - Gross Pay
   - Payment Status
   - Payment Date
   - Payment Method

**CSV Export Use Cases**:

- Import into accounting software (QuickBooks, Xero, etc.)
- Generate payroll reports
- Archive payroll data
- Share with accountants

**Data Models**:

- **Employee**: Stores employee information, pay rates, status
- **TimeEntry**: Records hours worked, breaks, overtime, type (regular/PTO/sick/holiday)
- **PayPeriod**: Defines payroll windows (start/end dates, status)
- **PayrollRecord**: Calculated payroll for each employee per pay period, includes payment tracking

**Permissions**:

- All authenticated users can view employees, time entries, and pay periods
- All authenticated users can create time entries
- **Admins** can approve time entries
- **Admins** can lock/process pay periods
- **Admins** can mark payroll as paid

**Best Practices**:

1. **Record Time Daily**: Enter time entries daily or weekly to avoid backlog
2. **Approve Promptly**: Approve time entries before processing payroll
3. **Lock Before Processing**: Always lock pay periods before processing to prevent data changes
4. **Review Before Processing**: Check time entry summaries on pay period detail page before processing
5. **Export After Processing**: Export CSV files for accounting after each pay period is processed
6. **Mark Paid After Payment**: Update payment status immediately after issuing payments

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
│   ├── users/       # User management views
│   ├── employees/   # Employee management views
│   ├── time-entries/ # Time entry views
│   ├── pay-periods/ # Pay period views
│   └── payroll/     # Payroll record views
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
- **Employee**: Employee information, pay rates, status, hire/termination dates
- **TimeEntry**: Records of hours worked, breaks, overtime, type (regular/PTO/sick/holiday)
- **PayPeriod**: Payroll windows with start/end dates and status (open/locked/processed)
- **PayrollRecord**: Calculated payroll for employees per pay period, payment tracking

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
- **Calendar shows only jobs (not sales)** - sales are excluded from calendar view
- **Customer page separates sales and jobs** - sales appear in a separate section from jobs
- **Extended prices** are calculated and displayed in real-time on invoice forms (quantity × unit price)
- **Product/service search** with type filtering (Products vs Services) available in all forms
- **Calendar events are clickable** - clicking any event shows read-only job details in a modal

## 📄 License

ISC

## 👤 Author

APS Development Team

---

**Need Help?** Check the troubleshooting section or review the code comments for detailed implementation notes.
