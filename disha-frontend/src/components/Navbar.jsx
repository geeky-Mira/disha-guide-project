// src/components/Navbar.jsx
import { Link } from "react-router-dom";
import { Navbar, Nav, NavDropdown, Container } from "react-bootstrap";
import { Compass, User, LogOut, LogIn, Zap, Search, Star } from "lucide-react";
import { FaHome } from "react-icons/fa"; // Using react-icons for a filled icon
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import "./Navbar.css"; // Import the new CSS file

export default function AppNavbar() {
  const { user, initializing } = useAuth(); // Get the initializing state

  return (
    <Navbar bg="light" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <div className="d-flex align-items-center me-auto">
          <Link to="/" className="me-2">
            <FaHome size={28} className="text-dark" /> {/* Clickable Home Icon */}
          </Link>
          <div>
            <h5 className="mb-0 navbar-brand-catchy">Disha Guide</h5> {/* Non-clickable text */}
            <small className="text-muted d-none d-md-block">Your Career Architect</small>
          </div>
        </div>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/discover" className="d-flex align-items-center"><Search className="me-1" size={18} />Discover</Nav.Link>
            <Nav.Link as={Link} to="/career/recommendations" className="d-flex align-items-center"><Star className="me-1" size={18} />Recommendations</Nav.Link>
            <Nav.Link as={Link} to="/compass" className="d-flex align-items-center"><Compass className="me-1" size={18} />My Compass</Nav.Link>
            <Nav.Link as={Link} to="/forge" className="d-flex align-items-center"><Zap className="me-1" size={18} />Skill Forge</Nav.Link>
            
            {initializing ? (
              <Nav.Link disabled>Loading...</Nav.Link> // Show a placeholder during init
            ) : user ? (
              <NavDropdown title={<User />} id="profile-dropdown" align="end">
                <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => signOut(auth)}>
                  <LogOut className="me-2" size={18} />Sign Out
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link as={Link} to="/auth" className="d-flex align-items-center"><LogIn className="me-1" size={18} />Sign In</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
