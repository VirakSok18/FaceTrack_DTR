import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const TimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Generate hours (00-23) and minutes (00, 15, 30, 45) for quick selection
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const [selectedHour, setSelectedHour] = useState(value?.split(':')[0] || '09');
  const [selectedMinute, setSelectedMinute] = useState(value?.split(':')[1] || '00');

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimeChange = (h, m) => {
    const newTime = `${h}:${m}`;
    onChange(newTime);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider ml-1 mb-1.5 block">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-2xl flex items-center justify-between group hover:border-black transition-all shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-neutral-400 group-hover:text-black transition-colors" />
          <span className="text-sm font-bold text-black">{selectedHour}:{selectedMinute}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-neutral-200 p-4 animate-fade-in origin-top">
          <div className="grid grid-cols-2 gap-4">
            {/* Hours Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center border-b border-neutral-100 pb-1">
                Hours
              </div>
              <div className="h-44 overflow-y-auto pr-1">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setSelectedHour(h);
                      handleTimeChange(h, selectedMinute);
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all mb-1 ${
                      selectedHour === h ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-center border-b border-neutral-100 pb-1">
                Minutes
              </div>
              <div className="h-44 overflow-y-auto pr-1">
                {minutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSelectedMinute(m);
                      handleTimeChange(selectedHour, m);
                    }}
                    className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all mb-1 ${
                      selectedMinute === m ? 'bg-black text-white' : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-black hover:bg-neutral-100 px-3 py-1.5 rounded-full"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
