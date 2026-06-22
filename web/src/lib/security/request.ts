export class InvalidRequestOriginError extends Error {
  constructor() {
    super("Request origin is not allowed");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) throw new InvalidRequestOriginError();
}
