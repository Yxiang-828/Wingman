/**
 * Hybrid Authentication Service
 * Handles online/offline authentication with SQLite + SQLite sync
 * Only stores current user's credentials locally for offline access
 */

import { api } from "../api/apiClient";
import { getApiUrl } from "../config";

/**
 * Check if device is online AND server is reachable
 */
const isOnline = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(getApiUrl("/api/v1/user/health"), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const health = await response.json();
    return health.status === "online";
  } catch (error) {
    console.log("Server health check failed:", error);
    return false;
  }
};

/**
 * Get current connection status
 */
export const getConnectionStatus = async (): Promise<
  "online" | "offline" | "server-offline"
> => {
  if (!navigator.onLine) return "offline";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(getApiUrl("/api/v1/user/health"), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const health = await response.json();
    return health.status === "online" ? "online" : "server-offline";
  } catch (error) {
    return "server-offline";
  }
};

/**
 * Check username availability
 */
export const checkUsernameAvailability = async (
  username: string,
): Promise<any> => {
  try {
    const response = await api.get(`/api/v1/user/check-username/${username}`);
    return response;
  } catch (error: any) {
    console.error("Username check failed:", error);
    throw error;
  }
};

/**
 * Generate UUID for new users
 */
const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Sync local user changes to SQLite
 * Only called when user has local changes that need to be pushed to cloud
 */
let syncInProgress = false; // Guard against multiple simultaneous syncs

