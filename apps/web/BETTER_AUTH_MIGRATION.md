# Better Auth Migration Guide

This document outlines the migration from NextAuth.js to Better Auth in The Exicon Project.

## What Changed

### 1. Authentication Library
- **Before**: NextAuth.js v4 with MongoDB adapter
- **After**: Better Auth with native MongoDB adapter

### 2. Key Files Modified

#### Core Configuration
- `apps/web/lib/auth.ts` - Better Auth server configuration
- `apps/web/lib/auth-client.ts` - Better Auth client configuration
- `apps/web/pages/api/auth/[...all].ts` - API route handler

#### Components
- `apps/web/components/auth/sign-in-form.tsx` - New sign-in form
- `apps/web/components/auth/sign-up-form.tsx` - New sign-up form
- `apps/web/pages/auth/sign-in.tsx` - Sign-in page
- `apps/web/pages/auth/sign-up.tsx` - Sign-up page
- `apps/web/components/layout/navbar.tsx` - Updated to use Better Auth

#### App Structure
- `apps/web/pages/_app.tsx` - Removed NextAuth SessionProvider

### 3. Features Implemented

#### Authentication Methods
- ✅ Email & Password authentication
- ✅ GitHub OAuth integration
- ✅ Account linking (trusted providers)
- ✅ User registration with auto sign-in

#### Session Management
- ✅ React hooks (`useSession`)
- ✅ Client-side session handling
- ✅ Server-side session validation

#### Database
- ✅ MongoDB adapter configuration
- ✅ Existing MongoDB connection reuse
- ✅ User, session, account, and verification tables

### 4. Environment Variables Required

Add these to your `.env` file:

```env
# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Existing GitHub OAuth (reused)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 5. Usage Examples

#### Client-side Authentication
```tsx
import { authClient, useSession } from '@/lib/auth-client';

// In a React component
function MyComponent() {
  const { data: session, isPending } = useSession();
  
  const handleSignIn = async () => {
    await authClient.signIn.email({
      email: 'user@example.com',
      password: 'password',
      callbackURL: '/dashboard'
    });
  };
  
  const handleSignUp = async () => {
    await authClient.signUp.email({
      email: 'user@example.com',
      password: 'password',
      name: 'User Name',
      callbackURL: '/dashboard'
    });
  };
  
  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/dashboard'
    });
  };
  
  return (
    <div>
      {session ? (
        <p>Welcome, {session.user.name}!</p>
      ) : (
        <button onClick={handleSignIn}>Sign In</button>
      )}
    </div>
  );
}
```

#### Server-side Authentication
```tsx
import { createAuth } from '@/lib/auth';

// In API routes or getServerSideProps
export async function getServerSideProps({ req }) {
  const auth = await createAuth();
  const session = await auth.api.getSession({
    headers: req.headers
  });
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/sign-in',
        permanent: false,
      },
    };
  }
  
  return {
    props: { session }
  };
}
```

### 6. Migration Benefits

#### Developer Experience
- **Type Safety**: Better TypeScript support
- **Modern API**: Clean, intuitive API design
- **Plugin System**: Extensible with plugins
- **React Native**: Works with React Native

#### Performance
- **Smaller Bundle**: More lightweight than NextAuth
- **Better Caching**: Improved session caching
- **Native MongoDB**: Direct MongoDB adapter without extra layers

#### Security
- **Account Linking**: Secure account linking with trusted providers
- **Session Management**: Advanced session management
- **User Deletion**: Built-in account deletion support

### 7. Database Schema

Better Auth automatically creates these collections in MongoDB:
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth/credential accounts
- `verification` - Email verification tokens

### 8. Next Steps

1. **Test Authentication**: Verify sign-in/sign-up flows work
2. **Update Components**: Migrate any remaining NextAuth usage
3. **Add Plugins**: Consider adding plugins like 2FA, magic links, etc.
4. **Email Verification**: Add email verification if needed
5. **Password Reset**: Implement password reset functionality

### 9. Troubleshooting

#### Common Issues
- Ensure `BETTER_AUTH_SECRET` is set in production
- MongoDB connection string must be accessible
- GitHub OAuth app settings must include Better Auth callback URLs

#### Debug Mode
Enable debug logs in development:
```tsx
const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  debug: process.env.NODE_ENV === 'development'
});
```

For more information, see the [Better Auth documentation](https://better-auth.com/docs). 