import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { api } from "../api.js";

const mainPhone = import.meta.env.VITE_MAIN_PHONE || "+91-XXXXXXXXXX";
const emergencyPhone = import.meta.env.VITE_EMERGENCY_PHONE || "+91-XXXXXXXXXX";
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || "main123@gmail.com";

export default function Footer() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let active = true;
    api.site().then((result) => {
      if (active) setSettings(result.settings);
    }).catch((error) => console.error("Could not load the site contact settings.", error));
    return () => { active = false; };
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section>
          <h2>{settings?.websiteName || "Shubh Lakshmi Properties"}</h2>
          <p>Your trusted partner in finding the perfect property. We bring prosperity and success to your real estate journey.</p>
        </section>
        <section>
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/properties">Properties</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </section>
        <section>
          <h3>Contact Us</h3>
          <ul className="footer-contact">
            <li>
              <Phone size={19} aria-hidden="true" />
              <span>Main: {settings?.phone || mainPhone}<br />Emergency: {settings?.emergencyPhone || emergencyPhone}</span>
            </li>
            <li><Mail size={19} aria-hidden="true" /><a href={`mailto:${settings?.email || contactEmail}`}>{settings?.email || contactEmail}</a></li>
            <li><MapPin size={19} aria-hidden="true" /><span>Serving properties globally</span></li>
          </ul>
        </section>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} Shubh Lakshmi Properties. All rights reserved.
      </div>
    </footer>
  );
}
