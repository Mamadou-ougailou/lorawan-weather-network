/**
 * utils/AppError.js
 *
 * Custom error class for throwing operational errors in controllers.
 * The global errorHandler will catch these and use their statusCode.
 */

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
