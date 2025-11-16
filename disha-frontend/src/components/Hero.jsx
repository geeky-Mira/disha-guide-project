// src/components/Hero.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Button, Container, Row, Col, Card, Placeholder } from "react-bootstrap";
import { Compass, MessageSquare, BarChart, Zap, Bot } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import "./Hero.css";

// Feature Card Component
const FeatureCard = ({ icon, title, text }) => (
  <Col md={6} lg={3} className="mb-4">
    <Card className="h-100 text-center shadow-sm feature-card">
      <Card.Body>
        <div className="feature-icon mb-3">{icon}</div>
        <Card.Title as="h5">{title}</Card.Title>
        <Card.Text>{text}</Card.Text>
      </Card.Body>
    </Card>
  </Col>
);

// Component for the call-to-action buttons
const HeroButtons = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <Placeholder as="p" animation="glow">
        <Placeholder.Button variant="primary" xs={4} size="lg" className="me-2" />
        <Placeholder.Button variant="outline-light" xs={4} size="lg" />
      </Placeholder>
    );
  }

  return (
    <>
      {user ? (
        <Link to="/discover">
          <Button variant="primary" size="lg">Start Your Journey</Button>
        </Link>
      ) : (
        <>
          <Link to="/discover">
            <Button variant="primary" size="lg" className="me-2">Start Your Journey</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline-light" size="lg">Sign In / Sign Up</Button>
          </Link>
        </>
      )}
    </>
  );
};

export default function Hero() {
  return (
    <>
      {/* Hero Section */}
      <Container fluid className="hero-section text-center text-white">
        <Container>
          <Row className="py-lg-4">
            <Col lg={8} className="mx-auto">
              <div className="chat-animation-container">
                <div className="ai-icon-container anim-bounce-in">
                  <Bot size={50} />
                </div>
                <div className="chat-bubble anim-bounce-in">
                  <h1 className="h2 fw-bold">Find Your Future, Today.</h1>
                </div>
              </div>
              <p className="lead my-4 anim-fade-in-up">
                Disha Guide is your personal AI mentor, helping you navigate the complexities of career choices with clarity and confidence.
              </p>
              <div className="d-grid gap-2 d-sm-flex justify-content-sm-center anim-fade-in-up-delayed">
                <HeroButtons />
              </div>
            </Col>
          </Row>
        </Container>
      </Container>

      {/* Features Section */}
      <Container className="py-4">
        <h2 className="text-center mb-4">Why Choose Disha Guide?</h2>
        <Row>
          <FeatureCard
            icon={<Compass size={40} />}
            title="Personalized Roadmap"
            text="Get a step-by-step guide tailored to your unique skills and aspirations."
          />
          <FeatureCard
            icon={<MessageSquare size={40} />}
            title="AI-Powered Chat"
            text="Engage in insightful conversations with our AI mentor to discover your path."
          />
          <FeatureCard
            icon={<BarChart size={40} />}
            title="Track Your Progress"
            text="Monitor your growth and stay motivated with our intuitive Compass dashboard."
          />
          <FeatureCard
            icon={<Zap size={40} />}
            title="Skill Assessments"
            text="Validate your skills and identify areas for improvement with our Forge quizzes."
          />
        </Row>
      </Container>
    </>
  );
}
