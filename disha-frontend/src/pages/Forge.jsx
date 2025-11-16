// src/pages/Forge.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserProfile } from "../contexts/AuthContext";
import { getAssessment, saveAssessmentScore, getFeedback } from "../services/forgeService";
import { Container, Form, Button, Card, Spinner, Alert, ListGroup } from "react-bootstrap";
import { Check, X, Repeat, ArrowLeft, Target } from "lucide-react";

// Component to display the final, detailed results
const QuizResults = ({ quizData, userAnswers, onRetake, onFinish }) => {
  const { questions } = quizData;
  const totalQuestions = questions.length;
  const [feedback, setFeedback] = useState({ topics: [], loading: true });

  const incorrectQuestions = useMemo(() => 
    questions.filter((q, index) => userAnswers[index] !== q.correct_answer),
    [questions, userAnswers]
  );

  let score = totalQuestions - incorrectQuestions.length;

  useEffect(() => {
    const fetchFeedback = async () => {
      if (incorrectQuestions.length > 0) {
        try {
          const response = await getFeedback(incorrectQuestions);
          setFeedback({ topics: response.topics, loading: false });
        } catch (err) {
          setFeedback({ topics: ["Could not load feedback."], loading: false });
        }
      } else {
        setFeedback({ topics: [], loading: false });
      }
    };
    fetchFeedback();
  }, [incorrectQuestions]);

  return (
    <Card>
      <Card.Header as="h3" className="text-center">Assessment Results</Card.Header>
      <Card.Body>
        <div className="text-center mb-4">
          <h4 className="mb-3">Your Score:</h4>
          <p className="display-4 fw-bold">{score} / {totalQuestions}</p>
        </div>

        <Card className="mb-4 bg-light border-0">
          <Card.Body>
            <h5 className="mb-3 d-flex align-items-center">
              <Target size={20} className="me-2 text-primary" />
              Areas to Improve
            </h5>
            {feedback.loading ? (
              <div className="text-center"><Spinner size="sm" /> Analyzing results...</div>
            ) : (
              <ListGroup variant="flush">
                {feedback.topics.length > 0 ? (
                  feedback.topics.map((topic, index) => (
                    <ListGroup.Item key={index} className="bg-transparent">{topic}</ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="bg-transparent">Great job! No specific areas to improve on from this quiz.</ListGroup.Item>
                )}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        <h5 className="mb-3">Question Review:</h5>
        {questions.map((q, index) => {
          const userAnswer = userAnswers[index];
          const isCorrect = userAnswer === q.correct_answer;
          return (
            <Card key={index} className="mb-3">
              <Card.Body>
                <p><strong>{index + 1}. {q.question_text}</strong></p>
                <ListGroup>
                  {q.options.map((opt, oIndex) => {
                    let variant = "";
                    if (opt === q.correct_answer) variant = "success";
                    else if (opt === userAnswer) variant = "danger";

                    return (
                      <ListGroup.Item key={oIndex} variant={variant}>
                        {opt}
                        {opt === q.correct_answer && <Check size={20} className="ms-2 text-success" />}
                        {opt === userAnswer && !isCorrect && <X size={20} className="ms-2 text-danger" />}
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
                {!isCorrect && (
                  <Alert variant="info" className="mt-3">
                    <strong>Explanation:</strong> {q.explanation}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          );
        })}
        <div className="mt-4 d-flex justify-content-between">
          <Button variant="secondary" onClick={onFinish}><ArrowLeft size={18} className="me-2" />Back to Forge</Button>
          <Button variant="primary" onClick={onRetake}><Repeat size={18} className="me-2" />Retake Assessment</Button>
        </div>
      </Card.Body>
    </Card>
  );
};



// The component for taking the quiz
const QuizDisplay = ({ quizData, careerName, skill, onQuizComplete }) => {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAnswerChange = (qIndex, answer) => {
    setAnswers(prev => ({ ...prev, [qIndex]: answer }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      let correct = 0;
      quizData.questions.forEach((q, index) => {
        if (answers[index] === q.correct_answer) correct++;
      });
      const total = quizData.questions.length;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

      await saveAssessmentScore(careerName, skill, percentage, total);
      
      onQuizComplete(answers);

    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setError("Sorry, there was an error saving your score. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <Card.Header as="h5">{quizData.quiz_title}</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {quizData.questions.map((q, qIndex) => (
            <div key={qIndex} className="mb-4">
              <p><strong>{qIndex + 1}. {q.question_text}</strong></p>
              <ListGroup>
                {q.options.map((opt, oIndex) => (
                  <ListGroup.Item key={oIndex}>
                    <Form.Check type="radio" id={`q${qIndex}-o${oIndex}`} label={opt} name={`question-${qIndex}`} value={opt} onChange={() => handleAnswerChange(qIndex, opt)} />
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          ))}
          
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

          <Button type="submit" disabled={saving}>
            {saving ? "Submitting..." : "Submit Answers"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default function Forge() {
  const { savedPaths, loading: profileLoading, refreshUserData } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedCareer, setSelectedCareer] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState(null); // To hold answers for the results view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("form"); // 'form', 'quiz', or 'results'

  const availableSkills = useMemo(() => {
    if (!selectedCareer) return [];
    const career = savedPaths.find(p => p.career_name === selectedCareer);
    return career ? career.pathway : [];
  }, [selectedCareer, savedPaths]);

  const handleGenerateQuiz = useCallback(async (career, skill) => {
    if (!career || !skill) return;
    setLoading(true);
    setError("");
    setQuizData(null);
    try {
      const data = await getAssessment(career, skill);
      setQuizData(data);
      setSelectedCareer(career);
      setSelectedSkill(skill);
      setView("quiz");
    } catch (err) {
      setError(err.message);
      setView("form");
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    const { careerName, skill } = location.state || {};
    if (careerName && skill) {
      handleGenerateQuiz(careerName, skill);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleGenerateQuiz, navigate]);

  const resetQuizState = () => {
    setQuizData(null);
    setUserAnswers(null);
    setSelectedCareer("");
    setSelectedSkill("");
    setView("form");
  };

  const handleQuizComplete = async (answers) => {
    await refreshUserData();
    setUserAnswers(answers);
    setView("results");
  };

  const handleRetake = () => {
    setUserAnswers(null);
    setQuizData(null); // Clear old quiz data to trigger loading state
    setView("quiz");   // Switch view immediately
    handleGenerateQuiz(selectedCareer, selectedSkill);
  };

  if (profileLoading) return <Container className="text-center mt-5"><Spinner /></Container>;

  if (savedPaths.length === 0) {
    return (
      <Container className="text-center mt-5">
        <Alert variant="info">Add careers to <strong>My Compass</strong> to generate assessments.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {view === 'form' && (
        <Card>
          <Card.Header as="h2">Skill Forge</Card.Header>
          <Card.Body>
            <Card.Text>Select a career and skill to generate a practice quiz.</Card.Text>
            <Form.Group className="mb-3">
              <Form.Label>1. Select a Career Path</Form.Label>
              <Form.Select value={selectedCareer} onChange={e => { setSelectedCareer(e.target.value); setSelectedSkill(""); }}>
                <option value="">-- Choose a career --</option>
                {savedPaths.map(p => <option key={p.career_name} value={p.career_name}>{p.career_name}</option>)}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>2. Select a Skill to Assess</Form.Label>
              <Form.Select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)} disabled={!selectedCareer}>
                <option value="">-- Choose a skill --</option>
                {availableSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Form.Group>

            {error && <Alert variant="danger">{error}</Alert>}

            <Button onClick={() => handleGenerateQuiz(selectedCareer, selectedSkill)} disabled={loading || !selectedSkill}>
              {loading ? <><Spinner as="span" size="sm" /> Generating...</> : "Generate Quiz"}
            </Button>
          </Card.Body>
        </Card>
      )}

      {view === 'quiz' && (
        quizData ? (
          <QuizDisplay 
            quizData={quizData} 
            careerName={selectedCareer} 
            skill={selectedSkill} 
            onQuizComplete={handleQuizComplete} 
          />
        ) : (
          <div className="text-center mt-5">
            <Spinner animation="border" />
            <p className="mt-3">Generating new quiz...</p>
          </div>
        )
      )}

      {view === 'results' && quizData && userAnswers && (
        <QuizResults
          quizData={quizData}
          userAnswers={userAnswers}
          onRetake={handleRetake}
          onFinish={resetQuizState}
        />
      )}
    </Container>
  );
}
