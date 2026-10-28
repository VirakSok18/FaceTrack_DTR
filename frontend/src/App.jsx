import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Users, UserPlus, Building2 } from 'lucide-react';
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
  const [statuses, setStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // 1. Initial Session / URL Parameters Check
  useEffect(() => {
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
          if (window.location.pathname === '/') {
            navigate('/dashboard');
          }
          return;
        }
      }

      // B. Check persistent localStorage login
      const savedEmail = localStorage.getItem('hr_user_email');
      if (savedEmail) {
        setAuth({ email: savedEmail });
        const userRooms = await fetchUserWorkplaces(savedEmail);
        setOffices(userRooms);
        if (userRooms.length > 0) {
          setSelectedOffice(userRooms[0]);
        }
      }

      setIsLoading(false);
    }

    checkAuthAndUrl();
  }, []);

  // 2. Load Employees and Real-time Statuses whenever selectedOffice changes
  useEffect(() => {
    if (!selectedOffice) return;

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
      calculateStatuses(emps, logs);
    } catch (err) {
      console.error('Error loading office data:', err);
    }
  };

  const calculateStatuses = (employeeList, logs) => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[now.getDay()];
    const newStatuses = {};

    for (const emp of employeeList) {
      const empLog = logs.find(
        (log) => (log.employee_id === emp.employeeId || log.employee_id === emp.id) && !log.clock_out
      );

      if (empLog) {
        newStatuses[emp._id] = empLog.status === 'Late' ? 'Late' : 'Clocked In';
      } else {
        const isWorkDay = Array.isArray(emp.workDays) && emp.workDays.includes(currentDayName);
        if (isWorkDay) {
          const [shiftH, shiftM] = (emp.shiftStart || '09:00').split(':').map(Number);
          const shiftStartTime = new Date();
          shiftStartTime.setHours(shiftH, shiftM, 0, 0);

          if (now > new Date(shiftStartTime.getTime() + 30 * 60000)) {
            newStatuses[emp._id] = 'Absent';
          } else {
            newStatuses[emp._id] = 'Expected';
          }
        } else {
          newStatuses[emp._id] = 'Off Duty';
        }
      }
    }

    setStatuses(newStatuses);
  };

  // Auth Callbacks
  const handleAuthenticated = async ({ email }) => {
    localStorage.setItem('hr_user_email', email);
    setAuth({ email });
    const userRooms = await fetchUserWorkplaces(email);
    setOffices(userRooms);
    if (userRooms.length > 0) {
      setSelectedOffice(userRooms[0]);
    }
    navigate('/dashboard');
  };

  const handleDirectRoomAccess = (room) => {
    setSelectedOffice(room);
    setOffices([room]);
    setAuth({ isTokenGuest: true, roomCode: room.code });
    navigate('/dashboard');
  };

  const handleSignOut = () => {
    localStorage.removeItem('hr_user_email');
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-950 selection:text-white">
      {/* Top Navbar */}
      <Navbar auth={auth} onSignOut={handleSignOut} />

      <Routes>
        {/* Landing Page (Melo/Spottr Style) */}
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
            ) : (
              <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-xl shadow-slate-100">
                  {/* Dashboard Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                          {selectedOffice?.name || 'Personnel Registry'}
                        </h2>
                        {selectedOffice && (
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-900 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                            {selectedOffice.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Real-time biometric attendance and shift verification
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Office Switcher */}
                      {offices.length > 0 && (
                        <OfficeSelector
                          offices={offices}
                          selectedOffice={selectedOffice}
                          onSelectOffice={(office) => setSelectedOffice(office)}
                        />
                      )}

                      {/* Add Staff Button */}
                      <button
                        onClick={() => navigate('/add')}
                        className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all hover:shadow-lg"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Staff</span>
                      </button>

                      <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-900" />
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
    </div>
  );
}

export default App;
