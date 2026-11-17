import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

// Points directly to Neon-hosted Better Auth endpoint
const baseURL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-royal-wind-adm38n19.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth';

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
