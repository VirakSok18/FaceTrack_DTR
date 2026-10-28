import React from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';

export default function OfficeSelector({ offices, selectedOffice, onSelectOffice, maxOffices = 3 }) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!offices || offices.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200"
      >
        <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-900 leading-tight">
            {selectedOffice ? selectedOffice.name : 'Select Office'}
          </div>
          <div className="text-[10px] font-semibold text-slate-500 leading-none">
            {selectedOffice ? selectedOffice.code : `${offices.length}/${maxOffices} Offices`}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Your Offices ({offices.length}/{maxOffices})
            </div>
            <div className="space-y-1 mt-1">
              {offices.map((office) => {
                const isSelected = selectedOffice && selectedOffice.id === office.id;
                return (
                  <button
                    key={office.id}
                    onClick={() => {
                      onSelectOffice(office);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{office.name}</div>
                      <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {office.code}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
