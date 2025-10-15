// app/lib/utils/error-handler.ts

export function handleError(error: any, defaultMessage: string): string {
    const message = error?.message || defaultMessage;
    console.error(message, error);
    return message;
}

export function showError(error: any, defaultMessage: string): void {
    const message = handleError(error, defaultMessage);
    alert(message);
}
