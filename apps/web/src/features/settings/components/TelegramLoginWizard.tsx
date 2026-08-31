import { Send, Loader2, CheckCircle2, KeyRound, ShieldCheck, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type LoginStep = 'idle' | 'phone' | 'code' | '2fa' | 'success';

function StepHeader({ icon, title, step }: { icon: React.ReactNode; title: string; step: number }) {
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

interface TelegramLoginWizardProps {
  step: LoginStep;
  phone: string;
  code: string;
  password: string;
  isConnected: boolean;
  startLoginPending: boolean;
  verifyCodePending: boolean;
  onPhoneChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onStart: () => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onVerify2FA: () => void;
  onReset: () => void;
  onBackToPhone: () => void;
}

export function TelegramLoginWizard({
  step, phone, code, password, isConnected,
  startLoginPending, verifyCodePending,
  onPhoneChange, onCodeChange, onPasswordChange,
  onStart, onSendCode, onVerifyCode, onVerify2FA,
  onReset, onBackToPhone,
}: TelegramLoginWizardProps) {
  return (
    <>
      {/* Entry button */}
      {(step === 'idle' || step === 'success') && (
        <Card className="p-5 space-y-4 bg-card border-border/50">
          <div>
            <h3 className="text-sm font-semibold mb-0.5">
              {isConnected ? 'Re-connect Account' : 'Connect Account'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Log in with your phone number — Telegram will send you a verification code. No app or terminal needed.
            </p>
          </div>
          <Button
            id="start-telegram-login"
            onClick={onStart}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            <Send size={14} />
            {isConnected ? 'Re-connect Telegram' : 'Connect Telegram'}
          </Button>
        </Card>
      )}

      {/* Step 1 — Phone */}
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
            onChange={(e) => onPhoneChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendCode()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="send-telegram-code"
              onClick={onSendCode}
              disabled={!phone.trim() || startLoginPending}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {startLoginPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {startLoginPending ? 'Sending…' : 'Send Code'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">Cancel</Button>
          </div>
        </Card>
      )}

      {/* Step 2 — OTP */}
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
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && onVerifyCode()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="verify-telegram-code"
              onClick={onVerifyCode}
              disabled={code.length < 4 || verifyCodePending}
              className="gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold"
            >
              {verifyCodePending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {verifyCodePending ? 'Verifying…' : 'Verify Code'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onBackToPhone} className="text-muted-foreground">Back</Button>
          </div>
        </Card>
      )}

      {/* Step 3 — 2FA */}
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
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onVerify2FA()}
            className="w-full rounded-md border border-border/50 bg-black/30 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-muted-foreground/50"
          />
          <div className="flex gap-2">
            <Button
              id="verify-telegram-2fa"
              onClick={onVerify2FA}
              disabled={!password.trim() || verifyCodePending}
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              {verifyCodePending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {verifyCodePending ? 'Verifying…' : 'Submit Password'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">Cancel</Button>
          </div>
        </Card>
      )}
    </>
  );
}
