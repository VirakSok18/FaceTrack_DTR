import React, { useState } from 'react';
import { Upload, X, Save, Camera, FileText, CheckCircle2, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import TimePicker from './TimePicker';
import { API_URL } from '../lib/api';

function AddEmployeeForm({ onEmployeeAdded, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Software Engineer',
    dateOfBirth: '',
    startDate: '',
    contact: '',
    phone: '',
    isForeigner: false,
    nationalId: '',
    passport: '',
    nssf: '',
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    shiftStart: '09:00',
    shiftEnd: '18:00',
    requiredHours: 8
  });
  const [photo, setPhoto] = useState(null);
  const [cv, setCv] = useState(null);
  const [nationalIdFile, setNationalIdFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [nssfFile, setNssfFile] = useState(null);
  const [contract, setContract] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to calculate age dynamically
  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    if (diff_ms < 0) return '';
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };
  const currentAge = calculateAge(formData.dateOfBirth);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleDay = (day) => {
    const newDays = formData.workDays.includes(day)
      ? formData.workDays.filter(d => d !== day)
      : [...formData.workDays, day];
    setFormData({ ...formData, workDays: newDays });
  };

  const handleSubmit = async () => {
    if (!formData.name || !photo || !formData.dateOfBirth || !formData.startDate || !formData.contact || !formData.phone) {
      alert('Please fill in all core required fields (Name, Photo, Date of Birth, Start Date, Email, Phone)');
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'workDays') {
        data.append(key, JSON.stringify(formData[key]));
      } else {
        data.append(key, formData[key]);
      }
    });

    // Append files
    if (photo) data.append('photo', photo);
    if (cv) data.append('cv', cv);
    if (nationalIdFile) data.append('nationalIdFile', nationalIdFile);
    if (passportFile) data.append('passportFile', passportFile);
    if (nssfFile) data.append('nssfFile', nssfFile);
    if (contract) data.append('contract', contract);

    try {
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        body: data
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      onEmployeeAdded();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-700 hover:text-black transition-all font-bold group bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to List
        </button>
      </div>

      <div className="glass-card rounded-[2.5rem] p-10 border-none relative overflow-hidden bg-white/40">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Add Employees</h2>
          <p className="text-slate-500 font-medium mt-1">Register a new team member to the portal.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Profile Intake */}
          <div className="lg:col-span-4 space-y-8">
            <div className="relative group mx-auto w-56 h-56">
              <div className={`w-full h-full rounded-[2.5rem] overflow-hidden border-4 transition-all duration-300 flex items-center justify-center ${photoPreview ? 'border-slate-800 shadow-2xl shadow-slate-200' : 'border-dashed border-slate-300 bg-white'
                }`}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-10 h-10 text-slate-300 mx-auto" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Upload Photo <span className="text-rose-500">*</span></span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Data Intake */}
          <div className="lg:col-span-8 space-y-10">
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Legal Name <span className="text-rose-500">*</span></label>
                <input
                  required
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full operational name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                <select
                  className="input-field"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="System Administrator">System Administrator</option>
                  <option value="HR Manager">HR Manager</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Support Specialist">Support Specialist</option>
                </select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Date of Birth <span className="text-rose-500">*</span></label>
                  {currentAge && (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {currentAge} yrs
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  className="input-field"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Hub <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="corporate@domain.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Primary Mobile <span className="text-rose-500">*</span></label>
                <input
                  className="input-field"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (000) 000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Timeline <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <section className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-900" /> Basic Schedule
        </h4>
        <div className="space-y-6">
          <div>
            <div className="text-xs text-slate-600 font-bold mb-3 uppercase tracking-tighter">Working Days</div>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-tight ${formData.workDays.includes(day)
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <TimePicker
              label="Shift Start"
              value={formData.shiftStart}
              onChange={(time) => setFormData({ ...formData, shiftStart: time })}
            />
            <TimePicker
              label="Shift End"
              value={formData.shiftEnd}
              onChange={(time) => setFormData({ ...formData, shiftEnd: time })}
            />
          </div>
        </div>
      </section>

      <section className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-900" /> Documents & Attachments
        </h4>

        <div className="space-y-1.5 min-w-0 mb-6 max-w-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nationality Profile</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isForeigner: false, passport: '' })}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${!formData.isForeigner
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              Local (Cambodia)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isForeigner: true, nationalId: '' })}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${formData.isForeigner
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              Foreigner
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CV Upload */}
          <div className="relative group">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCv(e.target.files[0])}
              className="hidden"
              id="cv-upload"
            />
            <label
              htmlFor="cv-upload"
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${cv ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
            >
              <div className={`p-2.5 rounded-lg ${cv ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{cv ? cv.name : 'CV (Resume)'}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter truncate">{cv ? `${(cv.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOC'}</div>
              </div>
              {cv && <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0" />}
            </label>
          </div>

          {/* Contract Upload */}
          <div className="relative group">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setContract(e.target.files[0])}
              className="hidden"
              id="contract-upload"
            />
            <label
              htmlFor="contract-upload"
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${contract ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
            >
              <div className={`p-2.5 rounded-lg ${contract ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{contract ? contract.name : 'Employment Contract'}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter truncate">{contract ? `${(contract.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOC'}</div>
              </div>
              {contract && <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0" />}
            </label>
          </div>

          {/* National ID Upload (Local Only) */}
          {!formData.isForeigner && (
            <div className="relative group">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setNationalIdFile(e.target.files[0])}
                className="hidden"
                id="national-id-upload"
              />
              <label
                htmlFor="national-id-upload"
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${nationalIdFile ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
              >
                <div className={`p-2.5 rounded-lg ${nationalIdFile ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{nationalIdFile ? nationalIdFile.name : 'National ID Scan'}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter truncate">{nationalIdFile ? `${(nationalIdFile.size / 1024 / 1024).toFixed(2)} MB` : 'Image, PDF'}</div>
                </div>
                {nationalIdFile && <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0" />}
              </label>
            </div>
          )}

          {/* Passport Upload (Foreigner Only) */}
          {formData.isForeigner && (
            <div className="relative group">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPassportFile(e.target.files[0])}
                className="hidden"
                id="passport-upload"
              />
              <label
                htmlFor="passport-upload"
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${passportFile ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
              >
                <div className={`p-2.5 rounded-lg ${passportFile ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{passportFile ? passportFile.name : 'Passport Scan'}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter truncate">{passportFile ? `${(passportFile.size / 1024 / 1024).toFixed(2)} MB` : 'Image, PDF'}</div>
                </div>
                {passportFile && <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0" />}
              </label>
            </div>
          )}


          {/* NSSF Upload */}
          <div className="relative group md:col-span-2">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setNssfFile(e.target.files[0])}
              className="hidden"
              id="nssf-upload"
            />
            <label
              htmlFor="nssf-upload"
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${nssfFile ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
            >
              <div className={`p-2.5 rounded-lg ${nssfFile ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{nssfFile ? nssfFile.name : 'NSSF Card Scan'}</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-tighter truncate">{nssfFile ? `${(nssfFile.size / 1024 / 1024).toFixed(2)} MB` : 'Image, PDF'}</div>
              </div>
              {nssfFile && <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0" />}
            </label>
          </div>

        </div>
      </section>

      <div className="flex items-center justify-end gap-4 pt-6">
        <button
          onClick={onCancel}
          className="btn btn-secondary border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold"
        >
          Back to List
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn btn-primary px-10 bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Add Employees'
          )}
        </button>
      </div>
    </div>
  );
}

export default AddEmployeeForm;