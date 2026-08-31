import { useState, useEffect } from 'react';
import { Send, CheckCircle2, XCircle, Loader2, Trash2, LogIn } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TelegramLoginWizard } from './TelegramLoginWizard';

type LoginStep = 'idle' | 'phone' | 'code' | '2fa' | 'success';

export function TelegramSection() {
  const utils = trpc.useUtils();

  const [step, setStep] = useState<LoginStep>('idle');
  const [phone, setPhone] = useState('');
  const [tempId, setTempId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.settings.telegramStatus.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  const { data: rememberedPhone } = trpc.settings.get.useQuery('telegram_phone_hint');
  const rememberPhone = trpc.settings.set.useMutation({
    onSuccess: () => utils.settings.get.invalidate('telegram_phone_hint'),
  });

  useEffect(() => {
    if (rememberedPhone && !phone) setPhone(rememberedPhone);
  }, [rememberedPhone, phone]);

  const startLogin = trpc.settings.startTelegramLogin.useMutation({
    onSuccess: (data) => {
      setTempId(data.tempId);
      setStep('code');
      toast.success('OTP sent! Check your Telegram for the verification code.');
    },
    onError: (err) => toast.error(err.message || 'Failed to send code'),
  });

  const verifyCode = trpc.settings.verifyTelegramCode.useMutation({
    onSuccess: async (data) => {
      if (data.needs2FA) {
        setStep('2fa');
        toast.info('2FA required', { description: 'Enter your Telegram Two-Step Verification password.' });
        return;
      }
      setStep('success');
      setPhone(''); setCode(''); setPassword(''); setTempId('');
      await utils.settings.telegramStatus.invalidate();
      await refetchStatus();
      toast.success('Connected! Session saved to database.');
    },
    onError: (err) => {
      toast.error(err.message || 'Verification failed');
      setStep('phone');
      setCode(''); setTempId('');
    },
  });

  const deleteMutation = trpc.settings.disconnectTelegram.useMutation({
    onSuccess: async () => {
      await utils.settings.telegramStatus.invalidate();
      await refetchStatus();
      setStep('idle');
      toast.success('Session removed from database.');
    },
    onError: (err) => toast.error(err.message || 'Failed to remove session'),
  });

  const handleSendCode = () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    rememberPhone.mutate({ key: 'telegram_phone_hint', value: trimmed });
    startLogin.mutate({ phone: trimmed });
  };

  const reset = () => { setStep('idle'); setPhone(''); setCode(''); setPassword(''); setTempId(''); };

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

      {/* Status Card */}
      <Card className="p-5 space-y-4 bg-card border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Connection Status</span>
          {statusLoading ? (
            <Badge variant="outline" className="gap-1.5"><Loader2 size={11} className="animate-spin" /> Checking…</Badge>
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
              variant="ghost" size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={14} /> Remove saved session
            </Button>
          </div>
        )}
      </Card>

      <TelegramLoginWizard
        step={step}
        phone={phone}
        code={code}
        password={password}
        isConnected={!!status?.connected}
        startLoginPending={startLogin.isPending}
        verifyCodePending={verifyCode.isPending}
        onPhoneChange={setPhone}
        onCodeChange={setCode}
        onPasswordChange={setPassword}
        onStart={() => setStep('phone')}
        onSendCode={handleSendCode}
        onVerifyCode={() => verifyCode.mutate({ tempId, code: code.trim() })}
        onVerify2FA={() => verifyCode.mutate({ tempId, code: code.trim(), password: password.trim() })}
        onReset={reset}
        onBackToPhone={() => setStep('phone')}
      />

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