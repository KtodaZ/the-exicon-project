import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// Define custom statements for exercise management
export const statement = {
  ...defaultStatements, // Include default admin statements for user and session management
  exercise: ["create", "edit", "view", "delete", "publish"],
  comment: ["create", "edit", "delete", "moderate"],
  rating: ["create", "edit", "delete"],
} as const;

// Create access controller
export const ac = createAccessControl(statement);

// Define admin role - highest level permissions
export const admin = ac.newRole({
  // Can manage all users and sessions (from default statements)
  ...adminAc.statements,
  // Can manage all exercises
  exercise: ["create", "edit", "view", "delete", "publish"],
  // Can moderate all comments
  comment: ["create", "edit", "delete", "moderate"],
  // Can manage all ratings
  rating: ["create", "edit", "delete"],
});

// Define maintainer role - can add and edit exercises
export const maintainer = ac.newRole({
  // Limited user management - can view users but not manage them
  user: ["list"],
  // Can manage exercises but not delete them
  exercise: ["create", "edit", "view", "publish"],
  // Can moderate comments on their exercises
  comment: ["create", "edit", "moderate"],
  // Can create and edit ratings
  rating: ["create", "edit"],
});

// Define viewer role - can comment and rate exercises
export const viewer = ac.newRole({
  // Can only view exercises
  exercise: ["view"],
  // Can comment on exercises
  comment: ["create", "edit"], // Can only edit their own comments
  // Can rate exercises
  rating: ["create", "edit"], // Can only edit their own ratings
}); 