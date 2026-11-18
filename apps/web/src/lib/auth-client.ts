import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

// Points directly to Neon-hosted Better Auth endpoint
const baseURL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEON_AUTH_URL) ||
  'https://ep-royal-wind-adm38n19.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth';

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

// Better Auth uses requestPasswordReset (/request-password-reset)
export const requestPasswordReset = async (opts: { email: string; redirectTo?: string }) => {
  return (authClient as any).requestPasswordReset(opts);
};
export const forgetPassword = requestPasswordReset;

// Better Auth resetPassword (/reset-password)
export const resetPassword = async (opts: { newPassword: string; token: string }) => {
  return (authClient as any).resetPassword(opts);
};

// Better Auth changePassword (/change-password)
export const changePassword = async (opts: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) => {
  return (authClient as any).changePassword(opts);
};
