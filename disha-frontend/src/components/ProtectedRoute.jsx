// src/components/ProtectedRoute.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Container, Spinner, Alert } from "react-bootstrap";

// Custom messages for each page
const pageInfo = {
  Profile: {
    title: "Unlock Your Identity!",
    message: "This is your personal space where you can build and manage your career profile.",
  },
  Compass: {
    title: "Chart Your Course!",
    message: "Sign in to access your personalized career Compass and track your progress.",
  },
  Forge: {
    title: "The Anvil Awaits!",
    message: "Ready to test your mettle? Sign in to the Skill Forge and craft your expertise.",
  },
  Recommendations: {
    title: "Your Future is Calling!",
    message: "Sign in to discover the personalized career recommendations we've prepared just for you.",
  },
  Discover: {
    title: "Ready for an Adventure?",
    message: "Sign in to start a conversation with your AI career mentor and discover your true path.",
  },
  Default: {
    title: "Access Restricted",
    message: "Please sign in to view this page.",
  }
};

export default function ProtectedRoute({ children, pageName }) {
  const { user, initializing } = useAuth();
  const info = pageInfo[pageName] || pageInfo.Default;

  // While checking auth status, show a loading spinner
  if (initializing) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  // If not logged in, show the custom informational message
  if (!user) {
    return (
      <Container className="text-center py-5">
        <Alert variant="warning">
          <Alert.Heading>{info.title}</Alert.Heading>
          <p>{info.message}</p>
          <hr />
          <Link to="/auth" className="btn btn-primary">
            Sign In to Continue
          </Link>
        </Alert>
      </Container>
    );
  }

  // If logged in, render the requested component
  return children;
}
