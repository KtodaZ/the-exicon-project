import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    inferAdditionalFields<typeof auth>()
  ],
});

// Export the session hook and other utilities
export const { useSession } = authClient;

// Export common methods for easier imports
export const { 
  signIn, 
  signUp, 
  signOut, 
  getSession 
} = authClient; 