import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDatabase } from "./mongodb";

export const createAuth = async () => {
  const db = await getDatabase();
  
  return betterAuth({
    database: mongodbAdapter(db),
    
    emailAndPassword: {
      enabled: true,
      autoSignIn: true, // Auto sign in after successful sign up
    },
    
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    },
    
    secret: process.env.BETTER_AUTH_SECRET as string,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github"], // Auto-link GitHub accounts
      },
    },
  });
}; 