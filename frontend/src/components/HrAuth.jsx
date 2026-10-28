import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, KeyRound, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function HrAuth({ onAuthenticated, onSelectRoom }) {
  const [mode, setMode] = useState('password'); // 'password' | 'code' | 'token'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomToken, setRoomToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sign In with Email & Password
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your account email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      onAuthenticated({
        email: email.trim().toLowerCase(),
        user: data.user,
      });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Send Email OTP Code
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Relay endpoint or Supabase
      const res = await fetch('https://melo-pi-one.vercel.app/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-otp',
          email: email.trim().toLowerCase(),
        }),
      });

      if (res.ok) {
        setOtpSent(true);
      } else {
        // Fallback: Supabase native OTP
        await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
        setOtpSent(true);
      }
    } catch (err) {
      setError('Failed to send code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Check signup_otps table
      const { data: rows, error: qErr } = await supabase
        .from('signup_otps')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('code', otpCode.trim())
        .eq('is_used', false)
        .order('expires_at', { ascending: false })
        .limit(1);

      if (!qErr && rows && rows.length > 0) {
        await supabase
          .from('signup_otps')
          .update({ is_used: true })
          .eq('id', rows[0].id);

        onAuthenticated({
          email: email.trim().toLowerCase(),
        });
        return;
      }

      // Fallback Supabase native verify
      const { data, error: vErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'magiclink',
      });

      if (vErr) throw vErr;

      onAuthenticated({
        email: email.trim().toLowerCase(),
        user: data.user,
      });
    } catch (err) {
      setError('Invalid or expired verification code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Direct Room Token Access (One-time link access)
  const handleTokenAccess = async (e) => {
    e.preventDefault();
    if (!roomCode) {
      setError('Please enter an Office Code (e.g., DTR-7B2K).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: room, error: rErr } = await supabase
        .from('dtr_workplaces')
        .select('*')
        .eq('code', roomCode.trim().toUpperCase())
        .maybeSingle();

      if (rErr || !room) {
        throw new Error('Office code not found. Please verify the code.');
      }

      onSelectRoom(room);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {/* App Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">HR Web Portal</h2>
          <p className="text-slate-400 text-sm mt-1">Daily Time Record & Live Operational Monitor</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1.5 rounded-2xl mb-6 border border-slate-700/60">
          <button
            type="button"
            onClick={() => { setMode('password'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'password' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('code'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'code' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Code
          </button>
          <button
            type="button"
            onClick={() => { setMode('token'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'token' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Office Key
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* 1. Password Mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.com"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In to Dashboard <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* 2. Email OTP Mode */}
        {mode === 'code' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  disabled={otpSent}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.com"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
              </button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & Access <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Change Email
                </button>
              </form>
            )}
          </div>
        )}

        {/* 3. Direct Room Code / Link Access */}
        {mode === 'token' && (
          <form onSubmit={handleTokenAccess} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Office / Room Code
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="e.g. DTR-7B2K"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono text-sm uppercase focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Enter the Office Code generated when creating the room in the Mobile App to access this kiosk's personnel registry and live attendance.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Access Office <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
