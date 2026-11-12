import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Expand,
  MapPin,
  Phone,
  Ruler,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api, resolvePropertyImageUrl } from "../api.js";

const typeLabels = {
  plot: "Plot",
  house: "Independent House",
  rental: "Apartment",
  commercial: "Commercial",
};

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function PropertyList({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      <ul className="property-bullet-list">
        {items.map((item, index) => <li key={`${item}-${index}`}><Check size={16} aria-hidden="true" />{item}</li>)}
      </ul>
    </section>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [state, setState] = useState("loading");
  const [contact, setContact] = useState(null);
  const [contactError, setContactError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [enquiry, setEnquiry] = useState({ name: "", email: "", phone: "", message: "" });
  const [enquiryState, setEnquiryState] = useState("idle");
  const [enquiryFeedback, setEnquiryFeedback] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setProperty(null);
    setImageIndex(0);
    api.getProperty(id, { signal: controller.signal })
      .then(({ data }) => {
        setProperty(data);
        setState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState(error.status === 404 ? "not-found" : "error");
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    let active = true;
    api.site()
      .then(({ settings }) => {
        if (active) setContact(settings);
      })
      .catch(() => {
        if (active) setContactError(true);
      });
    return () => { active = false; };
  }, []);

  const gallery = useMemo(
    () => property ? [...new Set(
      [property.imageUrl, ...(property.imageUrls || [])]
        .filter(Boolean)
        .map(resolvePropertyImageUrl),
    )] : [],
    [property],
  );

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
      if (event.key === "ArrowRight") setImageIndex((current) => (current + 1) % gallery.length);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gallery.length, lightboxOpen]);

  function moveImage(direction) {
    setImageIndex((current) => (current + direction + gallery.length) % gallery.length);
  }

  function updateEnquiry(event) {
    setEnquiry((current) => ({ ...current, [event.target.name]: event.target.value }));
    setEnquiryState("idle");
    setEnquiryFeedback("");
  }

  async function submitEnquiry(event) {
    event.preventDefault();
    setEnquiryState("sending");
    setEnquiryFeedback("");
    try {
      const result = await api.submitContact({ ...enquiry, propertyId: property.id });
      setEnquiryState("success");
      setEnquiryFeedback(result.message);
      setEnquiry({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      setEnquiryState("error");
      setEnquiryFeedback(error.message);
    }
  }

  if (state === "loading") {
    return <main className="properties-page"><div className="page-container"><p className="state-message">Loading property...</p></div></main>;
  }
  if (state === "not-found") {
    return (
      <main className="properties-page">
        <div className="page-container empty-state">
          <h1>Property not found</h1>
          <p>This property may have been removed or is no longer available.</p>
          <Link className="button button-primary" to="/properties">Browse Properties</Link>
        </div>
      </main>
    );
  }
  if (state === "error") {
    return (
      <main className="properties-page">
        <div className="page-container empty-state state-error">
          <h1>Property could not be loaded</h1>
          <p>Please check your connection and try again.</p>
          <Link className="button button-secondary" to="/properties">Back to Properties</Link>
        </div>
      </main>
    );
  }

  const phone = contact?.phone || "";
  const callablePhone = phone.replace(/[^\d+]/g, "");
  const canCall = /\d{7,}/.test(callablePhone) && !/[xX]/.test(phone);
  let whatsappUrl = contact?.whatsapp || "";
  if (whatsappUrl) {
    try {
      const parsed = new URL(whatsappUrl);
      if (parsed.hostname === "wa.me" || parsed.hostname === "api.whatsapp.com") {
        parsed.searchParams.set("text", `I am interested in ${property.title}.`);
        whatsappUrl = parsed.toString();
      }
    } catch {
      whatsappUrl = "";
    }
  }

  const statusLabel = property.status === "sold"
    ? "Sold"
    : property.status === "rented"
      ? "Rented"
      : property.type === "rental" ? "For Rent" : "For Sale";
  const verifiedNearby = (property.nearbyLocations || []).filter((place) => place.verified);

  return (
    <main className="properties-page property-detail-page">
      <div className="page-container">
        <Link className="detail-back-link" to="/properties"><ArrowLeft size={17} /> Back to Properties</Link>
        <article className="property-detail">
          <section className="detail-gallery" aria-label="Property photo gallery">
            <div className="detail-gallery-main">
              {gallery.length ? (
                <img src={gallery[imageIndex]} alt={`${property.title} - image ${imageIndex + 1}`} />
              ) : (
                <div className="property-image-placeholder detail-image-placeholder"><MapPin size={42} /></div>
              )}
              {property.featured && <span className="property-featured-badge"><Crown size={15} fill="currentColor" /> Featured</span>}
              {gallery.length > 1 && (
                <>
                  <button className="gallery-arrow gallery-previous" type="button" onClick={() => moveImage(-1)} aria-label="Previous image"><ChevronLeft /></button>
                  <button className="gallery-arrow gallery-next" type="button" onClick={() => moveImage(1)} aria-label="Next image"><ChevronRight /></button>
                </>
              )}
              {gallery.length > 0 && (
                <>
                  <span className="gallery-counter">{imageIndex + 1} / {gallery.length}</span>
                  <button className="gallery-expand" type="button" onClick={() => setLightboxOpen(true)} aria-label="View image full screen"><Expand size={18} /></button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="detail-thumbnails" aria-label="Choose a property image">
                {gallery.map((image, index) => (
                  <button
                    className={`detail-thumbnail${index === imageIndex ? " is-active" : ""}`}
                    type="button"
                    key={`${image}-${index}`}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={index === imageIndex}
                    onClick={() => setImageIndex(index)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="property-detail-content">
            <section className="detail-overview">
              <div className="property-detail-tags">
                <span className={`property-status-badge${statusLabel === "For Rent" ? " is-rent" : ""}`}>{statusLabel}</span>
                <span className="property-type-badge">{typeLabels[property.type] || property.type}</span>
                {property.featured && <span className="detail-featured-label"><Crown size={14} /> Featured</span>}
              </div>
              <h1>{property.title}</h1>
              <p className="property-location"><MapPin size={17} aria-hidden="true" />{property.address || property.location}</p>
              <div className="detail-price-row">
                <strong className="property-price">{formatPrice(property.price)}</strong>
                <span>Property ID: {property.id}</span>
              </div>
              <div className="detail-specs">
                {property.bedrooms !== undefined && <div><BedDouble /><strong>{property.bedrooms}</strong><span>Bedrooms</span></div>}
                {property.bathrooms !== undefined && <div><Bath /><strong>{property.bathrooms}</strong><span>Bathrooms</span></div>}
                {property.areaSqFt !== undefined && <div><Ruler /><strong>{Number(property.areaSqFt).toLocaleString("en-IN")}</strong><span>Sq.ft</span></div>}
                {property.parking !== undefined && <div><CarFront /><strong>{property.parking}</strong><span>Parking</span></div>}
              </div>
              <div className="detail-quick-actions">
                {canCall && <a className="button button-outline" href={`tel:${callablePhone}`}><Phone size={17} /> Call</a>}
                {whatsappUrl && <a className="button button-outline" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}
                <a className="button button-primary" href="#enquiry">Enquire Now <ArrowRight size={17} /></a>
              </div>
              {contactError && <p className="detail-contact-note" role="status">Phone and WhatsApp contact details are currently unavailable. You can still send an enquiry below.</p>}
            </section>

            <div className="property-detail-columns">
              <div className="property-detail-main-column">
                <section className="detail-section">
                  <h2>About this property</h2>
                  <p className="property-detail-description">{property.description}</p>
                </section>
                {property.highlights?.length > 0 && <PropertyList title="Property highlights" items={property.highlights} />}
                {property.amenities?.length > 0 && <PropertyList title="Amenities" items={property.amenities} />}
                {property.facilities?.length > 0 && <PropertyList title="Facilities" items={property.facilities} />}
                {property.additionalDetails?.length > 0 && <PropertyList title="Additional details" items={property.additionalDetails} />}
                {(property.address || property.latitude !== undefined || verifiedNearby.length > 0) && (
                  <section className="detail-section detail-location-section">
                    <h2>Location</h2>
                    {property.address && <p className="detail-full-address"><MapPin size={17} />{property.address}</p>}
                    {property.latitude !== undefined && property.longitude !== undefined && (
                      <div className="detail-map">
                        <iframe
                          title={`Map showing ${property.title}`}
                          src={`https://www.google.com/maps?q=${encodeURIComponent(`${property.latitude},${property.longitude}`)}&output=embed`}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                        <a href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`} target="_blank" rel="noreferrer">Open map</a>
                      </div>
                    )}
                    {verifiedNearby.length > 0 && (
                      <div className="verified-nearby">
                        <h3>Nearby locations</h3>
                        <ul>
                          {verifiedNearby.map((place, index) => (
                            <li key={`${place.name}-${index}`}>{place.name}{place.distance ? ` · ${place.distance}` : ""}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}
              </div>

              <aside className="property-detail-sidebar">
                <section className="detail-section detail-facts">
                  <h2>Property details</h2>
                  <dl>
                    <div><dt>Property type</dt><dd>{typeLabels[property.type] || property.type}</dd></div>
                    <div><dt>Listing status</dt><dd>{statusLabel}</dd></div>
                    {property.floor && <div><dt>Floor</dt><dd>{property.floor}</dd></div>}
                    {property.address && <div><dt>Address</dt><dd>{property.address}</dd></div>}
                    <div><dt>Property ID</dt><dd>{property.id}</dd></div>
                    <div><dt>Featured</dt><dd>{property.featured ? "Yes" : "No"}</dd></div>
                  </dl>
                </section>
                <section className="detail-section detail-enquiry" id="enquiry">
                  <h2>Enquire about this property</h2>
                  <p>Send your details and the listing team will get back to you.</p>
                  <form className="contact-form" onSubmit={submitEnquiry}>
                    <div className="form-field">
                      <label htmlFor="property-enquiry-name">Your name</label>
                      <input id="property-enquiry-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={enquiry.name} onChange={updateEnquiry} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="property-enquiry-email">Email address</label>
                      <input id="property-enquiry-email" name="email" type="email" autoComplete="email" required maxLength={254} value={enquiry.email} onChange={updateEnquiry} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="property-enquiry-phone">Phone number <span>(optional)</span></label>
                      <input id="property-enquiry-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} value={enquiry.phone} onChange={updateEnquiry} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="property-enquiry-message">Message</label>
                      <textarea id="property-enquiry-message" name="message" rows="4" required minLength={10} maxLength={5000} value={enquiry.message} onChange={updateEnquiry} />
                    </div>
                    {enquiryFeedback && (
                      <p className={`form-feedback ${enquiryState === "success" ? "form-success" : "form-error"}`} role={enquiryState === "error" ? "alert" : "status"}>
                        {enquiryFeedback}
                      </p>
                    )}
                    <button className="button button-primary contact-submit" type="submit" disabled={enquiryState === "sending"}>
                      {enquiryState === "sending" ? "Sending..." : "Send Enquiry"}
                    </button>
                  </form>
                </section>
              </aside>
            </div>
          </div>
        </article>
      </div>

      {lightboxOpen && gallery.length > 0 && (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Full-screen property gallery" onClick={(event) => {
          if (event.target === event.currentTarget) setLightboxOpen(false);
        }}>
          <button className="lightbox-close" type="button" aria-label="Close full-screen gallery" onClick={() => setLightboxOpen(false)}><X /></button>
          {gallery.length > 1 && <button className="lightbox-arrow lightbox-previous" type="button" aria-label="Previous image" onClick={() => moveImage(-1)}><ChevronLeft /></button>}
          <img src={gallery[imageIndex]} alt={`${property.title} - image ${imageIndex + 1}`} />
          {gallery.length > 1 && <button className="lightbox-arrow lightbox-next" type="button" aria-label="Next image" onClick={() => moveImage(1)}><ChevronRight /></button>}
          <span className="lightbox-counter">{imageIndex + 1} / {gallery.length}</span>
        </div>
      )}
    </main>
  );
}
