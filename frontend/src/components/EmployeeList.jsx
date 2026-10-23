import React, { useState } from 'react';
import { getFileUrl } from '../lib/api';
import { MoreVertical, Trash2, Eye, Clock, User, Phone, Calendar, Search, Loader2 } from 'lucide-react';

function EmployeeList({ employees, statuses, onSelectEmployee, onDeleteEmployee }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteEmployee(id);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeId && emp.employeeId.includes(searchTerm))
  );

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-medium text-slate-800">No employees found</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Get started by adding your first employee to the system using the "Add Employee" button above.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative group max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by name or ID..."
            className="input-field pl-12 shadow-sm border-slate-300 focus:border-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
              <th className="px-6 py-4 text-left font-bold">Employee</th>
              <th className="px-6 py-4 text-left font-bold">Role & ID</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-right font-bold">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-medium">
                  No matches found in the directory.
                </td>
              </tr>
            ) : filteredEmployees.map(emp => (
              <tr
                key={emp._id}
                className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer"
                onClick={() => onSelectEmployee(emp)}
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={getFileUrl(emp.photo) || 'https://via.placeholder.com/150'}
                        alt={emp.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md transition-transform group-hover:scale-105"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${statuses[emp._id] === 'Clocked In' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'
                        }`}></div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{emp.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3" /> {emp.phone}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">{emp.role}</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md mt-1 w-fit uppercase tracking-tighter shadow-sm border border-slate-200">
                      ID: {emp.employeeId}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`badge ${statuses[emp._id] === 'Clocked In'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : statuses[emp._id] === 'Late'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : statuses[emp._id] === 'Absent'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statuses[emp._id] === 'Clocked In' ? 'bg-white' :
                      statuses[emp._id] === 'Late' ? 'bg-amber-500' :
                        statuses[emp._id] === 'Absent' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}></span>
                    {statuses[emp._id] || 'Off Duty'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                      onClick={(e) => { e.stopPropagation(); onSelectEmployee(emp); }}
                      title="Inspect Profile"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      className={`p-2 rounded-xl transition-all ${deletingId === emp._id ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
                      onClick={(e) => handleDeleteClick(e, emp._id)}
                      disabled={deletingId === emp._id}
                      title="Decommission Access"
                    >
                      {deletingId === emp._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeList;