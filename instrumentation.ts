// instrumentation.ts
// Suppress stale server action errors from cached client bundles

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress "Failed to find Server Action" errors from stale cached bundles
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');

      // Filter out stale server action errors
      if (errorMessage.includes('Failed to find Server Action')) {
        // Silently ignore - these are from old cached client bundles
        return;
      }

      // Log all other errors normally
      originalConsoleError.apply(console, args);
    };
  }
}
