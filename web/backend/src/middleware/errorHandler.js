/**
 * middleware/errorHandler.js
 *
 * Two Express middlewares that must be registered LAST in server.js:
 *
 *   notFound      – catches any request that didn't match a route (404)
 *   errorHandler  – catches any error thrown inside a route handler (500)
 *
 * Both respond with a consistent JSON shape:
 *   { "error": "..." }
 *
 * This ensures the frontend always receives JSON, never an HTML error page.
 *
 * Express 5 note:
 *   Async route errors are forwarded to the error handler automatically.
 *   No need for try/catch inside routes (can be added for custom messages).
 */

/**
 * 404 handler – registered AFTER all routes.
 * Called when no route matched the incoming request.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
export function notFound(req, res) {
    res
        .status(404)
        .json({ error: `Route not found: ${req.method} ${req.path}` });
}

/**
 * Global error handler – registered AFTER all routes and the 404 handler.
 * Express identifies this as an error handler because it has four parameters.
 *
 * @param {Error}                       err
 * @param {import("express").Request}   req
 * @param {import("express").Response}  res
 * @param {import("express").NextFunction} next  – required by Express, even if unused
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    // Log the full error on the server for debugging
    console.error(`[ERROR] ${req.method} ${req.path}`, err);

    const status = err.status ?? err.statusCode ?? 500;
    const message = status < 500
        ? err.message           // client errors: safe to expose
        : "Internal server error"; // server errors: hide internals from clients

    res.status(status).json({ error: message });
}
