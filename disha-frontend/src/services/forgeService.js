// src/services/forgeService.js
import API from "./api";

/**
 * Fetches a quiz for a specific skill and career.
 * @param {string} careerName - The name of the career.
 * @param {string} skill - The skill to be assessed.
 * @returns {Promise<Object>} The quiz data from the backend.
 */
export async function getAssessment(careerName, skill) {
  try {
    const response = await API.post("/forge/assessment", {
      career_name: careerName,
      skill: skill,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching assessment:", error.response?.data || error.message);
    throw new Error("Failed to generate or fetch the assessment quiz.");
  }
}

/**
 * Saves the user's score for a completed assessment.
 * @param {string} careerName - The name of the career.
 * @param {string} skill - The skill that was assessed.
 * @param {number} score - The user's percentage score.
 * @param {number} totalQuestions - The total number of questions in the quiz.
 * @returns {Promise<Object>} The confirmation from the backend.
 */
export async function saveAssessmentScore(careerName, skill, score, totalQuestions) {
  try {
    const response = await API.post("/forge/assessment/save", {
      career_name: careerName,
      skill: skill,
      score: score,
      total_questions: totalQuestions,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error saving assessment score:", error.response?.data || error.message);
    throw new Error("Failed to save your assessment score.");
  }
}

/**
 * Fetches learning resources for a specific skill.
 * @param {string} careerName - The context of the career.
 * @param {string} skill - The skill to find resources for.
 * @returns {Promise<Array>} A list of resource objects.
 */
export async function findResources(careerName, skill) {
  try {
    const response = await API.post("/forge/resources", {
      career_name: careerName,
      skill: skill,
    });
    return response.data.resources || [];
  } catch (error) {
    console.error("❌ Error finding resources:", error.response?.data || error.message);
    throw new Error("Failed to find learning resources.");
  }
}

/**
 * Generates personalized feedback based on incorrect quiz answers.
 * @param {Array} incorrectQuestions - A list of the questions the user got wrong.
 * @returns {Promise<Object>} An object containing feedback topics.
 */
export async function getFeedback(incorrectQuestions) {
  try {
    const response = await API.post("/forge/feedback", {
      incorrect_questions: incorrectQuestions,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Error getting feedback:", error.response?.data || error.message);
    throw new Error("Failed to generate feedback.");
  }
}
