import { useState } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, signIn, signUp, signOut } = useAuth();

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage("");
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (isRegistering) {
        await signUp({ name: form.name, email: form.email, password: form.password });
        setMessage("Your account has been created and you are signed in.");
      } else {
        await signIn({ email: form.email, password: form.password });
        setMessage("You are now signed in.");
      }
      const returnTo = location.state?.from;
      if (typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("/admin")) {
        navigate(returnTo, { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    try {
      await signOut();
      setMessage("You have been signed out.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <h1>{isRegistering ? "Create Account" : "Welcome Back"}</h1>
          <p>{isRegistering ? "Join Shubh Lakshmi Properties" : "Sign in to your account"}</p>
        </div>
        {user ? (
          <div className="signed-in-panel">
            <p>Signed in as <strong>{user.email}</strong>.</p>
            <button className="button button-primary" type="button" onClick={logout}>Sign Out</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            {isRegistering && (
              <div className="form-field">
                <label htmlFor="auth-name">Your Name</label>
                <div className="input-with-icon">
                  <UserRound size={19} aria-hidden="true" />
                  <input id="auth-name" name="name" autoComplete="name" placeholder="Enter your name" required minLength={2} maxLength={100} value={form.name} onChange={update} />
                </div>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="auth-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={19} aria-hidden="true" />
                <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="Enter your email" required maxLength={254} value={form.email} onChange={update} />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="auth-password">Password</label>
              <div className="input-with-icon">
                <LockKeyhole size={19} aria-hidden="true" />
                <input id="auth-password" name="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} placeholder="Enter your password" required minLength={isRegistering ? 10 : 1} maxLength={128} value={form.password} onChange={update} />
              </div>
              {isRegistering && <small className="field-hint">Use at least 10 characters.</small>}
            </div>
            {error && <p className="form-feedback form-error" role="alert">{error}</p>}
            {message && <p className="form-feedback form-success" role="status">{message}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : isRegistering ? "Sign Up" : "Sign In"}
            </button>
          </form>
        )}
        {!user && (
          <button
            className="auth-switch"
            type="button"
            onClick={() => {
              setIsRegistering((current) => !current);
              setMessage("");
              setError("");
            }}
          >
            {isRegistering ? "Already have an account? Sign in" : "Don’t have an account? Sign up"}
          </button>
        )}
        {user && message && <p className="form-feedback form-success" role="status">{message}</p>}
      </section>
    </main>
  );
}
