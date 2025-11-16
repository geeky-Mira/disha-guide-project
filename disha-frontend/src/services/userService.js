// src/services/userService.js
import API from "./api";

/**
 * Fetches the full user document from Firestore by UID.
 * @param {string} uid - The Firebase UID of the user.
 * @returns {Promise<Object|null>} The user data object or null if not found.
 */
export async function fetchUserProfile(uid) {
  try {
    const response = await API.get(`/users/${uid}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`No profile found for UID: ${uid}`);
      return null;
    }
    console.error("❌ Error fetching user profile:", error.response?.data || error.message);
    throw new Error("Failed to fetch user profile.");
  }
}

/**
 * Saves or updates a user's profile data.
 * @param {string} uid - The Firebase UID of the user.
 * @param {Object} profileData - The profile data to save.
 * @returns {Promise<Object>} The response from the backend.
 */
export async function saveUserProfile(uid, profileData) {
  try {
    // Note: The backend /users/{user_id} endpoint expects the entire profile object.
    const response = await API.post(`/users/${uid}`, profileData);
    return response.data;
  } catch (error) {
    console.error("❌ Error saving user profile:", error.response?.data || error.message);
    throw new Error("Failed to save user profile.");
  }
}

/**
 * Deletes the current user's account and all associated data.
 * @returns {Promise<Object>} The confirmation message from the backend.
 */
export async function deleteAccount() {
  try {
    const response = await API.delete("/users/me");
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting account:", error.response?.data || error.message);
    throw new Error("Failed to delete account.");
  }
}
