import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
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