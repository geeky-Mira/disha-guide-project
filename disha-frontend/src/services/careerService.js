// src/services/careerService.js
import API from "./api";

/**
 * Adds a selected career to the user's permanent compass.
 * @param {Object} careerData - The career object to add.
 * @returns {Promise<Object>} The backend confirmation response.
 */
export async function addCareerToCompass(careerData) {
  try {
    if (!careerData || !careerData.career_name) {
      throw new Error("Invalid career data provided to addCareerToCompass.");
    }
    const response = await API.post("/career/compass/add", careerData);
    return response.data;
  } catch (error) {
    console.error("❌ Error adding career to compass:", error.response?.data || error.message);
    throw new Error("Failed to add career to compass.");
  }
}

/**
 * Removes a career from the user's compass by its name.
 * @param {string} careerName - The name of the career to remove.
 * @returns {Promise<Object>} The backend confirmation response.
 */
export async function removeCareerFromCompass(careerName) {
  try {
    // The DELETE method in axios expects the body in a `data` property.
    const response = await API.delete("/career/compass/remove", {
      data: { career_name: careerName },
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error removing career from compass:", error.response?.data || error.message);
    throw new Error("Failed to remove career from compass.");
  }
}

/**
 * Triggers the backend to generate new career recommendations.
 * @returns {Promise<Object>} The backend confirmation and new recommendations.
 */
export async function refreshRecommendations() {
  try {
    const response = await API.post("/chat/recommendations/refresh");
    return response.data;
  } catch (error) {
    console.error("❌ Error refreshing recommendations:", error.response?.data || error.message);
    throw new Error("Failed to refresh recommendations.");
  }
}