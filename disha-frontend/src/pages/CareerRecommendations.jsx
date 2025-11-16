// src/pages/CareerRecommendations.jsx
import React, { useState } from "react";
import CareerCard from "../components/CareerCard";
import { useUserProfile } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { refreshRecommendations } from "../services/careerService";
import { Button, Spinner, Alert } from "react-bootstrap";
import { RefreshCw } from "lucide-react";

export default function CareerRecommendations() {
  const { initializing } = useAuth();
  const { recommendations, savedPaths, loading, error, refreshUserData } = useUserProfile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null); // Clear previous errors
    try {
      await refreshRecommendations();
      await refreshUserData(); // Re-fetch the user profile to get the new recommendations
    } catch (err) {
      console.error("Failed to refresh recommendations:", err);
      setRefreshError("We couldn't refresh your recommendations. Please try again in a moment.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Fetching personalized recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">
          Could not load recommendations. Please try again later.
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-info">
          <h4 className="alert-heading">No Recommendations Yet!</h4>
          <p>
            Your personalized career recommendations will appear here once you have a chat
            with Disha Guide in the <strong>Discover</strong> section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-center align-items-center mb-4">
        <h2 className="mb-0">Your Career Recommendations</h2>
        <Button
          variant="outline-primary"
          className="ms-3"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              <span className="ms-2">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} className="me-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {refreshError && (
        <Alert variant="danger" onClose={() => setRefreshError(null)} dismissible className="mb-4">
          {refreshError}
        </Alert>
      )}

      <p className="text-center text-muted mb-4">
        Based on your profile and our conversation, here are some paths you could explore.
      </p>
      <div className="row">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="col-md-6 col-lg-4 mb-4">
            <CareerCard career={rec} savedPaths={savedPaths} />
          </div>
        ))}
      </div>
    </div>
  );
}
