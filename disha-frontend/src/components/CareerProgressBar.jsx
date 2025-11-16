import React from "react";
import PropTypes from "prop-types";

/**
 * CareerProgressBar Component
 * Displays both numeric and step-based progress information.
 *
 * Props:
 * - currentStep (number): current step index (1-based)
 * - totalSteps (number): total number of steps
 * - stepTitles (array): optional list of step names for display
 */
export default function CareerProgressBar({ currentStep, totalSteps, stepTitles = [] }) {
  const progressPercent = Math.min((currentStep / totalSteps) * 100, 100);

  const currentTitle =
    stepTitles && stepTitles.length >= currentStep
      ? stepTitles[currentStep - 1]
      : `Step ${currentStep}`;

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 text-primary fw-bold">
          {`Step ${currentStep} of ${totalSteps}: ${currentTitle}`}
        </h6>
        <span className="text-muted small">{`${Math.round(progressPercent)}% Completed`}</span>
      </div>

      <div className="progress" style={{ height: "12px" }}>
        <div
          className="progress-bar bg-success"
          role="progressbar"
          style={{ width: `${progressPercent}%` }}
          aria-valuenow={progressPercent}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
    </div>
  );
}

CareerProgressBar.propTypes = {
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  stepTitles: PropTypes.arrayOf(PropTypes.string),
};
