import React, { useState, useEffect } from "react";
import { useUserProfile } from "../contexts/AuthContext";

/**
 * CareerCard Component
 * Renders a single career recommendation and handles adding it to the user's compass.
 *
 * Props:
 *  - career: An object containing career details.
 *  - savedPaths: An array of career objects that the user has already saved.
 */
export default function CareerCard({ career, savedPaths = [] }) {
  const { addCareer } = useUserProfile();
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine if this career is already in the user's compass
  useEffect(() => {
    const alreadySaved = savedPaths.some(
      (p) => p.career_name === career.career_name
    );
    setIsAdded(alreadySaved);
  }, [savedPaths, career.career_name]);

  async function handleAddToCompass() {
    if (isAdded || isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      await addCareer(career);
      // The optimistic update in the hook will handle the state change,
      // but we can set it here for immediate feedback.
      setIsAdded(true);
    } catch (err) {
      console.error("❌ Error adding to compass:", err);
      setError("Failed to add. Please try again.");
      // The hook will revert the state, so isAdded will become false again.
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body d-flex flex-column">
        <h5 className="card-title text-primary">{career.career_name || "Untitled Career"}</h5>
        <p className="card-text text-muted flex-grow-1">
          {career.description || "No description available."}
        </p>

        {Array.isArray(career.pathway) && career.pathway.length > 0 && (
          <div className="mt-2">
            <strong>Suggested Pathway:</strong>
            <ul className="small mt-1 mb-0">
              {career.pathway.slice(0, 3).map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-3">
          <button
            className={`btn ${isAdded ? "btn-success" : "btn-outline-primary"} w-100`}
            onClick={handleAddToCompass}
            disabled={isAdded || isLoading}
          >
            {isLoading
              ? "Adding..."
              : isAdded
              ? "✅ Added to Compass"
              : "➕ Add to My Compass"}
          </button>
          {error && (
            <div className="text-danger small mt-2 text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}