import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../auth.jsx";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loading, signInAdmin } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <main className="auth-page"><section className="auth-card"><p className="form-feedback form-success">Checking session...</p></section></main>;
  if (user && user.role === "admin") return <Navigate to="/admin" replace />;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signInAdmin(form);
      navigate("/admin", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page admin-login-page">
      <section className="auth-card">
        <div className="auth-heading">
          <h1>Admin Login</h1>
          <p>Sign in with an authorized administrator account.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="admin-email">Admin Email</label>
            <div className="input-with-icon">
              <Mail size={19} aria-hidden="true" />
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={19} aria-hidden="true" />
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
          </div>
          {error && <p className="form-feedback form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Access Admin Panel"}
          </button>
        </form>
      </section>
    </main>
  );
}
