'use strict';

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error('[LoopLedger Error]', err);
  }

  const message =
    statusCode >= 500
      ? 'Something went wrong on the server. Please try again.'
      : err.message || 'The request could not be completed.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
      ? { error: err.message }
      : {})
  });
}

module.exports = errorHandler;