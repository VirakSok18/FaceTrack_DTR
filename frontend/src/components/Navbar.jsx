import React, { useState, useRef, useEffect } from 'react';
import { Download, LayoutDashboard, LogOut, User, ChevronDown, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ auth, onSignOut }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = auth?.email ? auth.email.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-slate-950 tracking-tight">FaceTrack</span>
                <span className="text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-900 px-2 py-0.5 rounded-lg border border-slate-200">
                  DTR
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Facial Attendance & Registry
              </p>
            </div>
          </div>

          {/* Right Actions: Get App + Auth Dropdown */}
          <div className="flex items-center gap-3">
            {/* Get App / Download APK Button */}
            <a
              href="/facetrack.apk"
              download="facetrack.apk"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-full text-xs font-bold transition-all border border-slate-200 shadow-sm hover:shadow"
            >
              <Download className="w-3.5 h-3.5 text-slate-900" />
              <span>Get App</span>
            </a>

            {/* If NOT signed in: Sign In button */}
            {!auth ? (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md hover:shadow-lg"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              /* If user IS signed in: Avatar with Dropdown (Dashboard + Sign Out) */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-3 bg-white hover:bg-slate-50 rounded-full border border-slate-200 shadow-sm transition-all focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center text-xs font-black shadow-inner">
                    {userInitial}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu (Dashboard & Sign Out) */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 p-2 animate-fade-in divide-y divide-slate-100">
                    <div className="px-3 py-2 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Signed In As
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {auth.email || (auth.isTokenGuest ? `Office Key (${auth.roomCode})` : 'Manager')}
                      </div>
                    </div>

                    <div className="py-1">
                      {/* 1. Dashboard */}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-colors ${
                          location.pathname === '/dashboard'
                            ? 'bg-slate-100 text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-900" />
                        <span>Dashboard</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      {/* 2. Sign Out */}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
