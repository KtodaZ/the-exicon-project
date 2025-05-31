import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { ac, admin as adminRole, maintainer, viewer } from "./permissions";

// Create MongoDB client and database connection
const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db();
console.log('better-auth is attempting to use database:', db.databaseName);

export const auth = betterAuth({
  database: mongodbAdapter(db),
  
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  
  secret: process.env.BETTER_AUTH_SECRET as string,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  user: {
    additionalFields: {
      f3Name: {
        type: "string",
        required: false,
        input: true,
      },
      f3Region: {
        type: "string", 
        required: false,
        input: true,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },

  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        maintainer,
        viewer,
      },
      defaultRole: "viewer",
      adminRoles: ["admin"],
    }),
  ],
});

// For backward compatibility
export const createAuth = async () => auth; 