import { useEffect, useState } from "react";
import { Filter, Trees } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import PropertyCard from "../components/PropertyCard.jsx";
import { useAuth } from "../auth.jsx";

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    status: searchParams.get("status") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    location: searchParams.get("location") || "",
  });
  const [result, setResult] = useState({ items: [], pagination: null });
  const [state, setState] = useState("loading");
  const [retryKey, setRetryKey] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    setFilters({
      type: searchParams.get("type") || "",
      status: searchParams.get("status") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      location: searchParams.get("location") || "",
    });
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    const query = Object.fromEntries(searchParams.entries());
    api.properties({ ...query, page: query.page || 1, limit: 12 }, { signal: controller.signal })
      .then(({ data, pagination }) => {
        setResult({ items: data, pagination });
        setState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [searchParams, retryKey]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") next.set(key, value);
    });
    setSearchParams(next);
  }

  function changePage(page) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="properties-page">
      <div className="page-container">
        <h1 className="page-title">All Properties</h1>
        <form className="filter-panel" onSubmit={applyFilters}>
          <h2><Filter size={20} aria-hidden="true" /> Filters</h2>
          <div className="filter-controls">
            <label className="sr-only" htmlFor="filter-location">Location</label>
            <input id="filter-location" name="location" type="search" maxLength="180" placeholder="Location" value={filters.location} onChange={updateFilter} />
            <label className="sr-only" htmlFor="filter-type">Property type</label>
            <select id="filter-type" name="type" value={filters.type} onChange={updateFilter}>
              <option value="">All Types</option>
              <option value="plot">Plot</option>
              <option value="house">House</option>
              <option value="rental">Rental</option>
              <option value="commercial">Commercial</option>
            </select>
            <label className="sr-only" htmlFor="filter-status">Property status</label>
            <select id="filter-status" name="status" value={filters.status} onChange={updateFilter}>
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
            <label className="sr-only" htmlFor="min-price">Minimum price</label>
            <input id="min-price" name="minPrice" type="number" min="0" placeholder="Min Price" value={filters.minPrice} onChange={updateFilter} />
            <label className="sr-only" htmlFor="max-price">Maximum price</label>
            <input id="max-price" name="maxPrice" type="number" min="0" placeholder="Max Price" value={filters.maxPrice} onChange={updateFilter} />
          </div>
          <button className="button button-primary filter-submit" type="submit">Apply Filters</button>
          {user && user.role !== "admin" && (
            <Link className="button button-secondary" to="/properties/submit">Submit a Property</Link>
          )}
        </form>

        <section className="listing-results" aria-live="polite">
          {state === "loading" && <p className="state-message">Loading properties...</p>}
          {state === "error" && (
            <div className="empty-state state-error">
              <h2>Properties could not be loaded</h2>
              <p>Please check your connection and try again.</p>
              <button className="button button-primary" type="button" onClick={() => setRetryKey((current) => current + 1)}>Try Again</button>
            </div>
          )}
          {state === "ready" && result.items.length === 0 && (
            <div className="empty-state">
              <Trees size={35} aria-hidden="true" />
              <h2>No properties found</h2>
              <p>Try adjusting your filters, or check back later for new listings.</p>
            </div>
          )}
          {state === "ready" && result.items.length > 0 && (
            <>
              <p className="results-count">{result.pagination.total} properties found</p>
              <div className="property-grid">
                {result.items.map((property) => <PropertyCard key={property.id} property={property} />)}
              </div>
              {result.pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={result.pagination.page <= 1}
                    onClick={() => changePage(result.pagination.page - 1)}
                  >Previous</button>
                  <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={result.pagination.page >= result.pagination.totalPages}
                    onClick={() => changePage(result.pagination.page + 1)}
                  >Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
