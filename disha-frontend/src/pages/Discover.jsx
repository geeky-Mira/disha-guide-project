// src/pages/Discover.jsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, useUserProfile } from "../contexts/AuthContext";
import API from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Trash2, Send } from "lucide-react";
import { 
  Container, 
  Card, 
  Form, 
  Button, 
  Spinner, 
  Alert,
  Stack,
  Modal // Import Modal
} from "react-bootstrap";

// A single chat turn component
const ChatTurn = ({ turn, onDelete }) => (
  <Card className="mb-3">
    <Card.Body>
      {turn.user && (
        <Stack direction="horizontal" gap={3} className="align-items-start mb-3">
          <div className="p-2 bg-light rounded-circle">👤</div>
          <div className="p-2 bg-light rounded w-100">
            <p className="m-0">{turn.user.text}</p>
          </div>
        </Stack>
      )}
      {turn.ai && (
        <Stack direction="horizontal" gap={3} className="align-items-start">
          <div className="p-2 bg-secondary text-white rounded-circle">🤖</div>
          <div className="p-2 bg-secondary bg-opacity-10 rounded w-100">
            {turn.ai.isTyping ? (
              <div className="d-flex align-items-center">
                <Spinner animation="grow" size="sm" className="me-2" />
                <span>Disha is typing...</span>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {turn.ai.text}
              </ReactMarkdown>
            )}
          </div>
        </Stack>
      )}
      {onDelete && (
        <div className="mt-2">
          <Button variant="link" size="sm" className="text-danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )}
    </Card.Body>
  </Card>
);

export default function Discover() {
  const { user, initializing } = useAuth();
  const { profile, recommendations, refreshUserData } = useUserProfile();
  const [chatTurns, setChatTurns] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false); // Track polling state
  const [showClearModal, setShowClearModal] = useState(false); // State for clear history modal
  const chatEndRef = useRef(null);

  // Check if the user's profile is complete enough to generate recommendations.
  const isProfileReadyForRecs = 
    profile &&
    profile.education &&
    profile.skills && profile.skills.length > 0 &&
    profile.interests && profile.interests.length > 0 &&
    profile.career_goals;

  // Fetch history on user login
  useEffect(() => {
    if (initializing || !user) {
      setChatTurns([]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const { data } = await API.get("/chat/history");
        setChatTurns(data.history || []);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    fetchHistory();
  }, [user, initializing]);

  // Poll for recommendations only when the profile is ready and recs are missing.
  useEffect(() => {
    let intervalId = null;

    if (user && isProfileReadyForRecs && (!recommendations || recommendations.length === 0)) {
      setIsPolling(true); // Start polling indicator
      intervalId = setInterval(() => {
        console.log("Polling for new recommendations...");
        refreshUserData();
      }, 5000); // Check every 5 seconds
    }

    // If recommendations appear, stop polling.
    if (recommendations && recommendations.length > 0) {
      setIsPolling(false); // Stop polling indicator
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    // Cleanup: stop polling when the component unmounts.
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, recommendations, refreshUserData, isProfileReadyForRecs]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    const userMessage = { text: input.trim() };
    const optimisticTurnId = `temp-${Date.now()}`;
    
    // Optimistic UI update
    setChatTurns(prev => [
      ...prev,
      { id: optimisticTurnId, user: userMessage, ai: { isTyping: true } }
    ]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await API.post("/chat", { message: userMessage.text });
      setChatTurns(data.history || []);
      await refreshUserData();
    } catch (err) {
      console.error("Error sending message:", err);
      const errorText = err.response?.data?.detail || "Could not connect to the server.";
      // Update the temporary turn with the error message
      setChatTurns(prev => prev.map(turn => 
        turn.id === optimisticTurnId 
          ? { ...turn, ai: { text: `Error: ${errorText}` } }
          : turn
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTurn = async (messageId) => {
    try {
      await API.delete(`/chat/${messageId}`);
      setChatTurns(prev => prev.filter(t => t.id !== messageId));
    } catch (err) {
      console.error("Failed to delete turn:", err);
    }
  };

  const handleClearAll = async () => {
    setShowClearModal(false); // Close the modal
    try {
      await API.delete("/chat/all");
      setChatTurns([]);
      await refreshUserData();
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatTurns, loading]);

  return (
    <>
      <Container className="py-4 d-flex flex-column" style={{ maxHeight: "80vh" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Disha Career Chat</h2>
          {chatTurns.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setShowClearModal(true)}>
              Clear History
            </Button>
          )}
        </div>

        <div className="flex-grow-1 overflow-auto p-2 bg-light border rounded">
          {chatTurns.length === 0 && !loading && (
            <p className="text-center text-muted mt-5">
              No conversations yet. Start by saying hello 👋
            </p>
          )}
          {chatTurns.map(turn => (
            <ChatTurn key={turn.id} turn={turn} onDelete={turn.id.startsWith('temp-') ? null : () => handleDeleteTurn(turn.id)} />
          ))}
          <div ref={chatEndRef}></div>
        </div>

        {recommendations && recommendations.length > 0 && (
          <Alert variant="success" className="mt-3">
            <Alert.Heading>Recommendations Ready!</Alert.Heading>
            <p>Your personalized career recommendations are available to view.</p>
            <Link to="/career/recommendations" className="btn btn-primary">
              View Recommendations
            </Link>
          </Alert>
        )}

        <Form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="mt-3"
        >
          <Stack direction="horizontal" gap={2}>
            <Form.Control
              as="textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={!user || loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </Button>
          </Stack>
        </Form>

        {isPolling && (
          <Alert variant="info" className="mt-3 text-center" onClose={() => setIsPolling(false)} dismissible>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            We are generating your personalized career recommendations. This may take a moment...
          </Alert>
        )}
      </Container>

      {/* Clear History Confirmation Modal */}
      <Modal show={showClearModal} onHide={() => setShowClearModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Clear Chat History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to permanently delete this entire conversation?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearAll}>
            Yes, Clear History
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
