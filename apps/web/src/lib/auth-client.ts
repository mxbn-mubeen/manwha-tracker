import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

// Points to our Express API server which mounts Better Auth at /api/auth
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
