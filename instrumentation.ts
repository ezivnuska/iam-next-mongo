// instrumentation.ts
// Suppress stale server action errors from cached client bundles

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress "Failed to find Server Action" errors from stale cached bundles
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Check if any argument contains the error message
      const hasServerActionError = args.some(arg => {
        if (arg instanceof Error) {
          return arg.message?.includes('Failed to find Server Action');
        }
        if (typeof arg === 'string') {
          return arg.includes('Failed to find Server Action');
        }
        if (arg && typeof arg === 'object' && 'message' in arg) {
          return String(arg.message).includes('Failed to find Server Action');
        }
        return false;
      });

      // Filter out stale server action errors
      if (hasServerActionError) {
        // Silently ignore - these are from old cached client bundles
        return;
      }

      // Log all other errors normally
      originalConsoleError.apply(console, args);
    };
  }
}
