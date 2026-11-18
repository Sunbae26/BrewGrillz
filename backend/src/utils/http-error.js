export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export const notFound = (message = "Not found") => new HttpError(404, message);
export const badRequest = (message, details) =>
  new HttpError(400, message, details);
export const unauthorized = (message, code) =>
  new HttpError(401, message, undefined, code);
