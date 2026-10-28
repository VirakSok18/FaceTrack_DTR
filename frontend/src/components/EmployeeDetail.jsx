import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, getFileUrl } from '../lib/api';
import {
  supabase,
  fetchEmployeeById,
  fetchEmployeeAttendanceLogs,
  updateEmployeeInRoom,
  uploadEmployeeFile,
} from '../lib/supabase';
import StaffAvatar from './StaffAvatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  Edit2,
  Save,
  X,
  FileText,
  ExternalLink,
  LayoutDashboard,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import TimePicker from './TimePicker';

function EmployeeDetail({ onBack, onUpdate }) {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({ totalLates: 0, totalAbsents: 0, totalWorkedHours: 0 });
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
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Dynamic Age calculation
  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    if (diff_ms < 0) return '';
    const age_dt = new Date(diff_ms);
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const fetchEmployeeData = async () => {
      setLoading(true);
      try {
        // 1. Fetch employee directly from Supabase
        let found = await fetchEmployeeById(id);

        // Fallback to legacy local node API if not found in Supabase
        if (!found) {
          try {
            const res = await fetch(`${API_URL}/employees`);
            if (res.ok) {
              const allEmployees = await res.json();
              found = allEmployees.find(e => e.employeeId === id || e._id === id || e.id === id);
              if (found) {
                found = {
                  ...found,
                  _id: found._id || found.id,
                  employeeId: found.employeeId || found.employee_id,
                  photo: found.photo || found.photo_url,
                };
              }
            }
          } catch (_) {}
        }

        if (found && isMounted) {
          setEmployee(found);
          setEditedData({
            name: found.name || '',
            role: found.role || 'Software Engineer',
            dateOfBirth: found.dateOfBirth ? new Date(found.dateOfBirth).toISOString().split('T')[0] : '',
            contact: found.contact || '',
            phone: found.phone || '',
            isForeigner: found.isForeigner || false,
            nationalId: found.nationalId || '',
            passport: found.passport || '',
            nssf: found.nssf || '',
            startDate: found.startDate ? new Date(found.startDate).toISOString().split('T')[0] : '',
            workDays: found.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            shiftStart: found.shiftStart || '09:00',
            shiftEnd: found.shiftEnd || '18:00',
            requiredHours: found.requiredHours || 8,
          });

          // 2. Fetch attendance logs from Supabase
          const empLogs = await fetchEmployeeAttendanceLogs(found.employeeId || found.id);
          
          if (empLogs.length > 0) {
            setAttendance(empLogs);
            calculateSummary(empLogs);
          } else {
            // Fallback to legacy DTR endpoint
            try {
              const [attRes, sumRes] = await Promise.all([
                fetch(`${API_URL}/dtr/${id}`),
                fetch(`${API_URL}/dtr/summary/${id}`),
              ]);
              if (attRes.ok) {
                const legacyLogs = await attRes.json();
                setAttendance(Array.isArray(legacyLogs) ? legacyLogs : []);
              }
              if (sumRes.ok) {
                const legacySum = await sumRes.json();
                setSummary(legacySum || { totalLates: 0, totalAbsents: 0, totalWorkedHours: 0 });
              }
            } catch (_) {}
          }

          // 3. Subscribe to real-time attendance logs for this employee
          subscription = supabase
            .channel(`emp_logs_${found.employeeId || found.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'dtr_attendance_logs',
                filter: `employee_id=eq.${found.employeeId}`,
              },
              async () => {
                const freshLogs = await fetchEmployeeAttendanceLogs(found.employeeId);
                if (isMounted) {
                  setAttendance(freshLogs);
                  calculateSummary(freshLogs);
                }
              }
            )
            .subscribe();
        }
      } catch (error) {
        console.error('Error fetching employee detail data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEmployeeData();

    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [id]);

  const calculateSummary = (logs) => {
    let lates = 0;
    let absents = 0;
    let worked = 0;

    for (const log of logs) {
      if (log.status === 'Late' || Number(log.lateMinutes) > 0) {
        lates += 1;
      } else if (log.status === 'Absent') {
        absents += 1;
      }
      if (log.workedHours) {
        worked += Number(log.workedHours) || 0;
      }
    }

    setSummary({
      totalLates: lates,
      totalAbsents: absents,
      totalWorkedHours: parseFloat(worked.toFixed(1)),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      // 1. Upload any new files (photo or documents)
      let photoUrl = employee.photo;
      if (newPhoto) {
        photoUrl = await uploadEmployeeFile(newPhoto, 'avatars');
      }

      let cvUrl = employee.cv;
      if (newCV) {
        cvUrl = await uploadEmployeeFile(newCV, 'documents');
      }

      let nationalIdFileUrl = employee.nationalIdFile;
      if (newNationalIdFile) {
        nationalIdFileUrl = await uploadEmployeeFile(newNationalIdFile, 'documents');
      }

      let passportFileUrl = employee.passportFile;
      if (newPassportFile) {
        passportFileUrl = await uploadEmployeeFile(newPassportFile, 'documents');
      }

      let nssfFileUrl = employee.nssfFile;
      if (newNssfFile) {
        nssfFileUrl = await uploadEmployeeFile(newNssfFile, 'documents');
      }

      let contractUrl = employee.contract;
      if (newContract) {
        contractUrl = await uploadEmployeeFile(newContract, 'documents');
      }

      // 2. Direct Supabase Update
      const updated = await updateEmployeeInRoom(employee.id || employee._id || id, {
        name: (editedData.name || '').trim(),
        role: editedData.role,
        contact: (editedData.contact || '').trim(),
        phone: (editedData.phone || '').trim(),
        dateOfBirth: editedData.dateOfBirth || null,
        startDate: editedData.startDate || null,
        isForeigner: editedData.isForeigner,
        nationalId: editedData.nationalId || '',
        passport: editedData.passport || '',
        nssf: editedData.nssf || '',
        shiftStart: editedData.shiftStart || '09:00',
        shiftEnd: editedData.shiftEnd || '18:00',
        workDays: editedData.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        photoUrl: photoUrl,
        cvUrl: cvUrl,
        nationalIdFileUrl: nationalIdFileUrl,
        passportFileUrl: passportFileUrl,
        nssfFileUrl: nssfFileUrl,
        contractUrl: contractUrl,
      });

      if (updated) {
        setEmployee(updated);
      } else {
        // Fallback update local state
        setEmployee((prev) => ({
          ...prev,
          ...editedData,
          photo: photoUrl,
          cv: cvUrl,
          nationalIdFile: nationalIdFileUrl,
          passportFile: passportFileUrl,
          nssfFile: nssfFileUrl,
          contract: contractUrl,
        }));
      }

      // 3. Also try legacy Node API if running
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

        await fetch(`${API_URL}/employees/${employee._id || employee.id}`, {
          method: 'PUT',
          body: formData,
        });
      } catch (_) {}

      // Reset file staging
      setNewPhoto(null);
      setNewCV(null);
      setNewNationalIdFile(null);
      setNewPassportFile(null);
      setNewNssfFile(null);
      setNewContract(null);
      setPhotoPreview(null);
      setIsEditing(false);

      if (onUpdate) onUpdate();
      setFeedbackMsg('Profile updated successfully!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert(error.message || 'Failed to update employee profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day) => {
    const current = editedData.workDays || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setEditedData({ ...editedData, workDays: newDays });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-black rounded-full animate-spin" />
        <p className="text-neutral-500 font-bold uppercase tracking-wider text-xs">Loading staff records...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20 bg-white border border-neutral-200 rounded-3xl p-8 max-w-xl mx-auto shadow-sm">
        <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-neutral-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-black tracking-tight">Staff Member Not Found</h2>
        <p className="text-neutral-500 text-xs font-medium mt-2 max-w-md mx-auto">
          The requested staff record could not be located in this office registry or may have been deleted.
        </p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-full font-bold text-xs shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-700 hover:text-black transition-all font-bold group bg-white px-5 py-2.5 rounded-full border border-neutral-200 shadow-sm hover:shadow-md text-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Staff Registry</span>
        </button>

        {feedbackMsg && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Shift Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl overflow-hidden p-8 text-center relative border border-neutral-200 shadow-sm">
            {/* Header Banner */}
            <div className="absolute top-0 left-0 w-full h-28 bg-neutral-900" />

            {/* Profile Avatar */}
            <div className="relative pt-8 mb-6">
              <div className="w-36 h-36 rounded-3xl border-4 border-white shadow-xl mx-auto overflow-hidden bg-neutral-900 relative">
                <StaffAvatar
                  photo={photoPreview || employee.photo}
                  name={employee.name}
                  size="full"
                />

                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer transition-opacity backdrop-blur-xs">
                    <Camera className="w-7 h-7 text-white mb-1.5" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Change Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setNewPhoto(file);
                          setPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Employee Name & Role */}
            {isEditing ? (
              <div className="space-y-4 text-left relative">
                <div>
                  <label className="text-xs font-bold text-neutral-700 ml-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
                    value={editedData.name}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 ml-1">Position / Role</label>
                  <select
                    className="w-full mt-1 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-black"
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
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 relative">
                <h1 className="text-2xl font-black text-black tracking-tight">{employee.name}</h1>
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-block px-3 py-1 bg-black text-white rounded-full text-[11px] font-bold">
                    {employee.role}
                  </div>
                  <div className="text-[11px] font-mono font-bold uppercase flex items-center gap-2 text-neutral-500 mt-1">
                    <span>ID: {employee.employeeId}</span>
                    <span>•</span>
                    <span>{calculateAge(employee.dateOfBirth) ? `${calculateAge(employee.dateOfBirth)} YRS` : 'Active'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Edit / Save Action Bar */}
            <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-col gap-3 relative">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-full text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setPhotoPreview(null);
                      setNewPhoto(null);
                    }}
                    className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* Operational Shift Card */}
          <div className="bg-white rounded-3xl p-6 space-y-5 border border-neutral-200 shadow-sm">
            <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-black" />
              <span>Operational Shift Schedule</span>
            </h3>

            <div>
              <div className="text-[11px] text-neutral-500 font-bold mb-2">Workdays</div>
              <div className="flex flex-wrap gap-1.5">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const active = (isEditing ? editedData.workDays : (employee.workDays || [])).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${
                        active
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200/60'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div>
                {isEditing ? (
                  <TimePicker
                    label="Shift Starts"
                    value={editedData.shiftStart}
                    onChange={(time) => setEditedData({ ...editedData, shiftStart: time })}
                  />
                ) : (
                  <>
                    <div className="text-[11px] text-neutral-500 font-bold mb-0.5">Shift Starts</div>
                    <div className="text-base font-black text-black">{employee.shiftStart || '09:00'}</div>
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
                    <div className="text-[11px] text-neutral-500 font-bold mb-0.5">Shift Ends</div>
                    <div className="text-base font-black text-black">{employee.shiftEnd || '18:00'}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Punctuality Monitor */}
          <div className="bg-white rounded-3xl p-6 space-y-4 border border-neutral-200 shadow-sm">
            <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-black" />
              <span>Punctuality & Attendance</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">Total Lates</div>
                <div className="text-2xl font-black text-amber-900">{summary.totalLates}d</div>
              </div>
              <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl">
                <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider mb-1">Total Absences</div>
                <div className="text-2xl font-black text-rose-900">{summary.totalAbsents}d</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact, Documents & Attendance History */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-black" />
                <span>Contact Details</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-neutral-500 font-bold">Email Address</div>
                  {isEditing ? (
                    <input
                      type="email"
                      className="w-full mt-1 px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
                      value={editedData.contact}
                      onChange={(e) => setEditedData({ ...editedData, contact: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-black mt-0.5">{employee.contact || 'No email provided'}</div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500 font-bold">Phone Number</div>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="w-full mt-1 px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
                      value={editedData.phone}
                      onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-black mt-0.5">{employee.phone || 'No phone provided'}</div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-neutral-500 font-bold">Date of Birth</div>
                  {isEditing ? (
                    <input
                      type="date"
                      className="w-full mt-1 px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
                      value={editedData.dateOfBirth}
                      onChange={(e) => setEditedData({ ...editedData, dateOfBirth: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm font-bold text-black mt-0.5">
                      {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }) : 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Employment & Identity Records */}
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-black" />
                <span>Employment & Identity</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-neutral-500 font-bold mb-1">Status</div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditedData({ ...editedData, isForeigner: false })}
                          className={`flex-1 py-1 rounded-xl text-[10px] font-bold ${!editedData.isForeigner ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'}`}
                        >
                          Local
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedData({ ...editedData, isForeigner: true })}
                          className={`flex-1 py-1 rounded-xl text-[10px] font-bold ${editedData.isForeigner ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'}`}
                        >
                          Foreign
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-black">
                        {employee.isForeigner ? 'Foreign Staff' : 'Local Staff'}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] text-neutral-500 font-bold mb-1">Joined Date</div>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-2 py-1 text-xs font-bold"
                        value={editedData.startDate}
                        onChange={(e) => setEditedData({ ...editedData, startDate: e.target.value })}
                      />
                    ) : (
                      <div className="text-sm font-bold text-black">
                        {employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Identity Document Numbers */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs">
                  {(!employee.isForeigner || isEditing) && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-neutral-500 font-bold">National ID:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          className="px-2 py-1 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold"
                          value={editedData.nationalId}
                          onChange={(e) => setEditedData({ ...editedData, nationalId: e.target.value })}
                        />
                      ) : (
                        <span className="font-mono font-bold text-black">{employee.nationalId || 'N/A'}</span>
                      )}
                    </div>
                  )}

                  {(employee.isForeigner || isEditing) && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-neutral-500 font-bold">Passport:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          className="px-2 py-1 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold"
                          value={editedData.passport}
                          onChange={(e) => setEditedData({ ...editedData, passport: e.target.value })}
                        />
                      ) : (
                        <span className="font-mono font-bold text-black">{employee.passport || 'N/A'}</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-500 font-bold">NSSF Number:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="px-2 py-1 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-bold"
                        value={editedData.nssf}
                        onChange={(e) => setEditedData({ ...editedData, nssf: e.target.value })}
                      />
                    ) : (
                      <span className="font-mono font-bold text-black">{employee.nssf || 'N/A'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History Log */}
          <div className="bg-white rounded-3xl overflow-hidden border border-neutral-200 shadow-sm">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-neutral-100">
              <div>
                <h2 className="text-base font-black text-black tracking-tight">Attendance Record Log</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Verified Face Scans & Time In/Out
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center text-black">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {attendance.length > 0 ? (
                  attendance.map((entry, idx) => (
                    <div
                      key={entry.id || entry._id || idx}
                      className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 hover:bg-neutral-100/60 transition-all duration-200"
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Date</span>
                          <span className="text-xs font-bold text-black">
                            {entry.date
                              ? new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                              : entry.clockIn
                              ? new Date(entry.clockIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                              : 'Today'}
                          </span>
                        </div>

                        <div className="h-7 w-px bg-neutral-200" />

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Time</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                            <span className="text-neutral-300">→</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${entry.clockOut ? 'text-black bg-neutral-200/80 border border-neutral-300' : 'text-neutral-500 bg-neutral-100 border border-neutral-200 italic'}`}>
                              {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                            </span>
                          </div>
                        </div>

                        {entry.workedHours > 0 && (
                          <>
                            <div className="hidden sm:block h-7 w-px bg-neutral-200" />
                            <div className="hidden sm:flex flex-col">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">Duration</span>
                              <span className="text-xs font-black text-neutral-700">
                                {entry.workedHours}h
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                          entry.status === 'Late'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : entry.status === 'Absent'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {entry.status || 'Present'}
                        </span>
                        {entry.lateMinutes > 0 && (
                          <span className="text-[9px] font-bold text-amber-700 mt-1">
                            +{entry.lateMinutes}m Late
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400 mb-2">
                      <Clock className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      No Attendance Scans Yet
                    </span>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">
                      Clock-in records will appear here as the employee scans face on the kiosk.
                    </p>
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

export default EmployeeDetail;
