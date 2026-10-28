import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Download, UserCheck, UserX, Clock } from 'lucide-react';

import { API_URL } from '../lib/api';

function AttendanceSummary({ employees }) {
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyData, setDailyData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDailyReport();
    }, [reportDate]);

    const fetchDailyReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/dtr/report/${reportDate}`);
            if (res.ok) {
                const data = await res.json();
                setDailyData(data);
            }
        } catch (error) {
            console.error('Error fetching daily report:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'Present': 'bg-slate-900 text-white',
            'Late': 'bg-amber-50 text-amber-800 border-amber-200',
            'Absent': 'bg-rose-50 text-rose-800 border-rose-200'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[status] || 'bg-slate-100 text-slate-500'}`}>
                {status || 'Pending'}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Personnel Daily Logs</h2>
                    <p className="text-slate-600 font-medium">Verify daily presence and punctuality records</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            className="input-field pl-10 pr-4 py-2 bg-white shadow-sm"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            await fetch(`${API_URL}/dtr/process`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ date: reportDate })
                            });
                            fetchDailyReport();
                        }}
                        className="btn btn-secondary text-slate-700 hover:bg-slate-100 border-slate-200"
                    >
                        <Clock className="w-4 h-4" /> {loading ? 'Processing...' : 'Sync Logs'}
                    </button>
                    <button className="btn btn-primary bg-slate-900 hover:bg-black shadow-none">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 rounded-[2rem] border-slate-100 bg-emerald-50/20 flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                        <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Present</div>
                        <div className="text-2xl font-black text-slate-900">{dailyData.filter(d => d.status === 'Present').length}</div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-[2rem] border-slate-100 bg-amber-50/20 flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lateness Detected</div>
                        <div className="text-2xl font-black text-slate-900">{dailyData.filter(d => d.status === 'Late').length}</div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-[2rem] border-slate-100 bg-rose-50/20 flex items-center gap-4">
                    <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-700">
                        <UserX className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Absences Recorded</div>
                        <div className="text-2xl font-black text-slate-900">{dailyData.filter(d => d.status === 'Absent').length}</div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-[2rem] border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                        %
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Punctuality Score</div>
                        <div className="text-2xl font-black text-slate-900">
                            {dailyData.length > 0 ? Math.round(((dailyData.filter(d => d.status === 'Present').length) / (employees.length || 1)) * 100) : 0}%
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden border-none bg-white/40">
                <table className="w-full border-separate border-spacing-y-2 px-4 py-6">
                    <thead>
                        <tr className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                            <th className="px-6 py-4 text-left">Team Member</th>
                            <th className="px-6 py-4 text-left">Login</th>
                            <th className="px-6 py-4 text-left">Logout</th>
                            <th className="px-6 py-4 text-left">Utility</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-600 font-bold uppercase tracking-widest">Decrypting attendance data...</td>
                            </tr>
                        ) : dailyData.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-300 font-black text-3xl opacity-20 uppercase">No Data Captured</td>
                            </tr>
                        ) : dailyData.map(record => {
                            const emp = employees.find(e => e.employeeId === record.employeeId);
                            return (
                                <tr key={record._id} className="bg-white/40 hover:bg-white/60 transition-all rounded-xl shadow-sm">
                                    <td className="px-6 py-4 rounded-l-xl">
                                        <span className="text-slate-900 font-bold">{emp?.name || record.employeeId}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                        {record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                                        {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-black font-black text-sm">
                                            {record.workedHours ? `${record.workedHours.toFixed(1)}h` : '--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center rounded-r-xl">
                                        {getStatusBadge(record.status)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AttendanceSummary;
