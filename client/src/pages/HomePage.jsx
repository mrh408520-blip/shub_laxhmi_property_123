import { useEffect, useState } from "react";
import { ArrowRight, Building2, House, MapPin, Search, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import PropertyCard from "../components/PropertyCard.jsx";

const whatsappUrl = import.meta.env.VITE_WHATSAPP_URL
  || "https://chat.whatsapp.com/GQWe0iAAVHN74BXEpDPC48?mode=gi_c";

const categories = [
  { label: "Plots", type: "plot", icon: MapPin },
  { label: "Houses", type: "house", icon: House },
  { label: "Rentals", type: "rental", icon: Building2 },
  { label: "Commercial", type: "commercial", icon: Building2 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState("loading");
  const [siteContent, setSiteContent] = useState(null);
  const [whatsappDestination, setWhatsappDestination] = useState(whatsappUrl);
  const [siteError, setSiteError] = useState("");
  const [featuredRetry, setFeaturedRetry] = useState(0);

  useEffect(() => {
    api.site()
      .then(({ content, settings }) => {
        setSiteContent(content);
        if (settings.whatsapp) setWhatsappDestination(settings.whatsapp);
      })
      .catch((error) => setSiteError(error.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setFeaturedState("loading");
    api.properties({ featured: "true", limit: 3 }, { signal: controller.signal })
      .then(({ data }) => {
        setFeatured(data);
        setFeaturedState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setFeaturedState("error");
      });
    return () => controller.abort();
  }, [featuredRetry]);

  function search(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (location.trim()) query.set("location", location.trim());
    if (type) query.set("type", type);
    navigate(`/properties${query.size ? `?${query}` : ""}`);
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>{siteContent?.homeHeading || "Find Your Dream Property"}</h1>
          <p>{siteContent?.homeSubheading || "Bringing prosperity and success to your real estate journey with trusted properties across the globe"}</p>
          <form className="property-search" onSubmit={search}>
            <label className="sr-only" htmlFor="home-location">Search by location</label>
            <input
              id="home-location"
              type="search"
              maxLength={180}
              placeholder="Search by location..."
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <label className="sr-only" htmlFor="home-type">Property type</label>
            <select id="home-type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All Types</option>
              <option value="plot">Plot</option>
              <option value="house">House</option>
              <option value="rental">Rental Room</option>
              <option value="commercial">Commercial</option>
            </select>
            <button type="submit" className="button button-primary search-button">
              <Search size={19} aria-hidden="true" /> Search
            </button>
          </form>
          {siteError && <p className="state-message state-error" role="status">Some site settings could not be loaded. Existing contact links remain available.</p>}
          <a className="whatsapp-banner" href={whatsappDestination} target="_blank" rel="noreferrer">
            <span className="whatsapp-icon"><MessageCircle size={23} fill="currentColor" aria-hidden="true" /></span>
            <span className="whatsapp-copy">
              <small>Get instant updates &amp; deals</small>
              <strong>Join our Official WhatsApp Property Group</strong>
            </span>
            <span className="button whatsapp-button">Join Now</span>
          </a>
        </div>
      </section>

      <section className="category-section">
        <div className="page-container">
          <h2 className="section-title">Browse by Property Type</h2>
          <div className="category-grid">
            {categories.map(({ label, type: categoryType, icon: Icon }) => (
              <Link className="category-card" to={`/properties?type=${categoryType}`} key={categoryType}>
                <Icon size={43} strokeWidth={2.2} aria-hidden="true" />
                <h3>{label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="page-container">
          <div className="section-heading-row">
            <h2 className="section-title">Featured Properties</h2>
            <Link className="view-all" to="/properties">View All <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          {featuredState === "loading" && <p className="state-message">Loading properties...</p>}
          {featuredState === "error" && (
            <div className="state-message state-error">
              <p>Featured properties could not be loaded.</p>
              <button type="button" className="button button-secondary" onClick={() => setFeaturedRetry((value) => value + 1)}>Try Again</button>
            </div>
          )}
          {featuredState === "ready" && featured.length === 0 && (
            <p className="state-message">No featured properties are available yet.</p>
          )}
          {featured.length > 0 && (
            <div className="property-grid">
              {featured.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
          )}
        </div>
      </section>

      <section className="home-cta">
        <div className="page-container">
          <h2>{siteContent?.aboutHeadline || "Ready to Find Your Perfect Property?"}</h2>
          <p>{siteContent?.aboutContent || "Join thousands of satisfied customers who found their dream homes with us"}</p>
          <div className="cta-actions">
            <Link className="button button-light" to="/properties">Browse Properties</Link>
            <Link className="button button-outline-light" to="/contact">Contact Us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
