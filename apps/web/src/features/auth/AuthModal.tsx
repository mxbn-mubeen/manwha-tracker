import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, KeyRound } from 'lucide-react';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { SignInForm } from './components/SignInForm';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthModal({ open, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape key closes modal
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
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const headerTitle = mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password';
  const headerSub =
    mode === 'signin'
      ? 'Sign in to access your reading progress'
      : mode === 'signup'
        ? 'Start tracking your manga library'
        : 'Enter your email to receive a reset link';

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
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative bg-[#0f1012] border border-border/40 rounded-2xl">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent rounded-t-2xl" />

          <div className="p-6 sm:p-7 space-y-5">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-1">
              <div className="inline-flex w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 items-center justify-center shadow-lg shadow-amber-500/10">
                {mode === 'forgot' ? (
                  <KeyRound className="w-5 h-5 text-amber-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{headerTitle}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{headerSub}</p>
              </div>
            </div>

            {mode === 'forgot' ? (
              <ForgotPasswordForm onBackToSignIn={() => setMode('signin')} />
            ) : (
              <SignInForm
                mode={mode}
                onSuccess={onClose}
                onSwitchMode={(next) => setMode(next)}
                onForgotPassword={() => setMode('forgot')}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
