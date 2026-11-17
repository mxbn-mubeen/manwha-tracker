import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Mail, User, Loader2, Sparkles, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ open, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape key closes modal — capture phase so it runs before GlobalSearch's bubble listener
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the click lands directly on the backdrop, not bubbled up from modal content
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

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
          toast.success('Welcome back! Signed in successfully ✨');
          onClose();
        }
      } else {
        const res = await signUp.email({ email, password, name: name.trim() });
        if (res.error) {
          toast.error(res.error.message || 'Failed to create account');
        } else {
          toast.success('Account created! Welcome to your tracker 🎉');
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Authentication failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Gradient glow border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Main card */}
        <div className="relative bg-[#0f1012] border border-border/40 rounded-2xl">
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent rounded-t-2xl" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="inline-flex w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 items-center justify-center shadow-lg shadow-amber-500/10">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {mode === 'signin'
                    ? 'Sign in to access your reading progress'
                    : 'Start tracking your manga library'}
                </p>
              </div>
            </div>

            {/* Auth Form */}
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
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
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
            </form>

            {/* Mode Toggle */}
            <div className="text-center border-t border-border/15 pt-3">
              <p className="text-xs text-zinc-500">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setEmail('');
                    setPassword('');
                    setName('');
                  }}
                  className="text-amber-400 font-semibold hover:text-amber-300 hover:underline ml-1.5 cursor-pointer transition-colors"
                >
                  {mode === 'signin' ? 'Create one' : 'Sign in instead'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
