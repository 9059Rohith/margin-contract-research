export class AppError extends Error {
  constructor(public code: string, public status: number, public userMessage: string) { super(userMessage); }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) return Response.json({ error: { code: error.code, message: error.userMessage } }, { status: error.status });
  console.error('Request failed', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } }, { status: 500 });
}
