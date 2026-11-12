import { useState } from "react";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Crown,
  Heart,
  Images,
  MapPin,
  Phone,
  Ruler,
} from "lucide-react";
import { Link } from "react-router-dom";
import { resolvePropertyImageUrl } from "../api.js";

const propertyTypeLabels = {
  plot: "Plot",
  house: "Independent House",
  rental: "Apartment",
  commercial: "Commercial",
};

const statusLabels = {
  available: "Available",
  sold: "Sold",
  rented: "Rented",
};

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function PropertyCard({ property }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const gallery = [...new Set(
    [property.imageUrl, ...(property.imageUrls || [])]
      .filter(Boolean)
      .map(resolvePropertyImageUrl),
  )];
  const propertyStatus = property.status === "rented" || property.status === "sold"
    ? statusLabels[property.status]
    : property.type === "rental" ? "For Rent" : "For Sale";

  return (
    <article className="property-card">
      <div className="property-card-media">
        {gallery[0] ? (
          <img className="property-image" src={gallery[0]} alt={property.title} loading="lazy" />
        ) : (
          <div className="property-image-placeholder" aria-hidden="true"><MapPin size={32} /></div>
        )}
        {property.featured && (
          <span className="property-featured-badge"><Crown size={13} fill="currentColor" /> Featured</span>
        )}
        {property.source === "sample" && <span className="property-sample-badge">Sample data</span>}
        <button
          className={`property-favorite${isFavorite ? " is-favorite" : ""}`}
          type="button"
          aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={isFavorite}
          onClick={() => setIsFavorite((value) => !value)}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        {gallery.length > 0 && (
          <span className="property-image-count"><Images size={13} /> 1 / {gallery.length}</span>
        )}
      </div>
      <div className="property-card-content">
        <div className="property-card-tags">
          <span className={`property-status-badge${propertyStatus === "For Rent" ? " is-rent" : ""}`}>{propertyStatus}</span>
          <span className="property-type-badge">{propertyTypeLabels[property.type] || property.type}</span>
        </div>
        <h3>{property.title}</h3>
        <p className="property-location"><MapPin size={15} aria-hidden="true" />{property.location}</p>
        <strong className="property-price">{formatPrice(property.price)}</strong>
        <div className="property-card-specs" aria-label="Property specifications">
          <span><BedDouble size={16} aria-hidden="true" />{property.bedrooms ?? "—"}</span>
          <span><Bath size={16} aria-hidden="true" />{property.bathrooms ?? "—"}</span>
          <span><Ruler size={16} aria-hidden="true" />{property.areaSqFt ? `${Number(property.areaSqFt).toLocaleString("en-IN")} Sq.ft` : "— Sq.ft"}</span>
        </div>
        <div className="property-card-actions">
          <Link className="button button-primary property-view-button" to={`/properties/${encodeURIComponent(property.id)}`}>
            View Details <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            className="button button-outline property-contact-button"
            to={`/contact?propertyId=${encodeURIComponent(property.id)}&propertyTitle=${encodeURIComponent(property.title)}`}
          >
            <Phone size={15} aria-hidden="true" /> Contact
          </Link>
        </div>
      </div>
    </article>
  );
}
