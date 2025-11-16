// src/pages/Auth.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { emailSignUp, emailSignIn, resetPassword, checkEmailExists } from "../services/authService";
import { Container, Card, Form, Button, Alert, Nav } from "react-bootstrap";

// Helper function to validate password strength
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 6) {
    errors.push("be at least 6 characters long");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("contain at least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("contain at least one uppercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("contain at least one digit");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("contain at least one special character");
  }

  if (errors.length > 0) {
    return `Password must ${errors.join(", ")}.`;
  }
  return null;
};

export default function AuthPage() {
  const [mode, setMode] = useState("signin"); // signin, signup, or reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // --- Frontend Password Validation ---
    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return; // Stop the process if validation fails
      }
    }
    // --- End of Validation ---

    setLoading(true);

    try {
      if (mode === "signup") {
        await emailSignUp(email, password);
      } else {
        await emailSignIn(email, password);
      }
      navigate("/"); // Redirect to homepage on successful sign-in/up
    } catch (err) {
      // Map specific Firebase auth errors to user-friendly messages
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("This email is already in use. Please sign in or use a different email.");
          break;
        case 'auth/weak-password':
          // This is now a fallback, as frontend validation is stricter
          setError("The password is too weak. It must be at least 6 characters long.");
          break;
        case 'auth/invalid-credential':
          setError("Invalid email or password. Please try again.");
          break;
        default:
          setError("An unexpected error occurred. Please try again later.");
          break;
      }
      console.error("Authentication error:", err); // Keep detailed log for developers
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // First, check if the email is registered
      const userExists = await checkEmailExists(email);
      
      if (userExists) {
        // If it exists, send the reset email
        await resetPassword(email);
        setMessage("Password reset email sent! Please check your inbox.");
        setMode("signin"); // Switch back to sign-in view
      } else {
        // If it doesn't exist, show an error
        setError("No account found with this email address.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Password reset error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <Container className="text-center py-5">
        <h4>You are already logged in.</h4>
        <Button onClick={() => navigate("/discover")}>Go to Discover</Button>
      </Container>
    );
  }

  return (
    <Container className="py-5 d-flex justify-content-center">
      <Card style={{ width: "100%", maxWidth: "420px" }}>
        <Card.Body>
          <h2 className="text-center mb-4">
            {mode === "signup" && "Create Account"}
            {mode === "signin" && "Sign In"}
            {mode === "reset" && "Reset Password"}
          </h2>

          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}

          {mode === "reset" ? (
            <Form onSubmit={handlePasswordReset}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Email address</Form.Label>
                <Form.Control type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Email"}
              </Button>
            </Form>
          ) : (
            <Form onSubmit={handleAuthAction}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Email address</Form.Label>
                <Form.Control type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formBasicPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder={mode === 'signup' ? "6+ chars, 1 uppercase, 1 digit, 1 special" : "Password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? "Loading..." : (mode === "signup" ? "Sign Up" : "Sign In")}
              </Button>
            </Form>
          )}

          <Nav className="justify-content-between mt-3">
            {mode === "signin" && (
              <Nav.Link onClick={() => setMode("reset")} className="small">Forgot Password?</Nav.Link>
            )}
            {mode !== "reset" && (
              <Nav.Link onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="small">
                {mode === "signin" ? "Need an account? Sign Up" : "Have an account? Sign In"}
              </Nav.Link>
            )}
             {mode === "reset" && (
              <Nav.Link onClick={() => setMode("signin")} className="small">Back to Sign In</Nav.Link>
            )}
          </Nav>
        </Card.Body>
      </Card>
    </Container>
  );
}
