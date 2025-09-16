class BaseController {
    ok(res, body) {
        return res.status(200).json(body);
    }

    created(res, body) {
        return res.status(201).json(body);
    }

    handleError(res, err) {
        const code =
            err?.code ??
            (err?.name === 'ValidationError' ? 400 :
            err?.name === 'UnauthorizedError'    ? 401 :
            err?.name === 'ForbiddenError'    ? 403 :
            err?.name === 'NotFoundError'   ? 404 :
            err?.name === 'TooManyRequestsError'   ? 429 : 500);

        const payload = { message: err?.message ?? 'Internal Server Error' };
        if (process.env.NODE_ENV !== 'production' && err?.stack) {
            payload.stack = err.stack;
        }
        return res.status(code).json(payload);
    }
}

module.exports = BaseController;