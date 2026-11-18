import React, { useState } from 'react';
import { Mail, KeyRound, Loader2 } from 'lucide-react';
import { forgetPassword } from '@/lib/auth-client';
import { toast } from 'sonner';

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void;
}

export function ForgotPasswordForm({ onBackToSignIn }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const res = await forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if ((res as any)?.error) {
        toast.error((res as any).error.message || 'Failed to send reset email');
      } else {
        toast.success('✉️ Reset link sent! Check your inbox');
        onBackToSignIn();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleForgotSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-[#161719] border border-border/30 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-[.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        <span>{loading ? 'Sending…' : 'Send Reset Link'}</span>
      </button>

      <div className="text-center border-t border-border/15 pt-3">
        <p className="text-xs text-zinc-500">
          Remember it?{' '}
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-amber-400 font-semibold hover:text-amber-300 hover:underline cursor-pointer transition-colors"
          >
            Back to sign in
          </button>
        </p>
      </div>
    </form>
  );
}
