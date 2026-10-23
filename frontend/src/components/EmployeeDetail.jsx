import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, getFileUrl } from '../lib/api';
import {
  ArrowLeft, Mail, Phone, Calendar, Clock, Edit2, Save, X, FileText, ExternalLink, LayoutDashboard, Camera, Upload, Loader2
} from 'lucide-react';
import TimePicker from './TimePicker';

function EmployeeDetail({ onBack, onUpdate }) {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({ totalLates: 0, totalAbsents: 0, totalHalfDays: 0, totalWorkedHours: 0 });
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState({});
  const [newPhoto, setNewPhoto] = useState(null);
  const [newCV, setNewCV] = useState(null);
  const [newNationalIdFile, setNewNationalIdFile] = useState(null);
  const [newPassportFile, setNewPassportFile] = useState(null);
  const [newNssfFile, setNewNssfFile] = useState(null);
  const [newContract, setNewContract] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Agge calculation
  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    if (diff_ms < 0) return '';
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/employees`);
        const allEmployees = await res.json();
        const found = allEmployees.find(e => e.employeeId === id);

        if (found) {
          setEmployee(found);
          setEditedData({
            name: found.name,
            role: found.role || 'Software Engineer',
            dateOfBirth: found.dateOfBirth ? new Date(found.dateOfBirth).toISOString().split('T')[0] : '',
            contact: found.contact,
            phone: found.phone,
            isForeigner: found.isForeigner || false,
            nationalId: found.nationalId || '',
            passport: found.passport || '',
            nssf: found.nssf || '',
            startDate: found.startDate ? new Date(found.startDate).toISOString().split('T')[0] : '',
            workDays: found.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            shiftStart: found.shiftStart || '09:00',
            shiftEnd: found.shiftEnd || '18:00',
            requiredHours: found.requiredHours || 8
          });

          // Fetch attendance and summary
          const [attRes, sumRes] = await Promise.all([
            fetch(`${API_URL}/dtr/${id}`),
            fetch(`${API_URL}/dtr/summary/${id}`)
          ]);
          setAttendance(await attRes.json());
          setSummary(await sumRes.json());
        }
      } catch (error) {
        console.error('Error fetching employee detail data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, [id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      Object.keys(editedData).forEach(key => {
        if (key === 'workDays') {
          formData.append(key, JSON.stringify(editedData[key]));
        } else {
          formData.append(key, editedData[key]);
        }
      });

      if (newPhoto) formData.append('photo', newPhoto);
      if (newCV) formData.append('cv', newCV);
      if (newNationalIdFile) formData.append('nationalIdFile', newNationalIdFile);
      if (newPassportFile) formData.append('passportFile', newPassportFile);
      if (newNssfFile) formData.append('nssfFile', newNssfFile);
      if (newContract) formData.append('contract', newContract);

      const response = await fetch(`${API_URL}/employees/${employee._id}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update employee');

      const updatedEmployee = await response.json();
      setEmployee(updatedEmployee);
      setNewPhoto(null);
      setNewCV(null);
      setNewNationalIdFile(null);
      setNewPassportFile(null);
      setNewNssfFile(null);
      setNewContract(null);
      setPhotoPreview(null);
      onUpdate();
      setIsEditing(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day) => {
    const newDays = editedData.workDays.includes(day)
      ? editedData.workDays.filter(d => d !== day)
      : [...editedData.workDays, day];
    setEditedData({ ...editedData, workDays: newDays });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700';
      case 'Late': return 'bg-amber-100 text-amber-700';
      case 'Absent': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Phasing employee data...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-xl">
        <h2 className="text-2xl font-bold text-slate-400">Employee record not found</h2>
        <button onClick={onBack} className="mt-4 btn btn-primary">Return to Directory</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-black transition-all font-bold group bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-[2.5rem] overflow-hidden p-8 text-center relative border border-slate-300">
            <div className="absolute top-0 left-0 w-full h-32 bg-slate-900"></div>

            <div className="relative pt-12 mb-6">
              <div className="w-40 h-40 rounded-3xl border-8 border-white/50 shadow-2xl mx-auto overflow-hidden bg-white rotate-3 group hover:rotate-0 transition-transform duration-500 relative">
                <img
                  src={photoPreview || getFileUrl(employee.photo) || 'https://via.placeholder.com/150'}
                  alt={employee.name}
                  className="w-full h-full object-cover"
                />
                {isEditing && (
                  <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Update Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setNewPhoto(file);
                        if (file) setPhotoPreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 text-left relative">
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Name</label>
                  <input
                    className="input-field mt-1 shadow-sm"
                    value={editedData.name}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-widest ml-1">Position</label>
                  <select
                    className="input-field mt-1 shadow-sm"
                    value={editedData.role}
                    onChange={(e) => setEditedData({ ...editedData, role: e.target.value })}
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
              </div>
            ) : (
              <div className="space-y-2 relative">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{employee.name}</h1>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-widest">
                    {employee.role}
                  </div>
                  <div className="text-[12px] font-black uppercase tracking-[0.2em] flex gap-3 text-slate-500">
                    <span>ID: {employee.employeeId}</span>
                    <span>•</span>
                    <span>{calculateAge(employee.dateOfBirth) || '--'} YRS</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col gap-3 relative">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 btn btn-primary bg-slate-900 shadow-none flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Commit Changes
                      </>
                    )}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 btn btn-secondary border border-slate-200">
                    <X className="w-4 h-4" /> Discard
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full btn btn-secondary text-slate-600 bg-slate-50 border border-slate-200 hover:bg-white"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile Records
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 space-y-6 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-900" /> Operational Shift
            </h3>
            <div className="space-y-6">
              <div>
                <div className="text-xs text-slate-600 font-bold mb-3 uppercase tracking-widest">Active Weekdays</div>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      disabled={!isEditing}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-tighter ${(isEditing ? editedData.workDays : (employee.workDays || [])).includes(day)
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-300'
                        }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {isEditing ? (
                    <TimePicker
                      label="Shift Starts"
                      value={editedData.shiftStart}
                      onChange={(time) => setEditedData({ ...editedData, shiftStart: time })}
                    />
                  ) : (
                    <>
                      <div className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-widest">Shift Starts</div>
                      <div className="text-lg font-bold text-slate-800">{employee.shiftStart || '09:00'}</div>
                    </>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <TimePicker
                      label="Shift Ends"
                      value={editedData.shiftEnd}
                      onChange={(time) => setEditedData({ ...editedData, shiftEnd: time })}
                    />
                  ) : (
                    <>
                      <div className="text-xs text-slate-600 font-bold mb-1 uppercase tracking-widest">Shift Ends</div>
                      <div className="text-lg font-bold text-slate-800">{employee.shiftEnd || '18:00'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Monitor Section */}
          <div className="glass-card rounded-[2rem] p-8 space-y-6 border border-slate-300 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-slate-900" /> Punctuality Monitor
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Lates</div>
                <div className="text-2xl font-black text-slate-900">{summary.totalLates}d</div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Absences</div>
                <div className="text-2xl font-black text-slate-900">{summary.totalAbsents}d</div>
              </div>
              {/* Other stats removed as per request to focus on lates and absences */}
            </div>
          </div>
        </div>

        {/* Detailed Info Section */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Info Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-900" /> Contact Info
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Corporate Email</div>
                  {isEditing ? (
                    <input
                      className="input-field mt-2"
                      value={editedData.contact}
                      onChange={(e) => setEditedData({ ...editedData, contact: e.target.value })}
                    />
                  ) : (
                    <div className="text-slate-800 font-bold mt-1 text-lg">{employee.contact}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Telecommunications</div>
                  {isEditing ? (
                    <input
                      className="input-field mt-2"
                      value={editedData.phone}
                      onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    />
                  ) : (
                    <div className="text-slate-800 font-bold mt-1 text-lg">{employee.phone}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Date of Birth</div>
                  {isEditing ? (
                    <input
                      type="date"
                      className="input-field mt-2"
                      value={editedData.dateOfBirth}
                      onChange={(e) => setEditedData({ ...editedData, dateOfBirth: e.target.value })}
                    />
                  ) : (
                    <div className="text-slate-800 font-bold mt-1 text-lg">
                      {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }) : '--'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employment & Documents Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-300">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-900" /> Employment & Records
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Nationality</div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditedData({ ...editedData, isForeigner: false, passport: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${!editedData.isForeigner ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                        >
                          Local
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedData({ ...editedData, isForeigner: true, nationalId: '' })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${editedData.isForeigner ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                        >
                          Foreigner
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-800 font-bold text-sm">
                        {employee.isForeigner ? 'Foreigner' : 'Local'}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Joined Date</div>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold"
                        value={editedData.startDate}
                        onChange={(e) => setEditedData({ ...editedData, startDate: e.target.value })}
                      />
                    ) : (
                      <div className="text-slate-800 font-bold text-sm">
                        {new Date(employee.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Documentation Scans</div>
                  <div className="grid grid-cols-1 gap-2">
                    {(() => {
                      const renderSmallFile = (fileData, label, newFileState, setNewFileState) => (
                        <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/50 group hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                              <FileText className="w-4 h-4 text-slate-400" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
                          </div>

                          {isEditing ? (
                            <label className="cursor-pointer">
                              <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all uppercase">
                                {newFileState ? 'Ready' : 'Upload'}
                              </div>
                              <input type="file" className="hidden" onChange={(e) => setNewFileState(e.target.files[0])} />
                            </label>
                          ) : (
                            getFileUrl(fileData) ? (
                              <a href={getFileUrl(fileData)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-[9px] font-black text-slate-200 uppercase">Missing</span>
                            )
                          )}
                        </div>
                      );

                      return (
                        <>
                          {renderSmallFile(employee.cv, 'CV', newCV, setNewCV)}
                          {renderSmallFile(employee.contract, 'Contract', newContract, setNewContract)}
                          {((isEditing && !editedData.isForeigner) || (!isEditing && !employee.isForeigner)) && renderSmallFile(employee.nationalIdFile, 'National ID', newNationalIdFile, setNewNationalIdFile)}
                          {((isEditing && editedData.isForeigner) || (!isEditing && employee.isForeigner)) && renderSmallFile(employee.passportFile, 'Passport', newPassportFile, setNewPassportFile)}
                          {renderSmallFile(employee.nssfFile, 'NSSF Card', newNssfFile, setNewNssfFile)}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Work History Section */}
          <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col border border-slate-300 bg-white">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">History Log</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Records</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
                <Calendar className="w-5 h-5 text-slate-900" />
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {attendance.length > 0 ? (
                  attendance.map((entry, idx) => (
                    <div key={idx} className="group flex items-center justify-between p-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-200 hover:bg-white hover:border-slate-300 transition-all duration-300">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Date</span>
                          <span className="text-sm font-bold text-slate-900">
                            {new Date(entry.clockIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <div className="h-8 w-px bg-slate-200/50"></div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">Timeline</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/50 shadow-sm">
                              {new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-4 h-px bg-slate-300/30"></span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm ${entry.clockOut ? 'text-indigo-600 bg-indigo-50 border border-indigo-100/50' : 'text-slate-400 bg-slate-50 border border-slate-100 italic'}`}>
                              {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                            </span>
                          </div>
                        </div>

                        <div className="hidden md:flex h-8 w-px bg-slate-200/50"></div>

                        <div className="hidden md:flex flex-col">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Hours</span>
                          <span className="text-sm font-black text-slate-700">
                            {entry.workedHours ? `${entry.workedHours}h` : '--'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusStyle(entry.status)}`}>
                          {entry.status || 'Present'}
                        </span>
                        {entry.lateMinutes > 0 && (
                          <span className="text-[9px] font-black text-amber-600 mt-1 uppercase">
                            Delayed {entry.lateMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                    <Clock className="w-12 h-12 text-slate-300" />
                    <span className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Log Empty</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'late': return 'bg-amber-50 text-amber-600 border border-amber-100';
    case 'absent': return 'bg-rose-50 text-rose-600 border border-rose-100';
    case 'half day': return 'bg-blue-50 text-blue-600 border border-blue-100';
    default: return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  }
};

export default EmployeeDetail;