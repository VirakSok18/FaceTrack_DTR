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
            {label && <label className="text-xs font-bold text-slate-900 uppercase tracking-widest ml-1 mb-1.5 block">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="input-field flex items-center justify-between group hover:border-slate-400 transition-all shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    <span className="text-lg font-bold text-slate-900">{selectedHour}:{selectedMinute}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-fade-in origin-top">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Hours Column */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 pb-1">Hours</div>
                            <div className="h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {hours.map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={() => {
                                            setSelectedHour(h);
                                            handleTimeChange(h, selectedMinute);
                                        }}
                                        className={`w-full py-1.5 rounded-lg text-sm font-bold transition-all mb-1 ${selectedHour === h ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minutes Column */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 pb-1">Minutes</div>
                            <div className="h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {minutes.map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                            setSelectedMinute(m);
                                            handleTimeChange(selectedHour, m);
                                        }}
                                        className={`w-full py-1.5 rounded-lg text-sm font-bold transition-all mb-1 ${selectedMinute === m ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-black text-slate-900 uppercase hover:text-slate-600 transition-colors"
                        >
                            Set Time
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimePicker;
