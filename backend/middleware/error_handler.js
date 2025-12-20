const errorHandler = (err, req, res, next) => {
  // If status code is 200 (success), change it to 500 (server error)
  // Otherwise, preserve the existing error status (e.g., 401, 404)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode);
  
  res.json({
    message: err.message,
    // Only show stack trace in development for easier debugging
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export default errorHandler;