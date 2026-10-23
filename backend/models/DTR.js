import mongoose from 'mongoose';

const dtrSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  clockIn: { type: Date, required: true },
  clockOut: Date,
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Late', 'Half-Day', 'Absent'], default: 'Present' },
  lateMinutes: { type: Number, default: 0 },
  workedHours: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('DTR', dtrSchema);