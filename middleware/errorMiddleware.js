const errorHandler = (err, req, res, next) => {
  // 1. If headers are already sent, let the default Express handler take over
  if (res.headersSent) {
    return next(err);
  }

  // 2. Determine status code (default to 500)
  const statusCode = err.statusCode || 500;

  // 3. Log error for the developer in the console/Render logs
  console.error(`💥 Error: ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // 4. Send clean JSON response
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only show stack trace if NOT in production
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;