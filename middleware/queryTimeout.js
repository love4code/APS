// Middleware to ensure requests don't hang indefinitely
module.exports = (req, res, next) => {
  // Set a timeout for the entire request (25 seconds)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Request timeout for:', req.method, req.path)
      res.status(504).json({ error: 'Request timeout' })
    }
  }, 25000) // 25 second timeout

  // Clear timeout when response is sent
  const originalEnd = res.end
  res.end = function (...args) {
    clearTimeout(timeout)
    originalEnd.apply(this, args)
  }

  next()
}
