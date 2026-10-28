import React, { useState } from 'react';
import { Trash2, Eye, User, Phone, Search, Loader2 } from 'lucide-react';
import StaffAvatar from './StaffAvatar';

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

  const filteredEmployees = (employees || []).filter(emp =>
    (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatus = (emp) => {
    return statuses[emp._id] || statuses[emp.id] || statuses[emp.employeeId] || 'Not Scanned Yet';
  };

  if (!employees || employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4 text-neutral-400">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-black tracking-tight">No Employees in this Office</h3>
        <p className="text-neutral-500 mt-2 max-w-sm text-xs font-medium leading-relaxed">
          Get started by adding your first employee to this office using the "Add Staff" button above.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative group max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-black transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by staff name or ID..."
            maxLength={60}
            className="w-full bg-neutral-50 border border-neutral-200/90 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-semibold text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-neutral-400 text-[11px] font-bold uppercase tracking-wider border-b border-neutral-100">
              <th className="px-6 py-3.5 text-left font-bold">Staff Member</th>
              <th className="px-6 py-3.5 text-left font-bold">Role & ID</th>
              <th className="px-6 py-3.5 text-left font-bold">Today's Shift Status</th>
              <th className="px-6 py-3.5 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-neutral-400 text-xs font-medium">
                  No matching staff members found.
                </td>
              </tr>
            ) : filteredEmployees.map(emp => {
              const currentStatus = getStatus(emp);

              return (
                <tr
                  key={emp._id || emp.id}
                  className="group hover:bg-neutral-50/80 transition-all duration-200 cursor-pointer"
                  onClick={() => onSelectEmployee(emp)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative shrink-0">
                        <StaffAvatar photo={emp.photo} name={emp.name} size="md" />
                        <div
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
                            currentStatus === 'Present'
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : currentStatus === 'Late'
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : currentStatus === 'Absent'
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                              : currentStatus === 'Not Scanned Yet'
                              ? 'bg-neutral-400'
                              : 'bg-neutral-300'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-black text-sm group-hover:text-neutral-700 transition-colors">
                          {emp.name}
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1 font-medium mt-0.5">
                          <Phone className="w-3 h-3 text-neutral-400" /> {emp.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-neutral-800">{emp.role}</span>
                      <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded-full mt-1 w-fit border border-neutral-200/80">
                        ID: {emp.employeeId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                        currentStatus === 'Present'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : currentStatus === 'Late'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : currentStatus === 'Absent'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : currentStatus === 'Not Scanned Yet'
                          ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentStatus === 'Present'
                            ? 'bg-emerald-500'
                            : currentStatus === 'Late'
                            ? 'bg-amber-500'
                            : currentStatus === 'Absent'
                            ? 'bg-rose-500'
                            : currentStatus === 'Not Scanned Yet'
                            ? 'bg-neutral-500'
                            : 'bg-neutral-300'
                        }`}
                      />
                      {currentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="p-2 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-full transition-all"
                        onClick={(e) => { e.stopPropagation(); onSelectEmployee(emp); }}
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className={`p-2 rounded-full transition-all ${
                          deletingId === (emp._id || emp.id)
                            ? 'text-neutral-400 cursor-not-allowed'
                            : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        onClick={(e) => handleDeleteClick(e, emp._id || emp.id)}
                        disabled={deletingId === (emp._id || emp.id)}
                        title="Remove Staff"
                      >
                        {deletingId === (emp._id || emp.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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

export default EmployeeList;
