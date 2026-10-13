import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Copy, Check, ShieldCheck, AlertCircle, Loader2, X, Key, Download, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateTotpSetupData, verifyTotpCode } from '../../utils/mfaUtils';

interface MfaSetupModalProps {
  isOpen: boolean;
  isMandatory?: boolean;
  onClose: () => void;
  onSuccess?: (secretKey?: string, recoveryCodes?: string[]) => void;
}

export const MfaSetupModal: React.FC<MfaSetupModalProps> = ({
  isOpen,
  isMandatory = false,
  onClose,
  onSuccess,
}) => {
  const { userProfile, enableMfaWithCredentials } = useAuth();

  const [step, setStep] = useState<1 | 2>(1); // 1: QR & Verify, 2: Real Recovery Codes
  const [loading, setLoading] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      initSetup();
    } else {
      // Reset state on close
      setStep(1);
      setSecretKey('');
      setQrCodeUrl('');
      setRecoveryCodes([]);
      setVerificationCode('');
      setErrorMsg(null);
      setCopiedKey(false);
      setCopiedCodes(false);
      setVerifying(false);
    }
  }, [isOpen]);

  const initSetup = () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const email = userProfile?.email || 'user@smallmoves.org';
      const setupData = generateTotpSetupData(email);
      setSecretKey(setupData.secretKey);
      setQrCodeUrl(setupData.qrCodeUrl);
      setRecoveryCodes(setupData.recoveryCodes);
    } catch (err: unknown) {
      console.error('MFA setup error:', err);
      setErrorMsg('Unable to generate TOTP secret key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    const text = `PEF PORTAL MFA RECOVERY CODES\nAccount: ${userProfile?.email}\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\nKeep these backup codes in a secure location. Each code can be used once.`;
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    const content = `PEF PORTAL MFA RECOVERY CODES\nAccount: ${userProfile?.email}\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\nKeep these backup codes in a secure location. Each code can be used once to access your account.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pef-mfa-recovery-codes-${userProfile?.email || 'user'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setErrorMsg('Please enter a 6-digit security code from your authenticator app.');
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    // Verify using real RFC 6238 TOTP algorithm
    const isValid = verifyTotpCode(secretKey, verificationCode);

    if (!isValid) {
      setErrorMsg('Invalid code. Ensure your device time is synchronized and enter the current 6-digit code from Google Authenticator.');
      setVerifying(false);
      return;
    }

    // Success! Move to Step 2: Save and display real Recovery Codes
    setVerifying(false);
    setStep(2);
  };

  const handleCompleteSetup = async () => {
    try {
      if (enableMfaWithCredentials && secretKey && recoveryCodes.length > 0) {
        await enableMfaWithCredentials(secretKey, recoveryCodes);
      }
    } catch (err) {
      console.error('Error enabling MFA with credentials:', err);
    }
    if (onSuccess) {
      onSuccess(secretKey, recoveryCodes);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-5 text-xs relative border border-slate-200">
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
            <Smartphone className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {step === 1 ? 'Set Up Mandatory Two-Factor Authentication' : 'Save Backup Recovery Codes'}
              </h2>
              {isMandatory && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] uppercase rounded-full border border-rose-200">
                  Required
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[11px]">
              {step === 1
                ? 'Scan the QR code in Google Authenticator to pair your device'
                : 'Save these 10 single-use codes to access your account if you lose your phone'}
            </p>
          </div>
        </div>

        {isMandatory && step === 1 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Security Policy Enforcement:</strong> Multi-Factor Authentication (2FA) is mandatory for all PEF portal user accounts. Complete setup to access the portal dashboard.
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="font-bold text-slate-600 text-xs">Generating Cryptographic 2FA Keys...</p>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Scan QR */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-[10px]">1</span>
                Scan QR Code in Google Authenticator or Authy
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                {qrCodeUrl ? (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 shadow-xs">
                    <QRCodeSVG value={qrCodeUrl} size={130} level="M" />
                  </div>
                ) : null}

                <div className="space-y-2 text-slate-600 text-[11px] flex-1">
                  <p>Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>1Password</strong> on your smartphone and scan the code.</p>
                  <p className="text-slate-400">Or manually enter key in your app:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 text-slate-900 font-mono text-[11px] px-2 py-1 rounded border border-slate-300 font-bold select-all tracking-wider break-all">
                      {secretKey}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all shrink-0 cursor-pointer"
                      title="Copy Secret Key"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Real Verification Code */}
            <form onSubmit={handleVerify} className="space-y-3 pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-slate-900 text-white rounded-full inline-flex items-center justify-center text-[10px]">2</span>
                  Enter 6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 584910"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 text-center text-xl tracking-widest font-mono border-2 border-slate-300 focus:border-emerald-500 rounded-xl focus:outline-none bg-slate-50 font-bold"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {!isMandatory && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={verifying || verificationCode.length !== 6}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying TOTP Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 2: Real Recovery Codes Screen */
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>2FA Verification Successful!</strong> Below are your 10 single-use emergency recovery codes. Store them in a secure password manager or print them out.
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-3 font-mono border border-slate-800">
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1 font-bold text-slate-300">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  MFA Recovery Codes (10 Remaining)
                </span>
                <span>Single-use each</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs tracking-wider">
                {recoveryCodes.map((code, index) => (
                  <div
                    key={index}
                    className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/60 font-bold text-emerald-300 select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-sans font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodes ? 'Copied Codes!' : 'Copy All Codes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-sans font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteSetup}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>I Have Saved My Recovery Codes — Complete 2FA Setup</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
