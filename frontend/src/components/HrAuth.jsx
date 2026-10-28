import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Loader2, User, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';

// RFC 5322 Compliant Email Validation Regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function HrAuth({ onAuthenticated }) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 1. Password Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please provide your account email and password.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. manager@company.com).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      onAuthenticated({
        email: cleanEmail,
        user: data.user,
      });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Password Sign Up (Account Registration)
  const handleSignUp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const sanitizedName = fullName.replace(/[<>]/g, '').trim().slice(0, 60);

    if (!cleanEmail || !password) {
      setError('Please provide your email and a secure password.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password.length > 128) {
      setError('Password cannot exceed 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: sanitizedName || 'HR Manager',
          },
        },
      });

      if (signUpErr) throw signUpErr;

      if (data.session) {
        onAuthenticated({
          email: cleanEmail,
          user: data.user,
        });
      } else {
        setSuccess('Account created! Please sign in with your credentials.');
        setAuthMode('signin');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-black selection:text-white">
      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-neutral-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-neutral-100">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-md mb-4 text-white p-3.5 transition-transform hover:scale-105">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            FaceTrack (DTR)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
            Biometric Attendance & HR Administration
          </p>
        </div>

        {/* Primary Toggle: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1.5 bg-neutral-100 rounded-full mb-8 border border-neutral-200/70">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setError(null);
              setSuccess(null);
            }}
            className={`py-2.5 text-xs font-bold rounded-full transition-all ${
              authMode === 'signin'
                ? 'bg-black text-white shadow-md'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
              setSuccess(null);
            }}
            className={`py-2.5 text-xs font-bold rounded-full transition-all ${
              authMode === 'signup'
                ? 'bg-black text-white shadow-md'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-black text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {authMode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.com"
                  autoComplete="email"
                  maxLength={254}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  maxLength={128}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-11 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-neutral-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-full shadow-md hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* CREATE ACCOUNT FORM */
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Full Name / Organization
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  autoComplete="name"
                  maxLength={60}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@company.com"
                  autoComplete="email"
                  maxLength={254}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  maxLength={128}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-11 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-neutral-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  maxLength={128}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-black text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black focus:bg-white transition-all placeholder:text-neutral-400 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-full shadow-md hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Return to Home Link */}
        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-neutral-500 hover:text-black font-bold transition-colors inline-flex items-center gap-1.5"
          >
            ← Back to FaceTrack Overview
          </button>
        </div>
      </div>
    </div>
  );
}
