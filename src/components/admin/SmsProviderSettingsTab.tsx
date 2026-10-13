import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  RotateCw,
  Search,
  Filter,
  Languages,
  Smartphone,
  Info,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanForFirestore } from '../../lib/firebase';
import { PortalSettings, SmsLogEntry } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { dispatchSms, fetchVonageConfigStatus, subscribeToSmsLogs, fetchSmsLogs, formatPhoneToE164 } from '../../services/smsService';
import { GCP_SUPPORTED_LANGUAGES } from '../../data/languages';

interface SmsProviderSettingsTabProps {
  settings: PortalSettings;
}

export const SmsProviderSettingsTab: React.FC<SmsProviderSettingsTabProps> = ({ settings }) => {
  const { user, userProfile } = useAuth();
  const [configStatus, setConfigStatus] = useState<{
    configured: boolean;
    applicationIdConfigured: boolean;
    privateKeyConfigured: boolean;
    fromNumber: string;
    authType: string;
    webhooks: { inbound: string; status: string };
  }>({
    configured: false,
    applicationIdConfigured: false,
    privateKeyConfigured: false,
    fromNumber: '18887190317',
    authType: 'JWT Application Authentication',
    webhooks: {
      inbound: 'https://smallmoves.org/api/sms/inbound',
      status: 'https://smallmoves.org/api/sms/status',
    },
  });

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Webhook URL Settings State (Allows custom base URL and presets like http://smallmoves.org/sms/inbound)
  const [webhookBaseDomain, setWebhookBaseDomain] = useState<string>('https://smallmoves.org');
  const [webhookPathStyle, setWebhookPathStyle] = useState<'short' | 'api'>('short'); // 'short' is /sms/inbound, 'api' is /api/sms/inbound

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Small Moves PEF: This is a test notification from the Principal Emergency Fund Portal via Vonage toll-free SMS.'
  );
  const [testLanguage, setTestLanguage] = useState('en');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Inbound Simulation State
  const [simInboundPhone, setSimInboundPhone] = useState('3125550199');
  const [simInboundText, setSimInboundText] = useState('YES, I confirm my payout details');
  const [isSimulatingInbound, setIsSimulatingInbound] = useState(false);
  const [simInboundResult, setSimInboundResult] = useState<string | null>(null);

  // Live SMS Logs
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'outbound' | 'inbound'>('all');

  const refreshConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const status = await fetchVonageConfigStatus();
      setConfigStatus(status);
    } catch (err) {
      console.warn('Failed to fetch Vonage configuration status:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleRefreshLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const logs = await fetchSmsLogs();
      setSmsLogs(logs);
    } catch (err) {
      console.warn('Failed to refresh SMS logs:', err);
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  useEffect(() => {
    refreshConfig();
    const unsubscribe = subscribeToSmsLogs((logs) => {
      setSmsLogs(logs);
    });
    return () => unsubscribe();
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid destination phone number.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    const langObj = GCP_SUPPORTED_LANGUAGES.find((l) => l.code === testLanguage);

    try {
      const result = await dispatchSms(
        {
          to: testPhone,
          text: testMessage,
          recipientName: userProfile?.displayName || 'Administrator',
          recipientRole: 'admin_test',
          targetLanguage: testLanguage !== 'en' ? testLanguage : undefined,
          targetLanguageName: langObj?.name,
          triggerEvent: 'test_sms_dispatched',
        },
        settings,
        userProfile?.email
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: `SMS dispatched successfully! Status: ${result.status.toUpperCase()} (UUID: ${result.messageUuid})`,
          details: result.isTranslated
            ? `Translated into ${result.targetLanguageName}: "${result.text}"`
            : result.details || `Sender: +${result.from} -> Destination: +${result.to}`,
        });
        // Immediately refresh logs
        handleRefreshLogs();
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to dispatch SMS via Vonage.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInboundPhone.trim() || !simInboundText.trim()) return;

    setIsSimulatingInbound(true);
    setSimInboundResult(null);

    const cleanSender = formatPhoneToE164(simInboundPhone);
    const now = new Date().toISOString();
    const simMessageUuid = `sim-in-${Date.now()}`;

    try {
      const resp = await fetch('/api/sms/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: cleanSender,
          to: configStatus.fromNumber,
          text: simInboundText,
          message_uuid: simMessageUuid,
          timestamp: now,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        setSimInboundResult(`Inbound SMS webhook processed successfully! Status: ${data.status || 'received'}.`);
      } else {
        setSimInboundResult(`Webhook responded with HTTP ${resp.status}`);
      }

      // Re-fetch all logs to sync server & database state
      await handleRefreshLogs();
    } catch (err: any) {
      setSimInboundResult(`Inbound webhook error: ${err.message}`);
    } finally {
      setIsSimulatingInbound(false);
    }
  };

  const filteredLogs = smsLogs.filter((log) => {
    if (directionFilter !== 'all' && log.direction !== directionFilter) return false;
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      log.to?.toLowerCase().includes(term) ||
      log.from?.toLowerCase().includes(term) ||
      log.recipientName?.toLowerCase().includes(term) ||
      log.text?.toLowerCase().includes(term) ||
      log.requestId?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in" id="sms-provider-settings-tab">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EDF7FC] text-[#0089B3] border border-[#0089B3]/30 flex items-center justify-center font-bold">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                VONAGE MESSAGES API SMS CONFIGURATION
              </h2>
              <p className="text-sm text-slate-500">
                Outbound and inbound SMS communications for beneficiaries and school contacts via toll-free number.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#006E8F] bg-[#EDF7FC] hover:bg-[#EDF7FC]/80 border border-[#0089B3]/30 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingConfig ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        {/* Integration Status Badges */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Linked Toll-Free Number
            </span>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#0089B3]" />
              <span className="font-mono font-bold text-slate-900">+{configStatus.fromNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#E2F7C2] text-[#2D5F00] font-semibold border border-[#6EBF00]/30">
                Active
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              API Connection Status
            </span>
            <div className="flex items-center gap-2">
              {configStatus.configured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#6EBF00]" />
                  <span className="font-semibold text-[#2D5F00] text-sm">Connected & Ready</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-700 text-sm">Simulated Mode Active</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Webhooks Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[#0089B3]" />
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              WEBHOOK ENDPOINTS &amp; ROUTING
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#E2F7C2] text-[#2D5F00] border border-[#6EBF00]/30 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Endpoints Live (GET / POST)
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Configure these URLs in your <strong>Vonage API Dashboard &gt; Applications &gt; Messages settings</strong>. The portal server supports both <code>/sms/*</code> and <code>/api/sms/*</code> paths over HTTP and HTTPS.
        </p>

        {/* URL Customization Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Domain / Base URL (Editable)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webhookBaseDomain}
                  onChange={(e) => setWebhookBaseDomain(e.target.value.trim())}
                  placeholder="https://smallmoves.org"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
                />
              </div>
            </div>

            <div className="w-full md:w-auto">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                URL Path Format
              </label>
              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWebhookPathStyle('short')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    webhookPathStyle === 'short'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  /sms/* (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setWebhookPathStyle('api')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    webhookPathStyle === 'api'
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  /api/sms/* (API Route)
                </button>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-500">Quick Presets:</span>
            <button
              type="button"
              onClick={() => {
                setWebhookBaseDomain('https://smallmoves.org');
                setWebhookPathStyle('short');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#EDF7FC] hover:text-[#006E8F] border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              https://smallmoves.org/sms/*
            </button>
            <button
              type="button"
              onClick={() => {
                setWebhookBaseDomain('http://smallmoves.org');
                setWebhookPathStyle('short');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#EDF7FC] hover:text-[#006E8F] border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              http://smallmoves.org/sms/*
            </button>
            <button
              type="button"
              onClick={() => {
                setWebhookBaseDomain('https://smallmoves.org');
                setWebhookPathStyle('api');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#EDF7FC] hover:text-[#006E8F] border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              https://smallmoves.org/api/sms/*
            </button>
            <button
              type="button"
              onClick={() => {
                setWebhookBaseDomain(window.location.origin);
                setWebhookPathStyle('short');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-[#EDF7FC] hover:text-[#006E8F] border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Current Dev Environment
            </button>
          </div>
        </div>

        {/* Calculated Webhook Cards */}
        {(() => {
          const cleanBase = (webhookBaseDomain || 'https://smallmoves.org').replace(/\/+$/, '');
          const inboundPath = webhookPathStyle === 'short' ? '/sms/inbound' : '/api/sms/inbound';
          const statusPath = webhookPathStyle === 'short' ? '/sms/status' : '/api/sms/status';
          const inboundUrl = `${cleanBase}${inboundPath}`;
          const statusUrl = `${cleanBase}${statusPath}`;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inbound Webhook */}
              <div className="p-4 rounded-xl bg-[#EDF7FC]/50 border border-[#0089B3]/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#006E8F] uppercase">Inbound Message URL (POST &amp; GET)</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={inboundPath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#0089B3] hover:text-[#006E8F] underline"
                      >
                        Verify
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(inboundUrl, 'inbound')}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0089B3] hover:text-[#006E8F] cursor-pointer"
                      >
                        {copiedKey === 'inbound' ? <Check className="w-3.5 h-3.5 text-[#6EBF00]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'inbound' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#0089B3]/30 font-mono text-xs text-slate-800 break-all select-all font-semibold">
                    {inboundUrl}
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Receives incoming SMS replies from beneficiaries. Automatically matches phone numbers and advances confirmed requests to <strong>Ready to Pay</strong>.
                </p>
              </div>

              {/* Status Webhook */}
              <div className="p-4 rounded-xl bg-[#EDF7FC]/50 border border-[#0089B3]/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#006E8F] uppercase">Status Callback URL (POST &amp; GET)</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={statusPath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#0089B3] hover:text-[#006E8F] underline"
                      >
                        Verify
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(statusUrl, 'status')}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0089B3] hover:text-[#006E8F] cursor-pointer"
                      >
                        {copiedKey === 'status' ? <Check className="w-3.5 h-3.5 text-[#6EBF00]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'status' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#0089B3]/30 font-mono text-xs text-slate-800 break-all select-all font-semibold">
                    {statusUrl}
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  Receives real-time carrier delivery receipts (<code>submitted</code>, <code>delivered</code>, <code>failed</code>) and updates audit timestamps.
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Feature Guide: What Happens When Beneficiaries Reply */}
      <div className="bg-[#0F172A] text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-[#A5E3F6]">
          <Info className="w-5 h-5" />
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            BENEFICIARY REPLY WORKFLOW &amp; AUTOMATED ACTIONS
          </h3>
        </div>
        <p className="text-sm text-slate-300">
          When a beneficiary sends an SMS reply to <strong>+{configStatus.fromNumber}</strong>, the system automatically executes the following automated pipeline:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-2">
            <div className="flex items-center gap-2 text-[#A5E3F6] font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-[#0089B3]/40 text-[#A5E3F6] flex items-center justify-center text-xs">1</span>
              Phone Number Matching
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The incoming sender phone number is converted to E.164 and matched against active emergency fund requests (checking both <code>payoutDetails.contactValue</code> and <code>directPhone</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-2">
            <div className="flex items-center gap-2 text-[#A5E3F6] font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-[#0089B3]/40 text-[#A5E3F6] flex items-center justify-center text-xs">2</span>
              Intent &amp; Auto-Advance
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If the message is a confirmation (e.g., <em>&quot;YES&quot;, &quot;CONFIRM&quot;, &quot;OK&quot;, &quot;SI&quot;, &quot;SÍ&quot;</em>) and the nomination is in <strong>Waiting on Beneficiary</strong>, the status automatically advances to <strong>Ready to Pay</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs space-y-2">
            <div className="flex items-center gap-2 text-[#A5E3F6] font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-[#0089B3]/40 text-[#A5E3F6] flex items-center justify-center text-xs">3</span>
              Timeline &amp; Audit Logs
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The message is logged to the request&apos;s internal timeline, recorded in the central <code>sms_logs</code> audit table, and an event is posted to <code>activity_logs</code> for administrator review.
            </p>
          </div>
        </div>
      </div>

      {/* Test SMS Dispatcher & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Test SMS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-[#0089B3]" />
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              SEND TEST OUTBOUND SMS
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Test sending an SMS from <strong>+{configStatus.fromNumber}</strong> to any mobile number with optional multilingual translation.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination Phone Number *</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="e.g. (312) 555-0199 or +13125550199"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Translation Language</label>
              <select
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
              >
                {GCP_SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} {lang.nativeName ? `(${lang.nativeName})` : ''} {lang.code === 'en' ? '— (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message Text *</label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0089B3] hover:bg-[#006E8F] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSendingTest ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSendingTest ? 'Dispatching via Vonage...' : 'Send Test SMS'}
            </button>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium ${
                  testResult.success ? 'bg-[#E2F7C2]/70 text-[#2D5F00] border border-[#6EBF00]/30' : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-[#6EBF00] shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.details && <p className="mt-1 text-slate-600 font-mono text-[11px]">{testResult.details}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inbound Simulator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-[#0089B3]" />
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              SIMULATE INBOUND SMS REPLY
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Simulate a beneficiary texting <strong>+{configStatus.fromNumber}</strong> to test webhook routing and automatic verification.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Beneficiary Mobile Number</label>
              <input
                type="text"
                value={simInboundPhone}
                onChange={(e) => setSimInboundPhone(e.target.value)}
                placeholder="e.g. 3125550199"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inbound Text Content</label>
              <input
                type="text"
                value={simInboundText}
                onChange={(e) => setSimInboundText(e.target.value)}
                placeholder='e.g. "YES" or "CONFIRM"'
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-none"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <Info className="w-3.5 h-3.5 text-[#0089B3]" />
                <span>Auto-Verification Logic:</span>
              </div>
              Replying with <code>YES</code>, <code>CONFIRM</code>, <code>OK</code>, or <code>SI</code> will automatically verify payment details and advance matching requests from <em>Waiting on Beneficiary</em> to <em>Ready to Pay</em>.
            </div>

            <button
              type="button"
              onClick={handleSimulateInbound}
              disabled={isSimulatingInbound}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSimulatingInbound ? <RotateCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              {isSimulatingInbound ? 'Posting Inbound Webhook...' : 'Post Inbound Reply Webhook'}
            </button>

            {simInboundResult && (
              <div className="p-3 rounded-xl bg-[#EDF7FC] border border-[#0089B3]/30 text-[#006E8F] text-xs font-medium">
                {simInboundResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time SMS Communications Log */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                SMS COMMUNICATIONS LOG
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30 font-bold">
                {smsLogs.length} {smsLogs.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Live audit records of outbound dispatches and inbound beneficiary replies.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone, recipient, text..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-700"
            >
              <option value="all">All Directions</option>
              <option value="outbound">Outbound Only</option>
              <option value="inbound">Inbound Only</option>
            </select>
            <button
              type="button"
              onClick={handleRefreshLogs}
              disabled={isRefreshingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#006E8F] bg-[#EDF7FC] hover:bg-[#EDF7FC]/80 border border-[#0089B3]/30 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-sm">No SMS records found</p>
            <p className="text-xs text-slate-400 mt-1">
              Send a test SMS above or update beneficiary requests with text preference to generate logs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Recipient / Sender</th>
                  <th className="py-2.5 px-3">Message Content</th>
                  <th className="py-2.5 px-3">Language</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isOutbound = log.direction === 'outbound';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            isOutbound ? 'bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30' : 'bg-[#E2F7C2] text-[#2D5F00] border border-[#6EBF00]/30'
                          }`}
                        >
                          {isOutbound ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {isOutbound ? 'Outbound' : 'Inbound'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{log.recipientName || (isOutbound ? 'Beneficiary' : 'Sender')}</div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          {isOutbound ? `To: +${log.to}` : `From: +${log.from}`}
                        </div>
                        {log.requestId && (
                          <div className="text-[10px] text-[#0089B3] font-semibold mt-0.5">
                            Req: {log.requestId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs sm:max-w-md">
                        <p className="text-slate-800 font-medium line-clamp-2">{log.text}</p>
                        {log.isTranslated && log.originalText && (
                          <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">
                            Original: {log.originalText}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.isTranslated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/20 rounded-md font-semibold text-[11px]">
                            <Languages className="w-3 h-3" />
                            {log.languageName || log.language}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">English</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] uppercase ${
                            log.status === 'delivered'
                              ? 'bg-[#E2F7C2] text-[#2D5F00] border border-[#6EBF00]/30'
                              : log.status === 'received'
                              ? 'bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30'
                              : log.status === 'submitted'
                              ? 'bg-[#EDF7FC] text-[#006E8F] border border-[#0089B3]/30'
                              : log.status === 'simulated'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.dispatchedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
