import { useState } from 'react';
import { Lock, Mail, User, Loader2, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { toast } from 'sonner';

interface SignInFormProps {
  mode: 'signin' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (next: 'signin' | 'signup') => void;
  onForgotPassword: () => void;
}

export function SignInForm({ mode, onSuccess, onSwitchMode, onForgotPassword }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await signIn.email({ email, password });
        if (res.error) {
          toast.error(res.error.message || 'Invalid email or password');
        } else {
          if ((res as any)?.data?.user?.id) {
            localStorage.setItem('manhwa_user_id', (res as any).data.user.id);
          }
          toast.success('Welcome back! Signed in successfully ✨');
          onSuccess();
        }
      } else {
        const res = await signUp.email({ email, password, name: name.trim() });
        if (res.error) {
          toast.error(res.error.message || 'Failed to create account');
        } else {
          toast.success('Account created! Welcome to your tracker 🎉');
          onSuccess();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Authentication failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === 'signup' && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mubeen"
              className="w-full bg-[#161719] border border-border/30 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>
        </div>
      )}

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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#161719] border border-border/30 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-[.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : mode === 'signin' ? (
          <LogIn className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        <span>{loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
      </button>

      <div className="text-center border-t border-border/15 pt-3">
        <p className="text-xs text-zinc-500">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          <button
            type="button"
            onClick={() => onSwitchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-amber-400 font-semibold hover:text-amber-300 hover:underline ml-1.5 cursor-pointer transition-colors"
          >
            {mode === 'signin' ? 'Create one' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </form>
  );
}
