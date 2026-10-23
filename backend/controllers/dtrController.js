import DTR from '../models/DTR.js';
import Employee from '../models/Employee.js';
import { calculateDTR } from '../utils/dtrHelper.js';

export const getEmployeeDTR = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Auto-close any old open sessions before returning data
    const oldSessions = await DTR.find({
      employeeId,
      clockOut: null,
      date: { $lt: today }
    });

    if (oldSessions.length > 0) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        for (const session of oldSessions) {
          const shiftEndDate = new Date(`${session.date}T${employee.shiftEnd || '17:30'}:00`);
          const { workedHours, status } = calculateDTR(session.clockIn, shiftEndDate, employee);

          session.clockOut = shiftEndDate;
          session.workedHours = workedHours;
          session.status = status;
          await session.save();
        }
      }
    }

    const records = await DTR.find({ employeeId }).sort({ clockIn: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const clockIn = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Find ANY open session for this employee
    const openSession = await DTR.findOne({
      employeeId,
      clockOut: null
    });

    if (openSession) {
      if (openSession.date === today) {
        return res.status(400).json({ error: 'Already clocked in today' });
      } else {
        // AUTO-CLOCKOUT: Close the old session from a previous day
        // Use the employee's shiftEnd time for that day
        const shiftEndDate = new Date(`${openSession.date}T${employee.shiftEnd || '17:30'}:00`);
        const { workedHours, status } = calculateDTR(openSession.clockIn, shiftEndDate, {
          shiftStart: employee.shiftStart,
          shiftEnd: employee.shiftEnd,
          requiredHours: employee.requiredHours
        });

        openSession.clockOut = shiftEndDate;
        openSession.workedHours = workedHours;
        openSession.status = status;
        await openSession.save();

        console.log(`Auto-clocked out forgotten session for ${employeeId} on ${openSession.date}`);
      }
    }

    const { lateMinutes, status } = calculateDTR(now, null, {
      shiftStart: employee.shiftStart,
      shiftEnd: employee.shiftEnd,
      requiredHours: employee.requiredHours
    });

    const dtr = new DTR({
      employeeId,
      clockIn: now,
      date: today,
      lateMinutes,
      status
    });
    await dtr.save();

    res.json({ success: true, dtr, employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const dtr = await DTR.findOne({
      employeeId,
      date: today,
      clockOut: null
    });

    if (!dtr) {
      return res.status(400).json({ error: 'No active clock-in found for today' });
    }

    const employee = await Employee.findOne({ employeeId });
    const { workedHours, status } = calculateDTR(dtr.clockIn, now, {
      shiftStart: employee.shiftStart,
      shiftEnd: employee.shiftEnd,
      requiredHours: employee.requiredHours
    });

    dtr.clockOut = now;
    dtr.workedHours = workedHours;
    dtr.status = status;
    await dtr.save();

    res.json({ success: true, dtr, employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const stats = await DTR.aggregate([
      { $match: { employeeId } },
      {
        $group: {
          _id: null,
          totalLates: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          totalAbsents: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          totalHalfDays: { $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] } },
          totalWorkedHours: { $sum: "$workedHours" }
        }
      }
    ]);

    res.json(stats[0] || { totalLates: 0, totalAbsents: 0, totalHalfDays: 0, totalWorkedHours: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.params;
    const now = new Date();
    // If viewing a past date, auto-close any open sessions for that date
    if (date < today) {
      const openSessions = await DTR.find({ date, clockOut: null });
      if (openSessions.length > 0) {
        const employees = await Employee.find({
          employeeId: { $in: openSessions.map(s => s.employeeId) }
        });

        for (const session of openSessions) {
          const emp = employees.find(e => e.employeeId === session.employeeId);
          if (emp) {
            const shiftEndDate = new Date(`${date}T${emp.shiftEnd || '17:30'}:00`);
            const { workedHours, status } = calculateDTR(session.clockIn, shiftEndDate, emp);
            session.clockOut = shiftEndDate;
            session.workedHours = workedHours;
            session.status = status;
            await session.save();
          }
        }
      }
    }

    const records = await DTR.find({ date });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const processDailyAttendance = async (req, res) => {
  try {
    const { date } = req.body; // e.g. '2024-03-24'
    const employees = await Employee.find();

    // 1. Auto Clock-Out open sessions at shift end
    const openSessions = await DTR.find({ date, clockOut: null });

    for (const session of openSessions) {
      const emp = employees.find(e => e.employeeId === session.employeeId);
      if (emp) {
        const shiftEndDate = new Date(`${date}T${emp.shiftEnd || '18:00'}:00`);
        const { workedHours, status } = calculateDTR(session.clockIn, shiftEndDate, emp);
        session.clockOut = shiftEndDate;
        session.workedHours = workedHours;
        session.status = status;
        await session.save();
      }
    }

    // 2. Mark Absentees for work days
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    for (const emp of employees) {
      if (emp.workDays.includes(dayName)) {
        const record = await DTR.findOne({ employeeId: emp.employeeId, date });
        if (!record) {
          const dtr = new DTR({
            employeeId: emp.employeeId,
            clockIn: new Date(`${date}T${emp.shiftStart}:00`),
            clockOut: new Date(`${date}T${emp.shiftStart}:00`),
            date,
            status: 'Absent',
            workedHours: 0
          });
          await dtr.save();
        }
      }
    }

    res.json({ success: true, message: `Processed attendance for ${date}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};