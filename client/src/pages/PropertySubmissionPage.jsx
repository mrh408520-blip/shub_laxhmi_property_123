import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const initialForm = {
  title: "",
  type: "house",
  price: "",
  location: "",
  description: "",
  imageUrl: "",
};

export default function PropertySubmissionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");

  if (loading) return <main className="auth-page"><section className="auth-card"><p>Checking your account...</p></section></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: "/properties/submit" }} />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setState("idle");
    setFeedback("");
  }

  async function submit(event) {
    event.preventDefault();
    setState("sending");
    setFeedback("");
    try {
      await api.submitPropertyRequest({ ...form, price: Number(form.price), imageUrl: form.imageUrl || null });
      setState("success");
      setFeedback("Your property was submitted for administrator review.");
      setForm(initialForm);
    } catch (error) {
      setState("error");
      setFeedback(error.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card property-submission-card">
        <div className="auth-heading">
          <h1>Submit a Property</h1>
          <p>Share your listing for review by our property team.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="submission-title">Property Title</label>
            <input id="submission-title" name="title" required minLength={3} maxLength={160} value={form.title} onChange={update} />
          </div>
          <div className="form-field">
            <label htmlFor="submission-type">Property Type</label>
            <select id="submission-type" name="type" value={form.type} onChange={update}>
              <option value="plot">Plot</option>
              <option value="house">House</option>
              <option value="rental">Rental</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="submission-price">Price (INR)</label>
            <input id="submission-price" name="price" type="number" min="0" max="1000000000000" step="1" required value={form.price} onChange={update} />
          </div>
          <div className="form-field">
            <label htmlFor="submission-location">Location</label>
            <input id="submission-location" name="location" required minLength={2} maxLength={180} value={form.location} onChange={update} />
          </div>
          <div className="form-field">
            <label htmlFor="submission-image">Image URL (optional)</label>
            <input id="submission-image" name="imageUrl" type="url" maxLength={2048} value={form.imageUrl} onChange={update} />
          </div>
          <div className="form-field">
            <label htmlFor="submission-description">Description</label>
            <textarea id="submission-description" name="description" rows="4" required maxLength={5000} value={form.description} onChange={update} />
          </div>
          {feedback && <p className={`form-feedback ${state === "success" ? "form-success" : "form-error"}`} role={state === "error" ? "alert" : "status"}>{feedback}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Submitting..." : "Submit for Review"}
          </button>
          <button className="auth-switch" type="button" onClick={() => navigate("/properties")}>Cancel</button>
        </form>
        <p><Link to="/properties">Back to properties</Link></p>
      </section>
    </main>
  );
}
