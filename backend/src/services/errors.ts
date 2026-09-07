// Thrown by services, translated to HTTP responses in app.ts
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
