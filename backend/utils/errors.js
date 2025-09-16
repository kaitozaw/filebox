class AppError extends Error {
    constructor(message, code, name) {
        super(message);
        this.code = code;
        this.name = name;
    }
}
class ValidationError extends AppError {
    constructor(message = 'Validation failed') { super(message, 400, 'ValidationError'); }
}
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') { super(message, 401, 'UnauthorizedError'); }
}
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') { super(message, 403, 'ForbiddenError'); }
}
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') { super(message, 404, 'NotFoundError'); }
}
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') { super(message, 429, 'TooManyRequestsError'); }
}

module.exports = { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, TooManyRequestsError };