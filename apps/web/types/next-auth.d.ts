import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    username?: string;
    user: {
      /** The user's id. */
      id: string;
    } & DefaultSession["user"]
  }

  interface User {
    username?: string;
    followers?: number;
    verified?: boolean;
  }
} 