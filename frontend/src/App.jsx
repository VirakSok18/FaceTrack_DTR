import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserPlus, LogOut, Building2, ShieldAlert } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EmployeeList from './components/EmployeeList';
import EmployeeDetail from './components/EmployeeDetail';
import AddEmployeeForm from './components/AddEmployeeForm';
import HrAuth from './components/HrAuth';
import OfficeSelector from './components/OfficeSelector';
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
  const [auth, setAuth] = useState(null); // { email, user, isTokenGuest }
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

    // Subscribe to real-time attendance logs for this office
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
  };

  const handleDirectRoomAccess = (room) => {
    setSelectedOffice(room);
    setOffices([room]);
    setAuth({ isTokenGuest: true, roomCode: room.code });
  };

  const handleSignOut = () => {
    localStorage.removeItem('hr_user_email');
    setAuth(null);
    setSelectedOffice(null);
    setOffices([]);
    setEmployees([]);
    setStatuses({});
    // Remove query params from URL cleanly
    window.history.replaceState({}, document.title, window.location.pathname);
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated and no office selected, show Login Screen
  if (!auth || (!selectedOffice && offices.length === 0)) {
    return (
      <HrAuth
        onAuthenticated={handleAuthenticated}
        onSelectRoom={handleDirectRoomAccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                <LayoutDashboard className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">DTR Portal</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Live Attendance Monitor
                </p>
              </div>
            </div>

            {/* Office Switcher & Actions */}
            <div className="flex items-center gap-3">
              {offices.length > 0 && (
                <OfficeSelector
                  offices={offices}
                  selectedOffice={selectedOffice}
                  onSelectOffice={(office) => setSelectedOffice(office)}
                />
              )}

              <button
                onClick={() => navigate(location.pathname === '/add' ? '/' : '/add')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  location.pathname === '/add'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                }`}
              >
                {location.pathname === '/add' ? (
                  <>Back to Monitor</>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Staff
                  </>
                )}
              </button>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <Routes>
          <Route
            path="/"
            element={
              <div className="animate-slide-up">
                <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden p-6 shadow-xl shadow-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {selectedOffice?.name || 'Personnel Registry'}
                        </h2>
                        {selectedOffice && (
                          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                            {selectedOffice.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Real-time biometric attendance and shift verification
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-900" />
                        Total Staff: {employees.length}
                      </div>
                    </div>
                  </div>

                  <EmployeeList
                    employees={employees}
                    statuses={statuses}
                    onSelectEmployee={(emp) => navigate(`/employee/${emp.employeeId || emp.id}`)}
                    onDeleteEmployee={handleDeleteEmployee}
                  />
                </div>
              </div>
            }
          />

          <Route
            path="/employee/:id"
            element={
              <div className="animate-fade-in">
                <EmployeeDetail
                  onBack={() => navigate('/')}
                  onUpdate={() => selectedOffice && loadOfficeData(selectedOffice.id)}
                />
              </div>
            }
          />

          <Route
            path="/add"
            element={
              <div className="animate-slide-up">
                <AddEmployeeForm
                  selectedOffice={selectedOffice}
                  onEmployeeAdded={() => {
                    navigate('/');
                    if (selectedOffice) loadOfficeData(selectedOffice.id);
                  }}
                  onCancel={() => navigate('/')}
                />
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
