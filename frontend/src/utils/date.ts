// Format an ISO date string as YYYY-MM-DD (year-month-day, ISO 8601).
// The 'sv-SE' locale always renders dates as YYYY-MM-DD regardless of OS settings.
// To use the computer's local format instead, change this to: new Date(iso).toLocaleDateString();
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE');
}
