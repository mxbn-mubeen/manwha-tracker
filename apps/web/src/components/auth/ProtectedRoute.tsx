import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { data: session, isPending } = useSession();

  // While checking session on first render, render nothing or let page resolve
  if (isPending) {
    return null;
  }

  const user = session?.user;

  // Not logged in -> redirect to dashboard
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Requires admin role -> check role
  if (requireAdmin && (user as any).role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
