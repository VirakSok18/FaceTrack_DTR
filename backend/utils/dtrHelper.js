// Helper to calculate lateness, worked hours, and status
// As per prompt: Compute daily worked hours as (clock-out - clock-in - break)
// Auto-deduct break period (e.g. 1 hour) for shifts > 5 hours

export const calculateDTR = (clockIn, clockOut, employeeRules) => {
    const { shiftStart, shiftEnd, requiredHours } = employeeRules;
    const breakMinutes = 60; // Configurable fixed break period

    const [startH, startM] = (shiftStart || '08:30').split(':').map(Number);

    // Create Date objects for shift start on the same day as clock-in
    const scheduleStart = new Date(clockIn);
    scheduleStart.setHours(startH, startM, 0, 0);

    // 1. Calculate Lateness
    let lateMinutes = 0;
    // 5 minute grace period usually, but prompt says "compare actual clock-in to scheduled"
    if (clockIn > scheduleStart) {
        lateMinutes = Math.floor((clockIn - scheduleStart) / 60000);
    }

    // 2. Calculate Worked Hours (if clock-out exists)
    let workedHours = 0;
    let status = lateMinutes > 0 ? 'Late' : 'Present';

    if (clockOut) {
        const [endH, endM] = (shiftEnd || '17:30').split(':').map(Number);
        const scheduleEnd = new Date(clockIn);
        scheduleEnd.setHours(endH, endM, 0, 0);

        // Exclude overtime: effectively cap clockOut at scheduleEnd
        const effectiveOut = clockOut > scheduleEnd ? scheduleEnd : clockOut;

        // Ensure effectiveOut is not before clockIn
        const durationMs = Math.max(0, effectiveOut - clockIn);
        const rawHours = durationMs / 3600000;

        // Auto-deduct 1 hour break if they worked more than 5 hours (including potential overtime hours they stayed, which we capped)
        // But since we capped at scheduleEnd, it's just standard shift duration
        const breakHours = breakMinutes / 60;
        workedHours = rawHours > 5 ? rawHours - breakHours : rawHours;
        workedHours = parseFloat(Math.max(0, workedHours).toFixed(2));

        // 3. Determine Final Status (Half-Day if worked < 4 hours as per common rules)
        if (workedHours > 0 && workedHours < 4) {
            status = 'Half-Day';
        }
    }

    return { lateMinutes, workedHours, status };
};
