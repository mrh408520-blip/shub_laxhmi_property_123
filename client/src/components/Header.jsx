import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";

const mainPhone = import.meta.env.VITE_MAIN_PHONE || "+91-XXXXXXXXXX";
const emergencyPhone = import.meta.env.VITE_EMERGENCY_PHONE || "+91-XXXXXXXXXX";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [contactInfo, setContactInfo] = useState(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    let active = true;
    api.site().then(({ settings }) => {
      if (active) setContactInfo(settings);
    }).catch((error) => console.error("Could not load the site contact settings.", error));
    return () => { active = false; };
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setSignOutError("");
      setMenuOpen(false);
    } catch (error) {
      setSignOutError(error.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <span><Phone aria-hidden="true" /> Main: {contactInfo?.phone || mainPhone}</span>
          <span className="topbar-divider">|</span>
          <span><Phone aria-hidden="true" /> Emergency: {contactInfo?.emergencyPhone || emergencyPhone}</span>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Shubh Lakshmi Properties home" onClick={() => setMenuOpen(false)}>
            <img src="/images/lotus.jpg" alt="" />
            <span className="brand-copy">
              <strong>Shubh Lakshmi</strong>
              <small>Properties</small>
            </span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/properties" onClick={() => setMenuOpen(false)}>Properties</NavLink>
            <NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink>
            {user ? (
              <button className="button button-primary nav-login" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <NavLink className="button button-primary nav-login" to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </NavLink>
            )}
            {signOutError && <p className="header-error" role="alert">{signOutError}</p>}
          </nav>
        </div>
      </header>
    </>
  );
}
