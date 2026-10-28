import React, { useState } from 'react';
import { Upload, X, Save, Camera, FileText, CheckCircle2, Clock, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import TimePicker from './TimePicker';
import { API_URL } from '../lib/api';
import { supabase, addEmployeeToRoom, uploadEmployeeFile } from '../lib/supabase';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function AddEmployeeForm({ selectedOffice, onEmployeeAdded, onCancel }) {
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
  const [formError, setFormError] = useState(null);

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);

    // Sanitize and validate inputs
    const cleanName = (formData.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
    const cleanContact = (formData.contact || '').trim().toLowerCase().slice(0, 254);
    const cleanPhone = (formData.phone || '').replace(/[^\d+ ()-]/g, '').trim().slice(0, 25);

    if (!cleanName) {
      setFormError('Please enter a valid staff name.');
      return;
    }
    if (!photo) {
      setFormError('Please provide a staff facial photo for biometric verification.');
      return;
    }
    if (!formData.dateOfBirth || !formData.startDate) {
      setFormError('Please fill in Date of Birth and Start Date.');
      return;
    }
    if (!cleanContact || !EMAIL_REGEX.test(cleanContact)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 5) {
      setFormError('Please enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Generate Employee ID
      const employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Upload photo and files to Supabase Storage (or fallback data URLs)
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadEmployeeFile(photo, 'avatars');
      }

      let cvUrl = null;
      if (cv) {
        cvUrl = await uploadEmployeeFile(cv, 'documents');
      }

      let nationalIdUrl = null;
      if (nationalIdFile) {
        nationalIdUrl = await uploadEmployeeFile(nationalIdFile, 'documents');
      }

      let passportUrl = null;
      if (passportFile) {
        passportUrl = await uploadEmployeeFile(passportFile, 'documents');
      }

      let nssfUrl = null;
      if (nssfFile) {
        nssfUrl = await uploadEmployeeFile(nssfFile, 'documents');
      }

      let contractUrl = null;
      if (contract) {
        contractUrl = await uploadEmployeeFile(contract, 'documents');
      }

      // 3. Direct Supabase Database Insert if selectedOffice is provided
      if (selectedOffice?.id) {
        await addEmployeeToRoom(selectedOffice.id, {
          employeeId,
          name: cleanName,
          role: formData.role,
          phone: cleanPhone,
          contact: cleanContact,
          dateOfBirth: formData.dateOfBirth,
          startDate: formData.startDate,
          isForeigner: formData.isForeigner,
          nationalId: formData.nationalId,
          passport: formData.passport,
          nssf: formData.nssf,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          workDays: formData.workDays,
          requiredHours: formData.requiredHours || 8,
          photoUrl: photoUrl,
          cvUrl: cvUrl,
          nationalIdFileUrl: nationalIdUrl,
          passportFileUrl: passportUrl,
          nssfFileUrl: nssfUrl,
          contractUrl: contractUrl,
        });
      }

      // 4. Fallback to Local Node Backend if running
      try {
        const data = new FormData();
        Object.keys(formData).forEach(key => {
          if (key === 'workDays') {
            data.append(key, JSON.stringify(formData[key]));
          } else if (key === 'name') {
            data.append(key, cleanName);
          } else if (key === 'contact') {
            data.append(key, cleanContact);
          } else if (key === 'phone') {
            data.append(key, cleanPhone);
          } else {
            data.append(key, formData[key]);
          }
        });
        data.append('employeeId', employeeId);
        if (photo) data.append('photo', photo);
        if (cv) data.append('cv', cv);
        if (nationalIdFile) data.append('nationalIdFile', nationalIdFile);
        if (passportFile) data.append('passportFile', passportFile);
        if (nssfFile) data.append('nssfFile', nssfFile);
        if (contract) data.append('contract', contract);

        await fetch(`${API_URL}/employees`, {
          method: 'POST',
          body: data
        });
      } catch (_) {
        // Node backend is optional in cloud mode
      }

      onEmployeeAdded();
    } catch (error) {
      console.error('Error adding employee:', error);
      setFormError(error.message || 'Failed to enroll employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-neutral-700 hover:text-black transition-all font-bold group bg-white px-5 py-2.5 rounded-full border border-neutral-200/90 shadow-sm hover:shadow-md text-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        {selectedOffice && (
          <div className="text-xs font-mono font-bold bg-neutral-100 text-black border border-neutral-200 px-3 py-1.5 rounded-full">
            Office: {selectedOffice.name} ({selectedOffice.code})
          </div>
        )}
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-3xl text-red-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-neutral-200/90 shadow-xl shadow-neutral-100">
        <div className="mb-8 pb-6 border-b border-neutral-100">
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">Add Team Member</h2>
          <p className="text-neutral-500 text-xs font-medium mt-1">Register a new employee for facial biometric attendance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Profile Photo Intake */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative group w-52 h-52">
              <div className={`w-full h-full rounded-3xl overflow-hidden border-2 transition-all duration-300 flex items-center justify-center ${
                photoPreview ? 'border-black shadow-xl shadow-neutral-200' : 'border-dashed border-neutral-300 bg-neutral-50'
              }`}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-10 h-10 text-neutral-400 mx-auto" />
                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider block">
                      Facial Photo <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 block">Click to upload JPG / PNG</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-neutral-400 font-medium text-center mt-3 max-w-[200px]">
              Front-facing photo required for AI biometric kiosk recognition
            </p>
          </div>

          {/* Core Data Inputs */}
          <div className="lg:col-span-8 space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  maxLength={60}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sok Sovan"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                  Designation / Role
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
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
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  {currentAge && (
                    <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {currentAge} yrs
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="employee@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                  Mobile Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  maxLength={25}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+855 12 345 678"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Schedule Configuration */}
      <section className="p-8 bg-white rounded-3xl border border-neutral-200/90 shadow-xl shadow-neutral-100 space-y-6">
        <h4 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-black" /> Work Schedule & Shift Hours
        </h4>
        <div className="space-y-6">
          <div>
            <div className="text-xs text-neutral-600 font-bold mb-3 uppercase tracking-wider">Working Days</div>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    formData.workDays.includes(day)
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 border border-neutral-200'
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

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-full text-xs font-bold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-md hover:shadow-xl flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enrolling Staff Member...</span>
            </>
          ) : (
            <>
              <span>Enroll Employee</span>
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default AddEmployeeForm;
