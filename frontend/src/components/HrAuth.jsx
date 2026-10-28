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

  // 0. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || 'Google sign in failed. Please try again.');
      setLoading(false);
    }
  };

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
        <div className="grid grid-cols-2 p-1.5 bg-neutral-100 rounded-full mb-6 border border-neutral-200/70">
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

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-6 flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-800 font-bold py-3 px-6 rounded-full border border-neutral-300 shadow-sm hover:shadow transition-all duration-200 text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 absolute">
            or continue with email
          </span>
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
