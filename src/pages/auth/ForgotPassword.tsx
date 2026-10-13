import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6 text-xs border border-slate-200">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 bg-[#EDF7FC] text-[#0089B3] border border-[#0089B3]/20 px-3.5 py-1.5 rounded-full font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0089B3]" />
            <span className="text-[11px] tracking-wide uppercase font-bold">Small Moves Emergency Fund</span>
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Reset Password
          </h1>
          <p className="text-slate-500 leading-relaxed text-xs">
            Enter your registered school or administrative email address to receive password reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="p-5 bg-[#EDF7FC] border border-[#0089B3]/20 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#0089B3] mx-auto" />
            <div>
              <p className="font-bold text-[#0F172A] text-sm">Reset Link Sent!</p>
              <p className="text-slate-600 text-xs mt-1">
                If an account exists for <strong className="text-[#0F172A]">{email}</strong>, a secure reset link has been dispatched to your inbox.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block px-5 py-2 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="principal@school.org"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0089B3] focus:border-[#0089B3]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0089B3] hover:bg-[#007399] text-white font-bold rounded-xl shadow-md shadow-[#0089B3]/20 text-xs transition-all cursor-pointer"
            >
              Send Reset Link
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-[#0089B3] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
