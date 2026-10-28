import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Users, UserPlus, Building2, Plus, Copy, Check, X, ShieldCheck } from 'lucide-react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import HrAuth from './components/HrAuth';
import OfficeSelector from './components/OfficeSelector';
import EmployeeList from './components/EmployeeList';
import EmployeeDetail from './components/EmployeeDetail';
import AddEmployeeForm from './components/AddEmployeeForm';
import {
  supabase,
  fetchUserWorkplaces,
  createWorkplace,
  fetchEmployeesByRoom,
  fetchAttendanceLogsByRoom,
  deleteEmployeeFromRoom,
  verifyRoomToken,
} from './lib/supabase';
import { API_URL } from './lib/api';

function App() {
  const [auth, setAuth] = useState(null); // { email, user, isTokenGuest, roomCode }
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Office creation modal & state
  const [showCreateOfficeModal, setShowCreateOfficeModal] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');
  const [isSubmittingOffice, setIsSubmittingOffice] = useState(false);
  const [officeError, setOfficeError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // 1. Initial Session / URL Parameters Check & Supabase OAuth Listener
  useEffect(() => {
    let authSubscription = null;

    async function checkAuthAndUrl() {
      setIsLoading(true);

      // A. Check for URL parameters: e.g. ?room=DTR-1001&token=...
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const tokenParam = params.get('token');

      if (roomParam) {
        const verifiedRoom = await verifyRoomToken(roomParam, tokenParam);
        if (verifiedRoom) {
          setSelectedOffice(verifiedRoom);
          setOffices([verifiedRoom]);
          setAuth({ isTokenGuest: true, roomCode: verifiedRoom.code });
          setIsLoading(false);
          // If accessing via direct room link, route to dashboard
          if (window.location.pathname === '/' || window.location.pathname === '/login') {
            navigate('/dashboard');
          }
          return;
        }
      }

      // B. Check active Supabase session (Google OAuth redirect or stored session)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeEmail = session?.user?.email || localStorage.getItem('hr_user_email');

        if (activeEmail) {
          localStorage.setItem('hr_user_email', activeEmail);
          setAuth({ email: activeEmail, user: session?.user || null });
          const userRooms = await fetchUserWorkplaces(activeEmail);
          setOffices(userRooms);
          if (userRooms.length > 0) {
            setSelectedOffice(userRooms[0]);
          }
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          if (window.location.pathname === '/login' || window.location.pathname === '/auth') {
            navigate('/dashboard');
          }
        }
      } catch (err) {
        console.error('Session retrieval error:', err);
      }

      setIsLoading(false);

      // C. Listen for Supabase auth state changes (e.g. Google OAuth sign-in)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user?.email) {
          const userEmail = newSession.user.email;
          localStorage.setItem('hr_user_email', userEmail);
          setAuth({ email: userEmail, user: newSession.user });
          const userRooms = await fetchUserWorkplaces(userEmail);
          setOffices(userRooms);
          if (userRooms.length > 0) {
            setSelectedOffice(userRooms[0]);
          }
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          if (window.location.pathname === '/login' || window.location.pathname === '/auth') {
            navigate('/dashboard');
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('hr_user_email');
          setAuth(null);
          setSelectedOffice(null);
          setOffices([]);
          setEmployees([]);
          setStatuses({});
        }
      });
      authSubscription = subscription;
    }

    checkAuthAndUrl();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // 2. Load Employees and Real-time Statuses whenever selectedOffice changes
  useEffect(() => {
    if (!selectedOffice) {
      setEmployees([]);
      setStatuses({});
      return;
    }

    loadOfficeData(selectedOffice.id);

    // Subscribe to real-time attendance logs for this office via Supabase WebSockets
    const channel = supabase
      .channel(`dtr_room_${selectedOffice.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dtr_attendance_logs',
          filter: `workplace_id=eq.${selectedOffice.id}`,
        },
        (payload) => {
          console.log('[Real-time Attendance Update]', payload);
          loadOfficeData(selectedOffice.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOffice]);

  const loadOfficeData = async (workplaceId) => {
    try {
      // 1. Fetch employees
      let emps = await fetchEmployeesByRoom(workplaceId);

      // Fallback to legacy local node API if no Supabase records found yet
      if (emps.length === 0) {
        try {
          const res = await fetch(`${API_URL}/employees`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              emps = data.map((e) => ({
                ...e,
                _id: e._id || e.id,
                employeeId: e.employeeId || e.employee_id,
              }));
            }
          }
        } catch (_) {}
      }

      setEmployees(emps);

      // 2. Fetch today's attendance logs
      const logs = await fetchAttendanceLogsByRoom(workplaceId);
      setAttendanceLogs(logs || []);
      calculateStatuses(emps, logs || []);
    } catch (err) {
      console.error('Error loading office data:', err);
    }
  };

  // Recalculate statuses periodically so shifts reaching end time transition to 'Absent' automatically
  useEffect(() => {
    if (employees.length === 0) return;
    const interval = setInterval(() => {
      calculateStatuses(employees, attendanceLogs);
    }, 30000);
    return () => clearInterval(interval);
  }, [employees, attendanceLogs]);

  const calculateStatuses = (employeeList, logs) => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[now.getDay()];
    const newStatuses = {};

    for (const emp of employeeList) {
      // Find today's attendance log for this staff member
      const empLog = (logs || []).find(
        (log) =>
          log.employee_id === emp.employeeId ||
          log.employee_id === emp.id ||
          log.employee_id === emp._id
      );

      let status = 'Not Scanned Yet';

      if (empLog) {
        // Scanned in today: either Late or Present
        if (empLog.status === 'Late' || (empLog.late_minutes && Number(empLog.late_minutes) > 0)) {
          status = 'Late';
        } else {
          status = 'Present';
        }
      } else {
        // No scan recorded today
        const workDays = Array.isArray(emp.workDays) && emp.workDays.length > 0
          ? emp.workDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        const isWorkDay = workDays.includes(currentDayName);

        if (!isWorkDay) {
          status = 'Off Duty';
        } else {
          // Check if employee's shift has ended
          const [endH, endM] = (emp.shiftEnd || '18:00').split(':').map(Number);
          const shiftEndTime = new Date();
          shiftEndTime.setHours(isNaN(endH) ? 18 : endH, isNaN(endM) ? 0 : endM, 0, 0);

          if (now >= shiftEndTime) {
            status = 'Absent';
          } else {
            status = 'Not Scanned Yet';
          }
        }
      }

      // Assign status to all possible identifier keys for rock-solid lookup
      if (emp._id) newStatuses[emp._id] = status;
      if (emp.id) newStatuses[emp.id] = status;
      if (emp.employeeId) newStatuses[emp.employeeId] = status;
    }

    setStatuses(newStatuses);
  };

  // Office Creation Action
  const handleCreateOffice = async (e) => {
    if (e) e.preventDefault();
    const cleanName = newOfficeName.trim().replace(/[<>]/g, '').slice(0, 50);
    if (!cleanName) {
      setOfficeError('Please enter a valid office name.');
      return;
    }
    const adminEmail = auth?.email;
    if (!adminEmail) {
      setOfficeError('You must be signed in to create an office.');
      return;
    }

    setIsSubmittingOffice(true);
    setOfficeError(null);

    try {
      const newRoom = await createWorkplace(cleanName, adminEmail);
      const updatedRooms = await fetchUserWorkplaces(adminEmail);
      setOffices(updatedRooms);
      setSelectedOffice(newRoom);
      setShowCreateOfficeModal(false);
      setNewOfficeName('');
    } catch (err) {
      setOfficeError(err.message || 'Failed to create office.');
    } finally {
      setIsSubmittingOffice(false);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Auth Callbacks
  const handleAuthenticated = async ({ email }) => {
    localStorage.setItem('hr_user_email', email);
    setAuth({ email });
    const userRooms = await fetchUserWorkplaces(email);
    setOffices(userRooms);
    if (userRooms.length > 0) {
      setSelectedOffice(userRooms[0]);
    } else {
      setSelectedOffice(null);
    }
    navigate('/dashboard');
  };

  const handleDirectRoomAccess = (room) => {
    setSelectedOffice(room);
    setOffices([room]);
    setAuth({ isTokenGuest: true, roomCode: room.code });
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('hr_user_email');
    await supabase.auth.signOut().catch(() => {});
    setAuth(null);
    setSelectedOffice(null);
    setOffices([]);
    setEmployees([]);
    setStatuses({});
    window.history.replaceState({}, document.title, '/');
    navigate('/');
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee from this office?')) return;
    try {
      await deleteEmployeeFromRoom(id);
      if (selectedOffice) {
        loadOfficeData(selectedOffice.id);
      }
    } catch (err) {
      console.error('Delete employee error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <Navbar auth={auth} onSignOut={handleSignOut} />

      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage auth={auth} />} />

        {/* Sign In / Sign Up Screen */}
        <Route
          path="/login"
          element={
            <div className="pt-20">
              <HrAuth
                onAuthenticated={handleAuthenticated}
                onSelectRoom={handleDirectRoomAccess}
              />
            </div>
          }
        />
        <Route path="/auth" element={<Navigate to="/login" replace />} />

        {/* HR Dashboard */}
        <Route
          path="/dashboard"
          element={
            !auth && !selectedOffice ? (
              <div className="pt-20">
                <HrAuth
                  onAuthenticated={handleAuthenticated}
                  onSelectRoom={handleDirectRoomAccess}
                />
              </div>
            ) : offices.length === 0 && !selectedOffice ? (
              /* EMPTY STATE: USER HAS NO OFFICES YET */
              <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                <div className="bg-white border border-neutral-200 rounded-3xl p-8 sm:p-12 text-center shadow-xl shadow-neutral-100">
                  <div className="w-16 h-16 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-black">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight mb-2">
                    No Offices Created Yet
                  </h2>
                  <p className="text-sm text-neutral-500 max-w-md mx-auto mb-8 font-medium leading-relaxed">
                    FaceTrack never auto-generates offices for your account. Name your workspace below to set up your team roster and generate your biometric tablet kiosk code.
                  </p>

                  <form onSubmit={handleCreateOffice} className="max-w-md mx-auto space-y-4">
                    {officeError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs text-left">
                        {officeError}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        value={newOfficeName}
                        onChange={(e) => setNewOfficeName(e.target.value)}
                        placeholder="e.g. Headquarters, Phnom Penh Office"
                        maxLength={50}
                        required
                        className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-300 rounded-2xl text-sm font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingOffice}
                      className="w-full py-3.5 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-sm rounded-full transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      {isSubmittingOffice ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Create Office Workspace</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      Maximum 3 office workspaces per administrator account
                    </p>
                  </form>
                </div>
              </main>
            ) : (
              /* ACTIVE DASHBOARD */
              <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="bg-white border border-neutral-200/90 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-xl shadow-neutral-100">
                  {/* Dashboard Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                          {selectedOffice?.name || 'Personnel Registry'}
                        </h2>
                        {selectedOffice && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold bg-neutral-100 text-black border border-neutral-200 px-3 py-1 rounded-full">
                              {selectedOffice.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(selectedOffice.code)}
                              className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                              title="Copy Room Code for Kiosk"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 font-medium mt-1">
                        Biometric facial attendance roster & real-time shift verification
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Office Switcher */}
                      {offices.length > 0 && (
                        <OfficeSelector
                          offices={offices}
                          selectedOffice={selectedOffice}
                          onSelectOffice={(office) => setSelectedOffice(office)}
                          onAddNewOffice={() => setShowCreateOfficeModal(true)}
                          maxOffices={3}
                        />
                      )}

                      {/* Add Office Button (if < 3 offices) */}
                      {offices.length < 3 && auth && !auth.isTokenGuest && (
                        <button
                          type="button"
                          onClick={() => setShowCreateOfficeModal(true)}
                          className="inline-flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200/80 text-black px-3.5 py-2.5 rounded-2xl font-bold text-xs border border-neutral-200/80 transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Office</span>
                        </button>
                      )}

                      {/* Add Staff Button */}
                      {selectedOffice && (
                        <button
                          onClick={() => navigate('/add')}
                          className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-full font-bold text-xs shadow-md transition-all hover:shadow-lg"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Staff</span>
                        </button>
                      )}

                      <div className="px-3.5 py-2 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs font-bold text-neutral-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-black" />
                        <span>{employees.length} Staff</span>
                      </div>
                    </div>
                  </div>

                  {/* Employees Registry Table */}
                  <EmployeeList
                    employees={employees}
                    statuses={statuses}
                    onSelectEmployee={(emp) => navigate(`/employee/${emp.employeeId || emp.id}`)}
                    onDeleteEmployee={handleDeleteEmployee}
                  />
                </div>
              </main>
            )
          }
        />

        {/* Employee Detail Page */}
        <Route
          path="/employee/:id"
          element={
            <div className="pt-28 pb-16 px-4 max-w-7xl mx-auto">
              <EmployeeDetail
                onBack={() => navigate('/dashboard')}
                onUpdate={() => selectedOffice && loadOfficeData(selectedOffice.id)}
              />
            </div>
          }
        />

        {/* Add Employee Page */}
        <Route
          path="/add"
          element={
            <div className="pt-28 pb-16 px-4 max-w-4xl mx-auto">
              <AddEmployeeForm
                selectedOffice={selectedOffice}
                onEmployeeAdded={() => {
                  navigate('/dashboard');
                  if (selectedOffice) loadOfficeData(selectedOffice.id);
                }}
                onCancel={() => navigate('/dashboard')}
              />
            </div>
          }
        />
      </Routes>

      {/* CREATE OFFICE MODAL */}
      {showCreateOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateOfficeModal(false)} />
          <div className="relative bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl z-10 animate-fade-in">
            <button
              onClick={() => setShowCreateOfficeModal(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center text-black">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-black tracking-tight">Create New Office</h3>
                <p className="text-xs text-neutral-500 font-medium">({offices.length + 1}/3 allowed offices)</p>
              </div>
            </div>

            {officeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs">
                {officeError}
              </div>
            )}

            <form onSubmit={handleCreateOffice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Office Name
                </label>
                <input
                  type="text"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="e.g. Branch Office, Warehouse"
                  maxLength={50}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-2xl text-sm font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOfficeModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOffice}
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  {isSubmittingOffice ? 'Creating...' : 'Create Office'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
