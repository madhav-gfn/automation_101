// Shared by every handler in functions/. Prefixed with "_" so Nhost's file-based
// function router ignores this whole directory instead of trying to deploy it as
// an endpoint (Nhost's convention: files/folders starting with "_" are not exposed).

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Wraps a (req, res) handler so thrown errors become a proper Hasura Action/event
// error response instead of an unhandled rejection. Works identically whether the
// handler runs under our local dev server (scripts/functions-dev-server.mjs) or as
// a real Nhost Function — both call the default export as (req, res) => Promise.
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const statusCode = err instanceof HttpError ? err.statusCode : 500;
      if (statusCode >= 500) console.error(err);
      res.status(statusCode).json({ message: err.message || "internal error" });
    }
  };
}
