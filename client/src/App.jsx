import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import PropertiesPage from "./pages/PropertiesPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import PropertyDetailPage from "./pages/PropertyDetailPage.jsx";
import PropertySubmissionPage from "./pages/PropertySubmissionPage.jsx";
import { useAuth } from "./auth.jsx";

function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>The page you requested could not be found.</p>
    </main>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function RequireAdminAccess({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-feedback form-success">Checking admin access...</p>
        </section>
      </main>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/properties/submit" element={<PropertySubmissionPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<RequireAdminAccess><AdminPage /></RequireAdminAccess>} />
        <Route path="/admin/*" element={<RequireAdminAccess><AdminPage /></RequireAdminAccess>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  );
}
