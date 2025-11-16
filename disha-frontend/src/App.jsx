// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppNavbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Footer from "./components/Footer.jsx";
import Profile from "./pages/Profile.jsx";
import Discover from "./pages/Discover.jsx";
import Compass from "./pages/Compass.jsx";
import Forge from "./pages/Forge.jsx";
import AuthPage from "./pages/Auth.jsx";
import CareerRecommendations from "./pages/CareerRecommendations.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import { AuthProvider } from "./contexts/AuthContext.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="d-flex flex-column min-vh-100">
          <AppNavbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Hero />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Protected Routes */}
              <Route path="/discover" element={<ProtectedRoute pageName="Discover"><Discover /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute pageName="Profile"><Profile /></ProtectedRoute>} />
              <Route path="/compass" element={<ProtectedRoute pageName="Compass"><Compass /></ProtectedRoute>} />
              <Route path="/forge" element={<ProtectedRoute pageName="Forge"><Forge /></ProtectedRoute>} />
              <Route path="/career/recommendations" element={<ProtectedRoute pageName="Recommendations"><CareerRecommendations /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
