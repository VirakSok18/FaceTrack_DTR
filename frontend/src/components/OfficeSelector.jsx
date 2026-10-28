import React from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';

export default function OfficeSelector({ offices, selectedOffice, onSelectOffice, onAddNewOffice, maxOffices = 3 }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200/80 rounded-2xl transition-all border border-neutral-200/80 shadow-sm"
      >
        <div className="w-6 h-6 bg-black rounded-xl flex items-center justify-center text-white text-xs">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-black leading-tight">
            {selectedOffice ? selectedOffice.name : 'Select Office'}
          </div>
          <div className="text-[10px] font-semibold text-neutral-500 leading-none">
            {selectedOffice ? selectedOffice.code : `${offices?.length || 0}/${maxOffices} Offices`}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-white border border-neutral-200 rounded-3xl shadow-2xl z-50 p-2.5 animate-fade-in">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Your Offices</span>
              <span className="font-mono">{offices?.length || 0}/{maxOffices}</span>
            </div>
            <div className="space-y-1 mt-1 max-h-56 overflow-y-auto">
              {(offices || []).map((office) => {
                const isSelected = selectedOffice && selectedOffice.id === office.id;
                return (
                  <button
                    key={office.id}
                    onClick={() => {
                      onSelectOffice(office);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-colors ${
                      isSelected ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{office.name}</div>
                      <div className={`text-[10px] font-mono ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {office.code}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* Add New Office Action */}
            {onAddNewOffice && (offices?.length || 0) < maxOffices && (
              <div className="pt-2 mt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNewOffice();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-black hover:bg-neutral-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Office</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
