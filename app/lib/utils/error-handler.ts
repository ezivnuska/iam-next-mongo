// app/lib/utils/error-handler.ts

export function handleError(error: unknown, defaultMessage: string): string {
    const message = error instanceof Error ? error.message : defaultMessage;
    console.error(message, error);
    return message;
}

export function showError(error: unknown, defaultMessage: string): void {
    const message = handleError(error, defaultMessage);
    alert(message);
}
