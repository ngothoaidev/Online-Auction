// Operational error with an HTTP status and a stable machine code; the error handler renders it.
export class AppError extends Error {
  declare status: number;
  declare code: string;
  declare details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}
