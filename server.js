require('dotenv').config()
const app = require('./app')

const PORT = process.env.PORT || 3000

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err)
  // Don't exit in production, let Heroku handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  // Always exit on uncaught exceptions
  process.exit(1)
})

// Start server
const server = app.listen(PORT, () => {
  console.log(`APS Server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })
})
