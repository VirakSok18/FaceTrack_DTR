import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { LayoutDashboard, Users, UserPlus, LogOut, ClipboardList } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import EmployeeList from './components/EmployeeList';
import EmployeeDetail from './components/EmployeeDetail';
import AddEmployeeForm from './components/AddEmployeeForm';
import AttendanceSummary from './components/AttendanceSummary';

import { API_URL, getFileUrl } from './lib/api';

const socket = io(API_URL.replace('/api', ''));

function App() {
    const [employees, setEmployees] = useState([]);
    const [statuses, setStatuses] = useState({});
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadEmployees();

        socket.on('dtr_update', (data) => {
            console.log('Real-time DTR update:', data);
            loadEmployees();
        });

        return () => socket.off('dtr_update');
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employees`);
            const data = await res.json();
            setEmployees(data);
            await loadStatuses(data);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const loadStatuses = async (employeeList) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = days[now.getDay()];
        const newStatuses = {};

        for (const emp of employeeList) {
            try {
                const res = await fetch(`${API_URL}/dtr/${emp.employeeId}`);
                const dtrs = await res.json();
                const todayRecord = dtrs.find(d => d.date === today && !d.clockOut);

                if (todayRecord) {
                    newStatuses[emp._id] = todayRecord.status === 'Late' ? 'Late' : 'Clocked In';
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
            } catch (error) {
                newStatuses[emp._id] = 'Unknown';
            }
        }
        setStatuses(newStatuses);
    };

    const handleEmployeeAdded = () => {
        navigate('/');
        loadEmployees();
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm('Are you sure you want to delete this employee?')) return;
        try {
            await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
            loadEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
        }
    };

    const handleEmployeeUpdate = () => {
        loadEmployees();
    };

    return (
        <div className="min-h-screen bg-white relative overflow-hidden font-sans text-slate-900">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 glass border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => navigate('/')}
                        >
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg transition-transform">
                                <LayoutDashboard className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-heading font-bold text-slate-900">DTR Management</h1>
                                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">Operational Monitor</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(location.pathname === '/add' ? '/' : '/add')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${location.pathname === '/add' ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-white hover:bg-black shadow-md'
                                    }`}
                            >
                                {location.pathname === '/add' ? <LogOut className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                {location.pathname === '/add' ? 'Cancel' : 'Add Employees'}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
                <Routes>
                    <Route path="/" element={
                        <div className="animate-slide-up">
                            <div className="glass-card rounded-3xl overflow-hidden p-1 shadow-2xl shadow-slate-200/50">
                                <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-heading font-bold text-slate-900">Personnel Registry</h2>
                                            <p className="text-sm text-slate-600 italic">Monitor team punctuality and session logs</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                            <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-tight">
                                                <Users className="w-4 h-4 text-slate-900" />
                                                Total Staff: {employees.length}
                                            </div>
                                        </div>
                                    </div>

                                    <EmployeeList
                                        employees={employees}
                                        statuses={statuses}
                                        onSelectEmployee={(emp) => navigate(`/employee/${emp.employeeId}`)}
                                        onDeleteEmployee={handleDeleteEmployee}
                                    />
                                </div>
                            </div>
                        </div>
                    } />

                    <Route path="/employee/:id" element={
                        <div className="animate-fade-in">
                            <EmployeeDetail
                                onBack={() => navigate('/')}
                                onUpdate={handleEmployeeUpdate}
                            />
                        </div>
                    } />



                    <Route path="/add" element={
                        <div className="animate-slide-up">
                            <AddEmployeeForm onEmployeeAdded={handleEmployeeAdded} onCancel={() => navigate('/')} />
                        </div>
                    } />
                </Routes>
            </main>
        </div>
    );
}

export default App;
