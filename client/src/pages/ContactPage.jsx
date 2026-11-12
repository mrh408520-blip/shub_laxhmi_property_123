import { useEffect, useState } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { api } from "../api.js";
import { useSearchParams } from "react-router-dom";

const mainPhone = import.meta.env.VITE_MAIN_PHONE || "+91-XXXXXXXXXX";
const emergencyPhone = import.meta.env.VITE_EMERGENCY_PHONE || "+91-XXXXXXXXXX";
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || "main123@gmail.com";
const whatsappUrl = import.meta.env.VITE_WHATSAPP_URL
  || "https://chat.whatsapp.com/GQWe0iAAVHN74BXEpDPC48?mode=gi_c";

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const propertyTitle = searchParams.get("propertyTitle");
  const propertyId = searchParams.get("propertyId");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: propertyTitle ? `I am interested in ${propertyTitle}.` : "",
    ...(propertyId ? { propertyId } : {}),
  });
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState("");
  const phone = settings?.phone || mainPhone;
  const emergencyPhoneNumber = settings?.emergencyPhone || emergencyPhone;
  const email = settings?.email || contactEmail;
  const whatsappDestination = settings?.whatsapp || whatsappUrl;
  const hasVerifiedPhone = !phone.includes("X");

  useEffect(() => {
    let active = true;
    api.site().then((result) => {
      if (active) setSettings(result.settings);
    }).catch((error) => setSettingsError(error.message));
    return () => { active = false; };
  }, []);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (state !== "idle") {
      setState("idle");
      setFeedback("");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setState("sending");
    setFeedback("");
    try {
      const result = await api.submitContact(form);
      setForm({ name: "", email: "", phone: "", message: "", ...(propertyId ? { propertyId } : {}) });
      setState("success");
      setFeedback(result.message);
    } catch (error) {
      setState("error");
      setFeedback(error.message);
    }
  }

  return (
    <main className="contact-page">
      <div className="page-container">
        <header className="page-intro">
          <h1>Contact Us</h1>
          <p>Get in touch with us for any inquiries. We’re here to help you find your perfect property.</p>
        </header>
        <div className="contact-grid">
          <section className="contact-card">
            <h2>Get In Touch</h2>
            {settingsError && <p className="form-feedback form-error" role="status">Contact details could not be refreshed.</p>}
            <div className="contact-item">
              <span className="contact-icon phone-icon"><Phone size={23} aria-hidden="true" /></span>
              <div>
                <h3>Phone Numbers</h3>
                <p>Main: {phone}<br />Emergency: {emergencyPhoneNumber}</p>
                {hasVerifiedPhone && <a className="button button-primary contact-action" href={`tel:${phone}`}> <Phone size={15} /> Call Now</a>}
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon whatsapp-contact-icon"><MessageCircle size={22} aria-hidden="true" /></span>
              <div>
                <h3>WhatsApp</h3>
                <p>{phone}</p>
                <a className="button button-whatsapp contact-action" href={whatsappDestination} target="_blank" rel="noreferrer">
                  <MessageCircle size={15} aria-hidden="true" /> Chat on WhatsApp
                </a>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon email-icon"><Mail size={23} aria-hidden="true" /></span>
              <div>
                <h3>Email</h3>
                <p><a href={`mailto:${email}`}>{email}</a></p>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon area-icon"><MapPin size={23} aria-hidden="true" /></span>
              <div>
                <h3>Service Area</h3>
                <p>Serving properties globally with local expertise</p>
              </div>
            </div>
            <div className="follow-us">
              <h3>Follow Us</h3>
              {settings?.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer">Facebook</a>}
              {settings?.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            </div>
          </section>

          <section className="contact-card">
            <h2>Send Us a Message</h2>
            <form className="contact-form" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="contact-name">Your Name</label>
                <input id="contact-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={update} />
              </div>
              <div className="form-field">
                <label htmlFor="contact-email">Email Address</label>
                <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={update} />
              </div>
              <div className="form-field">
                <label htmlFor="contact-phone">Phone Number</label>
                <input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={update} />
              </div>
              <div className="form-field">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" name="message" rows="5" required minLength={10} maxLength={5000} value={form.message} onChange={update} />
              </div>
              {feedback && (
                <p className={`form-feedback ${state === "success" ? "form-success" : "form-error"}`} role={state === "error" ? "alert" : "status"}>
                  {feedback}
                </p>
              )}
              <button className="button button-primary contact-submit" type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Sending..." : "Send Message"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