export const syncUserToSQLite = async (
  userToSync?: any,
): Promise<{ success: boolean; error?: string }> => {
  if (syncInProgress) {
    return { success: false, error: "Sync already in progress" };
  }

  syncInProgress = true;

  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, error: "Device is offline" };
    }

    if (!userToSync) {
      const sessionUser = getCurrentUser();
      if (!sessionUser || !sessionUser.id) {
        return { success: false, error: "No current user in session" };
      }
      userToSync = sessionUser;
    }

    if (!userToSync.password) {
      return {
        success: false,
        error:
          "Session data incomplete. Please log out and log back in to enable sync.",
      };
    }

    const needsSync =
      !userToSync.last_synced_at ||
      new Date(userToSync.updated_at) > new Date(userToSync.last_synced_at);

    console.log("Sync check:", {
      username: userToSync.username,
      needsSync,
      last_synced_at: userToSync.last_synced_at ? "set" : "null",
    });

    if (!needsSync) {
      console.log("User is already synced, skipping");
      return { success: true };
    }

    console.log("Syncing user to SQLite...");

    // Check username availability before sync (same as online registration)
    try {
      const availability = await checkUsernameAvailability(userToSync.username);
      if (!availability.available) {
        return {
          success: false,
          error: `Username '${userToSync.username}' is already taken. Please choose a different username.`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to check username availability: ${error.message}`,
      };
    }

    // Use sync endpoint that bypasses username checking and relies on UUID uniqueness
    await api.post("/api/v1/user/sync", {
      id: userToSync.id, // Include the unique UUID
      username: userToSync.username,
      name: userToSync.name,
      email: userToSync.email,
      password: userToSync.password,
    });

    await window.electronAPI.db.markUserSynced(userToSync.id);

    // Update session user with new last_synced_at timestamp
    const currentSessionUser = getCurrentUser();
    if (currentSessionUser && currentSessionUser.id === userToSync.id) {
      const updatedSessionUser = {
        ...currentSessionUser,
        last_synced_at: new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(updatedSessionUser));
      console.log("Session user updated with sync timestamp");
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to sync to cloud",
    };
  } finally {
    syncInProgress = false;
  }
};

/**
 * Register new user - hybrid online/offline approach
 */
export const registerUser = async (
  name: string,
  email: string,
  password: string,
  username?: string,
): Promise<any> => {
  const userId = generateUUID();
  const now = new Date().toISOString();

  try {
    const online = await isOnline();

    if (online) {
      console.log("Online registration - storing in both SQLite and local");

      // Use provided username or generate from email as fallback
      const finalUsername = username || email.split("@")[0];

      try {
        // Try SQLite first - send plain password, backend handles hashing
        const user = await api.post("/api/v1/user/register", {
          username: finalUsername,
          name,
          email,
          password, // Send plain password, not hashed
        });

        console.log("SQLite registration response:", user);
        console.log("User timestamps:", {
          created_at: user.created_at,
          updated_at: user.updated_at,
          created_at_type: typeof user.created_at,
          updated_at_type: typeof user.updated_at,
        });

        // Store locally with same password format as SQLite (plain text)
        const localUserData = {
          username: user.username,
          email: user.email,
          name: user.name,
          password: password, // Store same plain text password as SQLite
          created_at: user.created_at,
          updated_at: user.updated_at, // Use SQLite timestamp
          last_synced_at: user.updated_at, // Set to SQLite's updated_at since we just synced
        };

        console.log("Storing local user data:", localUserData);
        console.log("Local data timestamp types:", {
          created_at_type: typeof localUserData.created_at,
          updated_at_type: typeof localUserData.updated_at,
          last_synced_at_type: typeof localUserData.last_synced_at,
        });
        await window.electronAPI.db.storeUserCredentials(
          user.id,
          localUserData,
        );

        // Set user session
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", user.token || "");

        console.log("User registered successfully (online):", user.email);
        return user;
      } catch (error: any) {
        // Handle username conflict
        if (
          error.response?.status === 409 &&
          error.response?.data?.error === "username_taken"
        ) {
          console.log(
            "Username conflict during registration:",
            error.response.data,
          );
          throw {
            type: "username_conflict",
            message: error.response.data.message,
          };
        }
        throw error;
      }
    } else {
      console.log("Offline registration - storing locally only");

      // Offline: store locally only (will sync when online) - plain text password
      const finalUsername = username || email.split("@")[0]; // Use provided username or fallback

      // Check for username conflict in local SQLite
      const usernameExists =
        await window.electronAPI.db.usernameExistsLocally(finalUsername);
      if (usernameExists) {
        throw {
          type: "username_conflict",
          message: `Username '${finalUsername}' is already taken locally. Please choose a different username.`,
        };
      }

      const userData = {
        username: finalUsername,
        email,
        name,
        password: password, // Store plain text password (same as SQLite format)
        created_at: now,
        updated_at: now,
        last_synced_at: null, // NULL = needs sync when online
      };

      await window.electronAPI.db.storeUserCredentials(userId, userData);

      // Create user object for session (include password for sync)
      const user = {
        id: userId,
        username: finalUsername,
        email,
        name,
        password: password, // Include password for sync
        created_at: now,
        updated_at: now,
        last_synced_at: null, // NULL = needs sync when online
      };

      // Set user session
      localStorage.setItem("user", JSON.stringify(user));

      console.log("User registered successfully (offline):", email);
      return user;
    }
  } catch (error) {
    console.error("Registration failed:", error);

    // Clean up any stale data
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    throw error;
  }
};

/**
 * Login user - hybrid online/offline approach
 * Prioritizes local storage first, then cloud
 */
export const loginUser = async (
  username: string,
  password: string,
): Promise<any> => {
  try {
    // Always try local authentication first (faster and works offline)da
    console.log("Trying local login first...");

    const localUser = await window.electronAPI.db.getUserCredentials(
      username,
      password,
    );

    if (localUser) {
      // Create complete user object for session (including password for sync)
      const completeUser = {
        ...localUser,
        password: password, // Include password in session for sync operations
      };

      // Set user session
      localStorage.setItem("user", JSON.stringify(completeUser));

      console.log("User logged in successfully (local):", localUser.email);

      // Check if user needs sync to cloud (check directly from localUser data)
      const online = await isOnline();
      const needsSync =
        !localUser.last_synced_at ||
        new Date(localUser.updated_at) > new Date(localUser.last_synced_at);

      console.log("Login sync check:", {
        online,
        needsSync,
        last_synced: localUser.last_synced_at ? "set" : "null",
      });

      if (online && needsSync) {
        console.log("Syncing user during login...");
        try {
          const syncResult = await syncUserToSQLite(completeUser);
          if (syncResult.success) {
            console.log("Login sync completed successfully");
          } else {
            console.error("Login sync failed:", syncResult.error);

            // Check if it's a username conflict error
            if (
              syncResult.error &&
              syncResult.error.includes("already taken")
            ) {
              console.log("Username conflict detected during login sync");
              return {
                success: false,
                syncConflict: true,
                conflictUsername: completeUser.username,
                conflictError: syncResult.error,
                user: localUser, // Include user data for potential use
              };
            }
          }
        } catch (error) {
          console.error("Sync failed during login:", error);
        }
      }

      return { success: true, user: localUser };
    }

    // If local login failed, try cloud if online
    const online = await isOnline();

    if (online) {
      console.log("Local login failed, trying cloud login...");

      try {
        // Try SQLite - send plain password, backend handles hashing
        const user = await api.post("/api/v1/user/login", {
          username,
          password, // Send plain password, not hashed
        });

        // Update/create local copy with same password format as SQLite (plain text)
        await window.electronAPI.db.storeUserCredentials(user.id, {
          username: user.username,
          email: user.email,
          name: user.name,
          password: password, // Store same plain text password as SQLite
          created_at: user.created_at,
          updated_at: user.updated_at, // Use SQLite timestamp
          last_synced_at: user.updated_at, // Set to SQLite's updated_at since we just got the latest data
        });

        // Create complete user object for session (including password for sync)
        const completeUser = {
          ...user,
          password: password, // Include password in session for sync operations
        };

        // Set user session
        localStorage.setItem("user", JSON.stringify(completeUser));
        localStorage.setItem("token", user.token || "");

        console.log("User logged in successfully (cloud):", user.email);
        return { success: true, user };
      } catch (error) {
        console.log("Cloud login also failed");
      }
    }

    // Both local and cloud login failed
    console.log("Login failed - invalid credentials");
    return { success: false, error: "Invalid username or password" };
  } catch (error) {
    console.error("Login error:", error);

    // Clean up any stale data
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    throw error;
  }
};

/**
 * Logout user - clear both local and session data
 */
export const logoutUser = async (): Promise<void> => {
  try {
    console.log("Logging out user...");

    // Clear session data
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Clear local credentials
    await window.electronAPI.db.clearUserCredentials();

    console.log("User logged out successfully");
  } catch (error) {
    console.error("Error during logout:", error);

    // Force cleanup even if there's an error
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
};

/**
 * Get current user from local storage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  return !!getCurrentUser();
};

/**
 * Get current user ID
 */
export const getCurrentUserId = (): string => {
  const user = getCurrentUser();
  return user?.id || "";
};

// Removed background sync functionality - sync only happens on login/registration

// Wait for authentication utilities
export const waitForAuthentication = async (
  maxWaitTime = 5000,
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const userId = getCurrentUserId();
    if (userId) return true;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.warn("Authentication timed out");
  return false;
};

// Set user data utility
export const setCurrentUser = (userData: any) => {
  localStorage.setItem("user", JSON.stringify(userData));
};

/**
 * Update username for a user (both locally and in SQLite if online)
 */
export const updateUsername = async (
  newUsername: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current user ID from session storage
    const currentSessionUser = getCurrentUser();
    if (!currentSessionUser || !currentSessionUser.id) {
      return { success: false, error: "No current user in session" };
    }

    // Use session user data directly since we can't get specific user from DB without getUserById
    const localUser = currentSessionUser;
    if (!localUser) {
      return { success: false, error: "No local user data available" };
    }

    const online = await isOnline();

    if (online) {
      // If online, check availability first
      const availability = await checkUsernameAvailability(newUsername);
      if (!availability.available) {
        return {
          success: false,
          error:
            "Username is already taken. Please choose a different username.",
        };
      }

      // Prepare updated user data for sync
      const updatedUserData = {
        ...localUser,
        username: newUsername,
        updated_at: new Date().toISOString(),
        last_synced_at: null, // Mark as needing sync
      };

      // Try to sync to SQLite FIRST
      const syncResult = await syncUserToSQLite(updatedUserData);
      if (!syncResult.success) {
        return {
          success: false,
          error: syncResult.error || "Failed to sync username change to cloud",
        };
      }

      // Only update local storage AFTER successful sync
      await window.electronAPI.db.storeUserCredentials(localUser.id, {
        ...updatedUserData,
        last_synced_at: new Date().toISOString(), // Mark as synced since we just synced successfully
      });

      // Update session storage
      const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
      sessionUser.username = newUsername;
      sessionUser.last_synced_at = new Date().toISOString();
      localStorage.setItem("user", JSON.stringify(sessionUser));
    } else {
      // If offline, just update locally
      const updatedUserData = {
        ...localUser,
        username: newUsername,
        updated_at: new Date().toISOString(),
        last_synced_at: null, // Mark as needing sync when online
      };

      // Store updated user data locally
      await window.electronAPI.db.storeUserCredentials(
        localUser.id,
        updatedUserData,
      );

      // Update session storage
      const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
      sessionUser.username = newUsername;
      sessionUser.updated_at = updatedUserData.updated_at;
      sessionUser.last_synced_at = null;
      localStorage.setItem("user", JSON.stringify(sessionUser));
    }

    console.log(`Username updated to: ${newUsername}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update username:", error);
    return {
      success: false,
      error: error.message || "Failed to update username",
    };
  }
};
