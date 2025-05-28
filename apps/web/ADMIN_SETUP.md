# Admin Plugin Setup Guide

This document explains how to use the Better Auth admin plugin with custom permission levels for The Exicon Project.

## Permission Levels

We have three permission levels configured:

### 🔴 Admin (Highest Level)
- **User Management**: Can create, list, ban, impersonate, and delete users
- **Exercise Management**: Full control - create, edit, view, delete, and publish exercises
- **Comment Management**: Full control - create, edit, delete, and moderate comments
- **Rating Management**: Full control - create, edit, and delete ratings
- **Role Management**: Can designate other admins and change user roles

### 🟡 Maintainer (Exercise Management)
- **User Management**: Can list users (read-only)
- **Exercise Management**: Can create, edit, view, and publish exercises (cannot delete)
- **Comment Management**: Can create, edit, and moderate comments on their exercises
- **Rating Management**: Can create and edit ratings

### 🟢 Viewer (Default Role)
- **Exercise Management**: Can view exercises only
- **Comment Management**: Can create and edit their own comments
- **Rating Management**: Can create and edit their own ratings

## Quick Start

### 1. Designate Your First Admin

Since you're using MongoDB, you can manually set a user's role to admin in your database:

```javascript
// In MongoDB shell or compass
db.user.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### 2. Using Admin Functions

```typescript
import { adminActions, permissions } from '@/lib/admin-utils';

// Check permissions
const canCreateUser = await permissions.canCreateUser();
const canEditExercise = await permissions.canEditExercise();

// Create a new user with role
const result = await adminActions.createUser({
  name: "John Doe",
  email: "john@example.com",
  password: "password123",
  role: "maintainer", // or "admin" or "viewer"
  f3Name: "John F3",
  f3Region: "North Region"
});

// List users with search/filter
const users = await adminActions.listUsers({
  limit: 10,
  search: "@example.com",
  role: "maintainer"
});

// Change user role
await adminActions.setUserRole(userId, "admin");

// Ban/unban users
await adminActions.banUser(userId, "Spam posting");
await adminActions.unbanUser(userId);

// Impersonate a user (admin only)
await adminActions.impersonateUser(userId);
await adminActions.stopImpersonating();
```

### 3. Using in Components

```tsx
import { permissions } from '@/lib/admin-utils';
import { useState, useEffect } from 'react';

function ExerciseActions() {
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      setCanEdit(await permissions.canEditExercise());
      setCanDelete(await permissions.canDeleteExercise());
    };
    checkPermissions();
  }, []);

  return (
    <div>
      {canEdit && <button>Edit Exercise</button>}
      {canDelete && <button>Delete Exercise</button>}
    </div>
  );
}
```

### 4. Server-Side Permission Checking

```typescript
import { auth } from '@/lib/auth';

// Check user permissions on the server
const hasPermission = await auth.api.userHasPermission({
  body: {
    userId: 'user-id',
    permissions: {
      exercise: ["create"],
      comment: ["moderate"]
    },
  },
});

// Or check by role
const hasPermissionByRole = await auth.api.userHasPermission({
  body: {
    role: "maintainer",
    permissions: {
      exercise: ["edit"],
    },
  },
});
```

## Database Schema

MongoDB will automatically create these fields when needed:

### User Table
- `role`: String - "admin", "maintainer", or "viewer" (default: "viewer")
- `banned`: Boolean - Whether the user is banned
- `banReason`: String - Reason for the ban
- `banExpires`: Date - When the ban expires (optional)

### Session Table
- `impersonatedBy`: String - ID of the admin who is impersonating this session

## Admin Dashboard

Use the `AdminDashboard` component to get started:

```tsx
import { AdminDashboard } from '@/components/admin/admin-dashboard';

function AdminPage() {
  return <AdminDashboard />;
}
```

This component shows:
- Current user's permissions
- User management table
- Role assignment controls
- Ban/unban functionality
- User impersonation

## Environment Variables

Make sure these are set in your `.env` file:

```env
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
MONGODB_URI=your-mongodb-connection-string
```

## Security Notes

1. **Admin Users**: Only users with the "admin" role can designate other admins
2. **Default Role**: New users default to "viewer" role
3. **Permission Validation**: All admin actions are validated server-side
4. **Impersonation**: Admin sessions created through impersonation expire after 1 hour
5. **Banned Users**: Banned users cannot sign in and all their sessions are revoked

## Next Steps

1. Create your first admin user in the database
2. Build UI components that use the permission system
3. Integrate exercise, comment, and rating permissions into your app
4. Set up admin dashboard routing and access controls 