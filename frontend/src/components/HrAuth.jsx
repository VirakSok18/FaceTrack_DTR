import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight, ShieldCheck, Sparkles, Building2, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const GOOGLE_CLIENT_ID = '583980575924-q4ellmg3de7hibrhpo04alpr4rf2nm2b.apps.googleusercontent.com';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function HrAuth({ onAuthenticated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProviderGuide, setShowProviderGuide] = useState(false);

  // Initialize Google Identity Services (GIS) on mount
  useEffect(() => {
    const initGoogleGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
              if (!response?.credential) return;
              setLoading(true);
              setError(null);
              try {
                const payload = decodeJwt(response.credential);
                const userEmail = payload?.email?.toLowerCase();
                if (!userEmail) throw new Error('Could not extract email from Google identity.');

                // Attempt Supabase session sync with ID Token
                try {
                  await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.credential,
                  });
                } catch (sbErr) {
                  console.warn('[Google Auth] Supabase ID token sync notice:', sbErr);
                }

                onAuthenticated({
                  email: userEmail,
                  user: {
                    email: userEmail,
                    user_metadata: {
                      full_name: payload.name || 'Google User',
                      avatar_url: payload.picture,
                    },
                  },
                });
              } catch (err) {
                setError(err.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render Google button into container if present
          const btnContainer = document.getElementById('google-btn-container');
          if (btnContainer) {
            window.google.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              width: 340,
              shape: 'pill',
              text: 'continue_with',
            });
          }
        } catch (e) {
          console.warn('[Google Auth] GSI init warning:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogleGsi();
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [onAuthenticated]);

  // Primary Google Sign-In Trigger
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setShowProviderGuide(false);

    // 1. Try Google Identity Services Popup first
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('[Google Auth] Prompt not displayed, trying OAuth redirect fallback');
            triggerSupabaseOAuth();
          }
        });
        // Set timeout to avoid hanging if prompt is dismissed silently
        setTimeout(() => {
          setLoading(false);
        }, 2500);
        return;
      } catch (e) {
        console.warn('[Google Auth] Prompt failed:', e);
      }
    }

    // 2. Fallback to Supabase OAuth redirect
    await triggerSupabaseOAuth();
  };

  const triggerSupabaseOAuth = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (oauthError) {
        if (
          oauthError.message?.includes('provider is not enabled') ||
          oauthError.message?.includes('validation_failed')
        ) {
          setShowProviderGuide(true);
          throw new Error('Google OAuth provider is currently disabled in your Supabase project.');
        }
        throw oauthError;
      }
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-black selection:text-white">
      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-neutral-100/80">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white p-4 transition-transform hover:scale-105">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            FaceTrack (DTR)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1.5 max-w-xs">
            Touchless Biometric Attendance & HR Administration Portal
          </p>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              {showProviderGuide && (
                <div className="mt-2 text-[11px] text-red-600/90 space-y-1">
                  <p>To enable Google sign-in in Supabase:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Open your Supabase Dashboard</li>
                    <li>Go to <b>Authentication &gt; Providers</b></li>
                    <li>Toggle <b>Google</b> to <b>Enabled</b> and save</li>
                  </ol>
                  <a
                    href="https://supabase.com/dashboard/project/movymmlayggqzjtunlfk/auth/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 font-bold underline hover:text-black"
                  >
                    <span>Open Supabase Auth Providers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OAuth Authentication Area */}
        <div className="space-y-4">
          {/* Custom Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full group flex items-center justify-center gap-3 bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-sm disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
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
                </div>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Hidden/Fallback Google GSI native container */}
          <div id="google-btn-container" className="flex justify-center empty:hidden" />
        </div>

        {/* Feature Badges */}
        <div className="mt-8 pt-6 border-t border-neutral-100 space-y-3">
          <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
            <Sparkles className="w-4 h-4 text-black shrink-0" />
            <span>Instant sign-in — No passwords to remember</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-black shrink-0" />
            <span>Verified single sign-on (SSO) via Google</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-neutral-600 font-medium">
            <Building2 className="w-4 h-4 text-black shrink-0" />
            <span>Auto-syncs up to 3 office biometric kiosks</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-neutral-400 hover:text-black font-bold transition-colors inline-flex items-center gap-1.5"
          >
            ← Back to FaceTrack Overview
          </button>
        </div>
      </div>
    </div>
  );
}
