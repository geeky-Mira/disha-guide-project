// src/pages/Compass.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../contexts/AuthContext";
import { findResources } from "../services/forgeService";
import API from "../services/api";
import { Trash2, ChevronDown, ChevronUp, Edit, BookOpen } from "lucide-react";
import { Container, Card, Button, ProgressBar, Form, ListGroup, Badge, Alert, Stack, Modal, Spinner } from "react-bootstrap";

// Modal to display learning resources
const ResourceModal = ({ show, onHide, skill, career, resources, isLoading }) => (
  <Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
      <Modal.Title>Learning Resources for "{skill}"</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {isLoading ? (
        <div className="text-center"><Spinner /></div>
      ) : resources.length > 0 ? (
        <ListGroup variant="flush">
          {resources.map((res, idx) => (
            <ListGroup.Item key={idx} as="a" href={res.url} target="_blank" rel="noopener noreferrer">
              <div className="fw-bold">{res.title}</div>
              <small className="text-muted">{res.type}</small>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <p>No resources found at the moment. Please try again later.</p>
      )}
    </Modal.Body>
  </Modal>
);

// A single career path card with enhanced UI
const CareerPathCard = ({ path, onRemove, onSkillToggle, isExpanded, onToggleExpand, onFindResources }) => {
  const navigate = useNavigate();
  const progress = Math.round(path.progress || 0);

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <Card.Title>{path.career_name}</Card.Title>
            <Card.Text className="text-muted small">{path.description}</Card.Text>
          </div>
          <div>
            <Button variant="outline-danger" size="sm" className="me-2" onClick={onRemove} title="Remove"><Trash2 size={16} /></Button>
            <Button variant="outline-secondary" size="sm" onClick={onToggleExpand} title="Details">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button>
          </div>
        </div>
        <ProgressBar now={progress} label={`${progress}%`} variant="success" className="mt-3" />
        {isExpanded && (
          <div className="mt-4 pt-3 border-top">
            <h6><Badge bg="primary">Next Steps for Education</Badge></h6>
            <ListGroup variant="flush" className="mb-3">
              {path.education_pathway?.length > 0 ? (
                path.education_pathway.map((edu, idx) => <ListGroup.Item key={idx}>{edu}</ListGroup.Item>)
              ) : (
                <ListGroup.Item>Your current education appears sufficient.</ListGroup.Item>
              )}
            </ListGroup>
            <h6><Badge bg="primary">Pathway to Readiness</Badge></h6>
            <ListGroup>
              {path.pathway?.map((skill, idx) => (
                <ListGroup.Item key={idx}>
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Check type="checkbox" id={`${path.career_name}-${idx}`} label={skill} checked={path.skills_status[skill]?.status === 'complete'} onChange={(e) => onSkillToggle(path.career_name, skill, e.target.checked)} />
                    <Stack direction="horizontal" gap={2}>
                      {path.skills_status[skill]?.score != null && (<Badge pill bg="info">Score: {path.skills_status[skill].score}%</Badge>)}
                      <Button variant="outline-secondary" size="sm" onClick={() => onFindResources(skill)}><BookOpen size={14} className="me-1" /> Resources</Button>
                      <Button variant="outline-primary" size="sm" onClick={() => navigate("/forge", { state: { careerName: path.career_name, skill: skill } })}><Edit size={14} className="me-1" /> {path.skills_status[skill]?.score != null ? 'Retake' : 'Assess'}</Button>
                    </Stack>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default function Compass() {
  const { savedPaths, loading, error, removeCareer, refreshUserData } = useUserProfile();
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [resourceModal, setResourceModal] = useState({ show: false, skill: "", career: "", resources: [], isLoading: false });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [careerToDelete, setCareerToDelete] = useState(null);

  const handleRemoveClick = (careerName) => {
    setCareerToDelete(careerName);
    setShowDeleteModal(true);
  };

  const confirmRemove = async () => {
    if (!careerToDelete) return;
    await removeCareer(careerToDelete).catch(err => console.error("Error removing item:", err));
    setShowDeleteModal(false);
    setCareerToDelete(null);
  };

  const handleSkillToggle = async (careerName, skill, isComplete) => {
    try {
      await API.post("/career/compass/skill/update", { career_name: careerName, skill, is_complete: isComplete });
      await refreshUserData();
    } catch (err) {
      console.error("Error updating skill status:", err);
    }
  };

  const handleFindResources = async (careerName, skill) => {
    setResourceModal({ show: true, skill, career: careerName, resources: [], isLoading: true });
    try {
      const resources = await findResources(careerName, skill);
      setResourceModal(prev => ({ ...prev, resources, isLoading: false }));
    } catch (err) {
      console.error("Error finding resources:", err);
      setResourceModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (loading) return <Container className="text-center mt-5"><Spinner /></Container>;
  if (error) return <Container className="text-center mt-5"><Alert variant="danger">Could not load Compass.</Alert></Container>;
  if (savedPaths.length === 0) return (
    <Container className="text-center mt-5">
      <Alert variant="info">
        <Alert.Heading>Your Compass is Empty!</Alert.Heading>
        <p>Add careers from <strong>Discover</strong> to track your progress.</p>
      </Alert>
    </Container>
  );

  return (
    <>
      <Container className="mt-4">
        <h2 className="mb-4 text-center">My Compass</h2>
        <p className="text-center text-muted mb-4">Here are the career paths you've saved.</p>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {savedPaths.map((path, idx) => (
              <CareerPathCard
                key={idx}
                path={path}
                isExpanded={expandedIndex === idx}
                onToggleExpand={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                onRemove={() => handleRemoveClick(path.career_name)}
                onSkillToggle={handleSkillToggle}
                onFindResources={(skill) => handleFindResources(path.career_name, skill)}
              />
            ))}
          </div>
        </div>
        <ResourceModal {...resourceModal} onHide={() => setResourceModal({ show: false, skill: "", career: "", resources: [], isLoading: false })} />
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Removal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove "<strong>{careerToDelete}</strong>" from your Compass?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRemove}>
            Yes, Remove
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
