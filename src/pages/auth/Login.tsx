import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Smartphone, KeyRound, Loader2, ArrowLeft, AlertCircle, Key, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { verifyTotpCode } from '../../utils/mfaUtils';
import { auth } from '../../lib/firebase';
import { RecaptchaVerifier } from 'firebase/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    mfaRequired,
    mfaHint,
    mfaResolver,
    completeMfaSignIn,
    sendSmsMfaCode,
    clearMfaState,
    redeemRecoveryCode,
    signOut,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaAuthMode, setMfaAuthMode] = useState<'totp' | 'recovery'>('totp');
  const [mfaRecoveryInput, setMfaRecoveryInput] = useState('');
  const [verificationId, setVerificationId] = useState('');

  // Handle SMS sending when MFA is required and hint is SMS
  useEffect(() => {
    if (mfaRequired && mfaResolver && mfaHint?.factorId === 'phone' && !verificationId) {
      const sendSms = async () => {
        try {
          const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
          const vid = await sendSmsMfaCode(0, recaptcha);
          setVerificationId(vid);
        } catch (err) {
          console.error('Failed to send SMS code:', err);
          setErrorMsg('Failed to send SMS code. Please try again.');
        }
      };
      sendSms();
    }
  }, [mfaRequired, mfaResolver, mfaHint, sendSmsMfaCode, verificationId]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Automatically navigate when user/userProfile becomes active and MFA is satisfied
  useEffect(() => {
    if (user && userProfile && !authLoading && !mfaRequired) {
      if (userProfile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, userProfile, authLoading, mfaRequired, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential') ||
        msg.includes('invalid-login-credentials')
      ) {
        setErrorMsg('Invalid email or password. Please verify your credentials or contact your program administrator if your account has not been set up.');
      } else if (msg.includes('Database is closing') || msg.includes('closing/hidden')) {
        setErrorMsg('Database session was refreshed. Please click Sign In again to proceed.');
      } else {
        setErrorMsg(msg);
      }
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      if (mfaAuthMode === 'recovery') {
        if (!mfaRecoveryInput.trim()) {
          setErrorMsg('Please enter a valid backup recovery code.');
          setSubmitting(false);
          return;
        }
        const redeemed = await redeemRecoveryCode(mfaRecoveryInput.trim());
        if (!redeemed) {
          setErrorMsg('Invalid or previously used recovery code. Check your backup codes.');
          setSubmitting(false);
          return;
        }
        clearMfaState();
        setSubmitting(false);
        const targetRoute = userProfile?.role === 'admin' ? '/admin' : '/dashboard';
        navigate(targetRoute, { replace: true });
      } else {
        if (mfaCode.length !== 6) {
          setErrorMsg('Please enter a 6-digit verification code.');
          setSubmitting(false);
          return;
        }

        if (userProfile?.mfaSecretKey) {
          const isValid = verifyTotpCode(userProfile.mfaSecretKey, mfaCode);
          if (!isValid) {
            setErrorMsg('Invalid code. Please check your authenticator app time and try again.');
            setSubmitting(false);
            return;
          }
          clearMfaState();
          setSubmitting(false);
          const targetRoute = userProfile?.role === 'admin' ? '/admin' : '/dashboard';
          navigate(targetRoute, { replace: true });
        } else if (mfaResolver) {
          await completeMfaSignIn(mfaCode, verificationId);
          setSubmitting(false);
          const targetRoute = userProfile?.role === 'admin' ? '/admin' : '/dashboard';
          navigate(targetRoute, { replace: true });
        } else {
          clearMfaState();
          setSubmitting(false);
          const targetRoute = userProfile?.role === 'admin' ? '/admin' : '/dashboard';
          navigate(targetRoute, { replace: true });
        }
      }
    } catch (err: unknown) {
      console.error('MFA verification error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to verify MFA code.';
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      setSubmitting(false);
      // Navigation is handled automatically by the useEffect above
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  const isFormLoading = submitting || authLoading;

  // Seamless transition: If verifying credentials and awaiting profile or MFA decision, show smooth loader
  if (((isFormLoading && !errorMsg) || (user && !userProfile)) && !mfaRequired) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6 text-center text-xs border border-slate-200 animate-fade-in">
          <div className="p-3.5 bg-[#EDF7FC] text-[#0089B3] rounded-2xl w-14 h-14 flex items-center justify-center mx-auto shadow-inner">
            <Loader2 className="w-7 h-7 animate-spin text-[#0089B3]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Verifying Security & Profile
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Authenticating credentials and checking two-factor verification status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6 text-xs border border-slate-200 animate-fade-in">
          <button
            type="button"
            onClick={async () => {
              clearMfaState();
              await signOut();
            }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>

          <div className="text-center space-y-2">
            <div className="p-3 bg-[#EDF7FC] text-[#0089B3] rounded-2xl w-12 h-12 flex items-center justify-center mx-auto border border-[#0089B3]/20">
              <Smartphone className="w-6 h-6 text-[#0089B3]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Two-Factor Security Verification
            </h1>
            <p className="text-slate-500 text-xs leading-relaxed">
              Your account is protected by mandatory 2FA. Verify with your authenticator app or backup recovery code.
            </p>
          </div>

          {/* MFA Verification Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMfaAuthMode('totp');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                mfaAuthMode === 'totp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Authenticator Code
            </button>
            <button
              type="button"
              onClick={() => {
                setMfaAuthMode('recovery');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                mfaAuthMode === 'recovery' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Use Recovery Code
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div id="recaptcha-container" className="hidden"></div>
            {mfaAuthMode === 'totp' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {mfaHint?.factorId === 'phone' ? `SMS Code sent to ${(mfaHint as any)?.phoneNumber || 'your phone'}` : '6-Digit Authenticator Security Code'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 584910"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-center text-lg font-mono tracking-widest border border-slate-300 rounded-xl font-bold focus:outline-hidden focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] bg-slate-50"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Single-Use Recovery Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={mfaRecoveryInput}
                    onChange={(e) => setMfaRecoveryInput(e.target.value)}
                    placeholder="e.g. A3X8-9B2K"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-center text-base font-mono tracking-wider border border-slate-300 rounded-xl font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3] bg-slate-50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter one of your 8-character single-use recovery codes generated during 2FA setup.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isFormLoading ||
                (mfaAuthMode === 'totp' ? mfaCode.length !== 6 : !mfaRecoveryInput.trim())
              }
              className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl shadow-md shadow-[#0089B3]/25 text-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isFormLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-400">
            Having trouble? Contact support at{' '}
            <a href="mailto:support@smallmoves.org" className="text-[#0089B3] font-bold hover:underline">
              support@smallmoves.org
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6 text-xs border border-slate-200">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 bg-[#EDF7FC] text-[#0089B3] border border-[#0089B3]/20 px-3.5 py-1.5 rounded-full font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0089B3]" />
            <span className="text-[11px] tracking-wide uppercase font-bold">Small Moves Emergency Fund</span>
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Sign In to PEF Portal
          </h1>
          <p className="text-slate-500 leading-relaxed text-xs">
            Access relief funds, manage emergency requests, and track school allocations.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 text-[11.5px] leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isFormLoading}
          className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-white px-3 text-slate-400">Or sign in with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3]"
                placeholder="name@school.org"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] font-bold text-[#0089B3] hover:text-[#007399] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isFormLoading}
            className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl shadow-md shadow-[#0089B3]/25 text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isFormLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

