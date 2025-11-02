// app/lib/api/poker-helpers.ts

/**
 * Resolve game ID from request or fall back to default
 * @param gameId - Optional game ID from request
 * @returns Resolved game ID
 * @throws Error if no game ID provided and DEFAULT_GAME_ID not set
 */
export function resolveGameId(gameId?: string): string {
  if (!gameId && !process.env.DEFAULT_GAME_ID) {
    throw new Error('No gameId provided and DEFAULT_GAME_ID environment variable not set');
  }
  return gameId || process.env.DEFAULT_GAME_ID!;
}

/**
 * Create a standardized error response
 * @param error - Error object or message
 * @param status - HTTP status code (default: 500)
 * @returns Response object with error details
 */
export function createErrorResponse(error: unknown, status: number = 500): Response {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return Response.json({ error: message }, { status });
}

/**
 * Create a standardized success response
 * @param data - Data to return in response
 * @param status - HTTP status code (default: 200)
 * @returns Response object with success data
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return Response.json({ success: true, ...data }, { status });
}
