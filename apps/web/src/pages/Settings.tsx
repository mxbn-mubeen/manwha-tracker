import { useState } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Phone,
  KeyRound,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
type LoginStep = 'idle' | 'phone' | 'code' | '2fa' | 'success';

export function SettingsPage() {
  return (
    <div className="space-y-8 pb-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your tracker configuration</p>
      </div>

      <TelegramSection />
    </div>
  );
}

// ─── Telegram Section ─────────────────────────────────────────────────────────
function TelegramSection() {
  const utils = trpc.useUtils();

  // Login wizard state
  const [step, setStep] = useState<LoginStep>('idle');
  const [phone, setPhone] = useState('');
  const [tempId, setTempId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.settings.telegramStatus.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  // Step 1 — send OTP
  const startLogin = trpc.settings.startTelegramLogin.useMutation({
    onSuccess: (data) => {
      setTempId(data.tempId);
      setStep('code');
      toast.success('OTP sent!', { description: `Check your Telegram for the verification code.` });
    },
    onError: (err) => toast.error('Failed to send code', { description: err.message }),
  });

  // Step 2 — verify OTP (+ optional 2FA)
  const verifyCode = trpc.settings.verifyTelegramCode.useMutation({
    onSuccess: async (data) => {
      if (data.needs2FA) {
        setStep('2fa');
        toast.info('2FA required', { description: 'Enter your Telegram Two-Step Verification password.' });
        return;
      }
      // Fully signed in
      setStep('success');
      setPhone(''); setCode(''); setPassword(''); setTempId('');
      await utils.settings.telegramStatus.invalidate();
      await refetchStatus();
      toast.success('Connected! Session saved to database.');
    },
    onError: (err) => {
      toast.error('Verification failed', { description: err.message });
      // Reset to phone step so user can retry
      setStep('phone');
      setCode(''); setTempId('');
    },
  });

  const deleteMutation = trpc.settings.delete.useMutation({
    onSuccess: async () => {
      await utils.settings.telegramStatus.invalidate();
      await refetchStatus();
      setStep('idle');
      toast.success('Session removed from database.');
    },
    onError: (err) => toast.error('Failed to remove session', { description: err.message }),
  });

  const handleSendCode = () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    startLogin.mutate({ phone: trimmed });
  };

  const handleVerifyCode = () => {
    verifyCode.mutate({ tempId, code: code.trim() });
  };

  const handleVerify2FA = () => {
    verifyCode.mutate({ tempId, code: code.trim(), password: password.trim() });
  };

  const reset = () => {
    setStep('idle'); setPhone(''); setCode(''); setPassword(''); setTempId('');
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Send size={18} className="text-blue-400" />
          Telegram
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your Telegram account so the watcher can track new chapters from your channels.
        </p>
      </div>

      {/* ── Status Card ── */}
      <Card className="p-5 space-y-4 bg-card border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Connection Status</span>
          {statusLoading ? (
            <Badge variant="outline" className="gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Checking…
            </Badge>
          ) : status?.connected ? (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={12} /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-red-400 border-red-500/30">
              <XCircle size={12} /> Not connected
            </Badge>
          )}
        </div>

        {status && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
              <p className="font-mono">{status.phone ? `+${status.phone}` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Session source</p>
              <p className="font-mono text-xs">
                {status.source === 'database' ? '🗄 Database' : status.source === 'env' ? '🔒 .env file' : '—'}
              </p>
            </div>
          </div>
        )}

        {status?.source === 'database' && (
          <div className="border-t border-border/50 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
              onClick={() => deleteMutation.mutate('telegram_session')}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} />
              Remove saved session
            </Button>
          </div>
        )}
      </Card>

      {/* ── Login Wizard ── */}
      {step === 'idle' || step === 'success' ? (
        <Card className="p-5 space-y-4 bg-card border-border/50">
          <div>
            <h3 className="text-sm font-semibold mb-0.5">
              {status?.connected ? 'Re-connect Account' : 'Connect Account'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Log in with your phone number — Telegram will send you a verification code. No app or
              terminal needed.
            </p>
          </div>
          <Button
            id="start-telegram-login"
            onClick={() => setStep('phone')}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <LogIn size={14} />
            {status?.connected ? 'Re-connect Telegram' : 'Connect Telegram'}
          </Button>
        </Card>
      ) : null}

      {/* Step 1 — Phone Number */}
      {step === 'phone' && (
        <Card className="p-5 space-y-4 bg-card border-border/50">
          <StepHeader icon={<Phone size={16} className="text-blue-400" />} title="Enter your phone number" step={1} />
          <p className="text-xs text-muted-foreground">
            Use the international format, e.g. <code className="font-mono bg-white/5 px-1 rounded">+919876543210</code>
          </p>
          <input
            id="telegram-phone-input"
            type="tel"
            autoFocus
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="send-telegram-code"
              onClick={handleSendCode}
              disabled={!phone.trim() || startLogin.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {startLogin.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {startLogin.isPending ? 'Sending…' : 'Send Code'}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2 — OTP Code */}
      {step === 'code' && (
        <Card className="p-5 space-y-4 bg-card border-border/50">
          <StepHeader icon={<KeyRound size={16} className="text-amber-400" />} title="Enter the verification code" step={2} />
          <p className="text-xs text-muted-foreground">
            Check your Telegram app for a message from <strong>Telegram</strong> with a 5-digit code.
          </p>
          <input
            id="telegram-otp-input"
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={8}
            placeholder="12345"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="verify-telegram-code"
              onClick={handleVerifyCode}
              disabled={code.length < 4 || verifyCode.isPending}
              className="gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold"
            >
              {verifyCode.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {verifyCode.isPending ? 'Verifying…' : 'Verify Code'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('phone')} className="text-muted-foreground">
              Back
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2.5 — 2FA Password */}
      {step === '2fa' && (
        <Card className="p-5 space-y-4 bg-card border-border/50">
          <StepHeader icon={<ShieldCheck size={16} className="text-purple-400" />} title="Two-step verification" step={3} />
          <p className="text-xs text-muted-foreground">
            Your account has Two-Step Verification enabled. Enter your Telegram password to continue.
          </p>
          <input
            id="telegram-2fa-input"
            type="password"
            autoFocus
            placeholder="Your 2FA password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify2FA()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="verify-telegram-2fa"
              onClick={handleVerify2FA}
              disabled={!password.trim() || verifyCode.isPending}
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              {verifyCode.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {verifyCode.isPending ? 'Verifying…' : 'Submit Password'}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Security note */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/80 space-y-1">
        <p className="font-semibold text-amber-300">Security note</p>
        <p>
          The session is stored in your own Neon database and never leaves your infrastructure. If you
          ever suspect it has been compromised, go to{' '}
          <strong>Telegram → Settings → Devices</strong> and terminate all unfamiliar sessions.
        </p>
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StepHeader({
  icon,
  title,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  step: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground border border-border/50">
        {step}
      </div>
      <div className="flex items-center gap-2 font-semibold text-sm">
        {icon}
        {title}
      </div>
    </div>
  );
}
