const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `${req.method} ${req.originalUrl} not found`));
}

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Unexpected server error';
  let errors = error.errors || [];

  if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path || 'resource'}: ${error.value}`;
    errors = [{ field: error.path || 'id', message }];
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(error.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}`;
    errors = [{ field, message }];
  }

  if (statusCode === 500) {
    console.error(error);
  }

  const response = {
    success: false,
    message,
  };
  if (errors.length) response.errors = errors;
  if (process.env.NODE_ENV === 'development') response.stack = error.stack;
  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };
