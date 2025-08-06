/*
 * TODO: Fix Clerk server imports
 * import { createClerkClient } from '@clerk/remix';
 */

/*
 * Server-side Clerk client - commented out for now
 * export const clerkClient = createClerkClient({
 *   secretKey: process.env.CLERK_SECRET_KEY,
 * });
 */

// Helper function to get user from Clerk
export async function getClerkUser(userId: string) {
  try {
    // return await clerkClient.users.getUser(userId);
    return null; // Placeholder
  } catch (error) {
    console.error('Error fetching user from Clerk:', error);
    return null;
  }
}

// Helper function to update user in Clerk
export async function updateClerkUser(
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    username?: string;
  },
) {
  try {
    // return await clerkClient.users.updateUser(userId, updates);
    throw new Error('Not implemented'); // Placeholder
  } catch (error) {
    console.error('Error updating user in Clerk:', error);
    throw error;
  }
}
