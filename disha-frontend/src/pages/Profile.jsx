// src/pages/Profile.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Form,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
  Stack,
  Card,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { useAuth, useUserProfile } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { deleteAccount } from "../services/userService";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { 
  FiUser, FiMail, FiAward, FiTarget, FiHeart, FiStar, FiEdit 
} from "react-icons/fi"; // Importing trendy icons

// A component to display a piece of profile information with an icon
const ProfileInfo = ({ icon, label, value }) => (
  <ListGroup.Item className="d-flex align-items-start border-0 px-3 py-3">
    <div className="me-3 text-primary">{icon}</div>
    <div>
      <strong className="d-block text-muted">{label}</strong>
      <span className="fs-6">{value || <span className="text-secondary">Not set</span>}</span>
    </div>
  </ListGroup.Item>
);

export default function Profile() {
  const { user, initializing } = useAuth();
  const { profile, loading, error, updateProfile } = useUserProfile(user?.uid);
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState(null);

  const resetForm = useCallback(() => {
    setForm({
      name: profile.name || "",
      education: profile.education || "",
      career_goals: profile.career_goals || "",
      interests: (profile.interests || []).join(", "),
      skills: (profile.skills || []).join(", "),
    });
  }, [profile]);

  useEffect(() => {
    if (profile) {
      resetForm();
    }
  }, [profile, resetForm]);

  const handleShowModal = () => {
    resetForm();
    setShowEditModal(true);
    setStatus(null);
  };

  const handleCloseModal = () => setShowEditModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus(null);

    const profileDataToSave = {
      ...form,
      interests: form.interests.split(',').map(item => item.trim()).filter(Boolean),
      skills: form.skills.split(',').map(item => item.trim()).filter(Boolean),
    };

    try {
      await updateProfile(profileDataToSave);
      setStatus({ type: "success", msg: "Profile saved successfully!" });
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save profile:", err);
      setStatus({ type: "danger", msg: "Failed to save profile. Please try again." });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setStatus(null);
    try {
      await deleteAccount();
      await signOut(auth);
      navigate("/");
    } catch (err) {
      setStatus({ type: "danger", msg: "Failed to delete account. Please try again." });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (initializing || (user && loading && !profile.name)) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="text-center py-5">
        <Alert variant="warning">
          You need to <strong>Sign In</strong> to view your profile.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container className="py-5">
        <Row className="justify-content-md-center">
          <Col md={8}>
            <h2 className="mb-4 text-center fw-bold">My Profile</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {status && status.type === "success" && <Alert variant="success">{status.msg}</Alert>}
            
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white border-0 p-3">
                <Stack direction="horizontal" gap={3}>
                  <div className="p-2 fw-bold">Profile Information</div>
                  <div className="p-2 ms-auto">
                    <Button variant="primary" onClick={handleShowModal} className="d-flex align-items-center">
                      <FiEdit className="me-2" /> Edit Profile
                    </Button>
                  </div>
                </Stack>
              </Card.Header>
              <ListGroup variant="flush">
                <ProfileInfo icon={<FiUser size={24} />} label="Name" value={profile.name} />
                <ProfileInfo icon={<FiMail size={24} />} label="Email" value={user.email} />
                <ProfileInfo icon={<FiAward size={24} />} label="Education" value={profile.education} />
                <ProfileInfo icon={<FiTarget size={24} />} label="Career Goals" value={profile.career_goals} />
                <ProfileInfo icon={<FiHeart size={24} />} label="Interests" value={(profile.interests || []).join(", ")} />
                <ProfileInfo icon={<FiStar size={24} />} label="Skills" value={(profile.skills || []).join(", ")} />
              </ListGroup>
            </Card>

            <Card className="mt-4 shadow-sm border-0">
              <Card.Header as="h5" className="bg-danger text-white">
                Danger Zone
              </Card.Header>
              <Card.Body>
                <Card.Text>
                  Deleting your account is a permanent action. All of your data, including your profile, chat history, and compass, will be permanently removed.
                </Card.Text>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  Delete My Account
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={handleCloseModal} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Edit Profile</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            {status && status.type === "danger" && <Alert variant="danger">{status.msg}</Alert>}
            
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" name="name" value={form.name || ''} onChange={handleChange} placeholder="e.g., Jane Doe" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Education</Form.Label>
              <Form.Control type="text" name="education" value={form.education || ''} onChange={handleChange} placeholder="e.g., B.S. in Computer Science" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Career Goals</Form.Label>
              <Form.Control type="text" name="career_goals" value={form.career_goals || ''} onChange={handleChange} placeholder="e.g., To become a Senior Software Engineer" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Interests (comma-separated)</Form.Label>
              <Form.Control type="text" name="interests" value={form.interests || ''} onChange={handleChange} placeholder="e.g., AI, Hiking, Photography" />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Skills (comma-separated)</Form.Label>
              <Form.Control type="text" name="skills" value={form.skills || ''} onChange={handleChange} placeholder="e.g., React, Python, UI/UX Design" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <><Spinner as="span" animation="border" size="sm" /> Saving...</> : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Are you absolutely sure?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          This action is irreversible. All your profile information, chat history, and compass data will be permanently deleted.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAccount} disabled={isDeleting}>
            {isDeleting ? <><Spinner as="span" size="sm" /> Deleting...</> : "Yes, Delete My Account"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
