import type { Medication } from './care-store';

/** A recorded miss, or a past scheduled dose, within the last 24 hours. */
export function isRecentlyMissed(medication: Medication, now = new Date()): boolean {
  if ((medication.status ?? 'Missed') !== 'Missed') return false;
  const isRecent = (timestamp: number) => Number.isFinite(timestamp) && timestamp <= now.getTime() && now.getTime() - timestamp <= 24 * 60 * 60 * 1000;
  if (medication.missedAt) return isRecent(Date.parse(medication.missedAt));
  for (const offset of [0, 1]) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!medication.startDate || dateKey < medication.startDate || (medication.endDate && dateKey > medication.endDate)) continue;
    for (const time of medication.times) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
      const [hour, minute] = time.split(':').map(Number);
      const dose = new Date(date); dose.setHours(hour, minute, 0, 0);
      if (isRecent(dose.getTime())) return true;
    }
  }
  return false;
}
