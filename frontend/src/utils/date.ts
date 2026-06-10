// Format an ISO date string as YYYY-MM-DD (year-month-day, ISO 8601).
// The 'sv-SE' locale always renders dates as YYYY-MM-DD regardless of OS settings.
// To use the computer's local format instead, change this to: new Date(iso).toLocaleDateString();
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE');
}

// Format an ISO date string as YYYY-MM-DD HH:MM:SS (date + 24-hour time with seconds).
// 'sv-SE' renders ISO-style date and 24-hour time regardless of OS settings.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
