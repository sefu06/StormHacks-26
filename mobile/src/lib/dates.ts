export type DateParts = { month: string; day: string; year: string };
export const emptyDate: DateParts = { month: '', day: '', year: '' };
export const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function parseDate({ month, day, year }: DateParts): string | null {
  if (!month && !day && !year) return '';
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (!/^\d{4}$/.test(year) || date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
export function time24(time: string, period: string): string | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) return null;
  return `${String(Number(match[1]) % 12 + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${match[2]}`;
}
export function displayTime(time: string) { const [h, m] = time.split(':'); return `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? 'PM' : 'AM'}`; }
