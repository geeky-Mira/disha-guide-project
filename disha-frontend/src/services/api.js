// src/services/api.js
import axios from "axios";
import { auth } from "../firebaseConfig";

// --- Environment Variable Check ---
// This ensures the app will fail loudly at build time if the backend URL is not provided.
const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
if (!apiBaseURL) {
  throw new Error("VITE_API_BASE_URL is not defined in your .env file. The application cannot start without it.");
}

/**
 * Axios instance configured for FastAPI backend.
 * Automatically attaches Firebase ID token for authentication.
 */
const API = axios.create({
  baseURL: apiBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor: Attach Firebase Auth Token
API.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(true);
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error("⚠️ Error attaching Firebase token:", error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// 🔹 Response Interceptor: Global error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("🔒 Unauthorized – Firebase token may be invalid or expired.");
    }
    if (import.meta.env.DEV) {
      console.error("❌ API error:", error.response || error.message);
    }
    return Promise.reject(error);
  }
);

export default API;
