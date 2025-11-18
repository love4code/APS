# APS - Aboveground Pool Sales CRM

A comprehensive Customer Relationship Management (CRM) system for tracking pool sales, installations, customers, products, and job management.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```env
     MONGODB_URI=mongodb://localhost:27017/aps_app
     SESSION_SECRET=your_secret_session_key_here
     PORT=3000
     ```

3. **Create the admin user:**

   ```bash
   npm run create-admin
   ```

   This creates an admin account with:

   - **Email**: `admin@aps.com`
   - **Password**: `admin123`

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

### Authentication & User Management

- **Login/Logout**: Secure session-based authentication
- **User Roles**: Admin and User roles with different permissions
- **User Flags**: Users can be marked as Sales Reps and/or Installers
- **Admin Controls**: Admins can create, edit, and deactivate users

### Customer Management

- Create, view, edit, and delete customers
- Store customer information: name, phone, email, address, notes
- View all jobs associated with each customer

### Products & Services

- Manage products and services with pricing
- Mark items as taxable or non-taxable
- Set base prices for items
- Automatic 6.25% tax calculation for taxable items

### Job Management

- Create jobs (sales + installations)
- Assign customers, sales reps, and installers
- Add multiple products/services to each job
- Track job status: scheduled, complete, delivered, undelivered, delayed
- Automatic calculation of subtotals, tax, and total price
- Payment tracking (paid/unpaid, payment date)
- Install date scheduling
- Notes and activity history

### Personal Views

- **My Sales**: View jobs where you are the sales rep or owner
- **My Installs**: View jobs assigned to you as an installer

### Dashboard

- Overview of installers with scheduled/completed stats
- Sales reps with total jobs and sales totals
- Recent jobs with status and payment information

## 🔐 User Roles & Permissions

### Admin

- Full access to all features
- Can manage users (create, edit, deactivate)
- Can view and manage all customers, products, and jobs
- Can access admin panel

### User

- Can view and manage customers, products, and jobs
- Can view their own sales (if marked as sales rep)
- Can view their assigned installs (if marked as installer)
- Cannot access user management

## 📖 How to Use

### Logging In

1. Navigate to `http://localhost:3000/login`
2. Enter your email and password
3. Click "Login"

### Dashboard

The dashboard provides an overview of:

- **Installers**: Cards showing each installer with scheduled and completed job counts
- **Sales Reps**: Cards showing total jobs and sales totals for each rep
- **Recent Jobs**: Cards showing job status, payment status, customer, and totals

### Managing Customers

1. **View All Customers**: Click "Customers" in the navigation
2. **Create New Customer**:
   - Click "New Customer" button
   - Fill in customer information (name is required)
   - Click "Save"
3. **View Customer Details**: Click on a customer name to see:
   - Contact information
   - All jobs associated with the customer
4. **Edit Customer**: Click "Edit" on the customer detail page
5. **Delete Customer**: Click "Delete" (only if customer has no jobs)

### Managing Products & Services

1. **View All Products**: Click "Products" in the navigation
2. **Create New Product/Service**:
   - Click "New Product/Service"
   - Enter name, description, base price
   - Select type (Product or Service)
   - Check "Taxable" if the item should have 6.25% tax applied
   - Click "Save"
3. **Edit Product**: Click "Edit" next to any product
4. **Delete Product**: Click "Delete" next to any product

### Managing Jobs

1. **View All Jobs**: Click "Jobs" in the navigation
2. **Create New Job**:

   - Click "New Job"
   - Select customer (required)
   - Optionally select sales rep or check "Sold by Owner"
   - Optionally select installer
   - Set install date and status
   - **Add Items**:
     - Click "Add Item"
     - Select product/service
     - Enter quantity and unit price (auto-filled from product)
     - Check "Taxable" if applicable
     - Repeat for additional items
   - Add notes if needed
   - Click "Save Job"
   - Totals are automatically calculated (subtotal, tax, total)

3. **View Job Details**: Click "View" on any job to see:

   - Customer information
   - Job details (status, dates, assigned personnel)
   - Items list with pricing
   - Calculated totals (subtotal, tax, total)
   - Payment status
   - Activity history

4. **Update Job Status**:

   - On job detail page, use the "Update Status" dropdown
   - Status changes are automatically logged

5. **Update Payment Status**:

   - On job detail page, check "Is Paid" checkbox
   - Optionally set "Date Paid"
   - Changes are automatically saved and logged

6. **Edit Job**: Click "Edit" to modify job details and items

### Personal Views

#### My Sales

- Access via "My Sales" in navigation (visible if you're a sales rep)
- Shows all jobs where:
  - You are the assigned sales rep, OR
  - The job was sold by owner and you created it

#### My Installs

- Access via "My Installs" in navigation (visible if you're an installer)
- Shows all jobs assigned to you as the installer
- Sorted by install date

### Admin: Managing Users

1. **Access User Management**: Click "Admin" → "Users" (admin only)
2. **Create New User**:
   - Click "New User"
   - Enter name, email, password
   - Select role (admin or user)
   - Check "Is Sales Rep" if applicable
   - Check "Is Installer" if applicable
   - Click "Save"
3. **Edit User**: Click "Edit" next to any user
4. **Deactivate User**: Click "Deactivate" to disable a user account

## 💰 Tax Calculation

- Taxable items are charged **6.25%** tax
- Tax is automatically calculated on job creation and updates
- Calculation: `taxTotal = sum(taxable_item_totals) * 0.0625`
- Total price = subtotal + tax total

## 🔧 Technical Details

### Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **View Engine**: EJS
- **Styling**: Bootstrap 5
- **Authentication**: Session-based with bcrypt password hashing

### Project Structure

```
APS/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── middleware/      # Auth and role middleware
├── models/          # Mongoose schemas
├── routes/          # Route definitions
├── views/           # EJS templates
│   ├── auth/        # Login views
│   ├── dashboard/   # Dashboard views
│   ├── customers/   # Customer views
│   ├── products/    # Product views
│   ├── jobs/        # Job views
│   └── users/       # User management views
├── public/          # Static files (CSS, JS)
├── scripts/         # Utility scripts (create-admin)
├── app.js           # Express app configuration
└── server.js        # Server entry point
```

### Key Models

- **User**: Authentication, roles, sales rep/installer flags
- **Customer**: Customer information and contact details
- **Product**: Products and services with pricing
- **Job**: Sales and installation jobs with items, totals, status
- **ActivityLog**: Job activity history

## 🐛 Troubleshooting

### Admin Login Not Working

1. Run `npm run create-admin` to reset the admin password
2. Ensure MongoDB is running
3. Check that the email is exactly `admin@aps.com` (case-sensitive)

### Database Connection Issues

- Verify MongoDB is running: `mongod` or check your MongoDB service
- Check `.env` file has correct `MONGODB_URI`
- Ensure MongoDB is accessible at the specified URI

### Port Already in Use

- Change `PORT` in `.env` file
- Or stop the process using port 3000

## 📝 Notes

- Passwords are hashed using bcrypt before storage
- Sessions are stored in MongoDB
- Job totals are automatically recalculated on every save
- Activity logs track job status and payment changes
- Customers cannot be deleted if they have associated jobs

## 🚀 Production Deployment

Before deploying to production:

1. Change `SESSION_SECRET` to a strong random string
2. Update `MONGODB_URI` to your production database
3. Set `NODE_ENV=production` in `.env`
4. Use a process manager like PM2
5. Set up proper MongoDB authentication
6. Use HTTPS for secure connections

## 📄 License

ISC

## 👤 Author

APS Development Team
