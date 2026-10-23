import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  startDate: { type: Date, required: true },
  contact: { type: String, required: true },
  phone: { type: String, required: true },
  isForeigner: { type: Boolean, default: false },
  nationalId: { type: String, default: '' },
  passport: { type: String, default: '' },
  nssf: { type: String, default: '' },
  role: { type: String, default: 'Software Engineer' },
  photo: {
    url: String,
    public_id: String
  },
  cv: {
    url: String,
    public_id: String
  },
  nationalIdFile: {
    url: String,
    public_id: String
  },
  passportFile: {
    url: String,
    public_id: String
  },
  nssfFile: {
    url: String,
    public_id: String
  },
  contract: {
    url: String,
    public_id: String
  },
  workDays: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  shiftStart: { type: String, default: '09:00' },
  shiftEnd: { type: String, default: '18:00' },
  requiredHours: { type: Number, default: 8 },
  isRegistered: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);