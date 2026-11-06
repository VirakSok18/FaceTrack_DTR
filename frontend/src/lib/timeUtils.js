/**
 * FaceTrack DTR Time Utilities for Cambodia / Khmer Standard Time (Asia/Phnom_Penh, UTC+7)
 */

/**
 * Normalizes an attendance ISO timestamp.
 * If a legacy client saved local time as UTC (i.e. clock_in is ~7 hours ahead of created_at),
 * it corrects the 7-hour forward shift back to true UTC.
 */
export function normalizeAttendanceTimestamp(timestamp, createdAt) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return null;

  if (createdAt) {
    const c = new Date(createdAt);
    if (!isNaN(c.getTime())) {
      const diffMs = d.getTime() - c.getTime();
      // If timestamp is ahead of server created_at by ~7 hours (+- 15 mins), subtract 7h
      if (Math.abs(diffMs - 7 * 3600 * 1000) < 15 * 60 * 1000) {
        return new Date(d.getTime() - 7 * 3600 * 1000);
      }
    }
  }
  return d;
}

/**
 * Format timestamp to Khmer / Cambodia local time (Asia/Phnom_Penh, UTC+7)
 * Example: "11:19 AM"
 */
export function formatKhmerTime(timestamp, createdAt) {
  if (!timestamp) return '--:--';
  const d = normalizeAttendanceTimestamp(timestamp, createdAt);
  if (!d) return '--:--';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Phnom_Penh',
  });
}

/**
 * Format date string to Khmer / Cambodia local date
 * Example: "Fri, Nov 6"
 */
export function formatKhmerDate(dateStr, clockInStr, createdAt) {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const raw = clockInStr || dateStr;
  if (!raw) return 'Today';
  const d = normalizeAttendanceTimestamp(raw, createdAt);
  if (!d) return 'Today';

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Phnom_Penh',
  });
}
