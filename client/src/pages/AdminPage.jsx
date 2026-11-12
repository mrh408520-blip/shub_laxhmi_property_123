import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, resolvePropertyImageUrl } from "../api.js";
import { useAuth } from "../auth.jsx";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "add-property", label: "Add New Property", icon: Plus },
  { id: "property-requests", label: "Property Requests", icon: FileText },
  { id: "users", label: "Users", icon: Users },
  { id: "enquiries", label: "Enquiries / Contacts", icon: Mail },
  { id: "upload-requests", label: "Upload Requests", icon: UploadCloud },
  { id: "site-settings", label: "Site Settings", icon: Settings },
  { id: "website-content", label: "Website Content", icon: ShieldCheck },
];

const emptyProperty = {
  title: "",
  type: "house",
  status: "available",
  price: "",
  location: "",
  description: "",
  imageUrl: "",
  featured: false,
  imageUrlsText: "",
  bedrooms: "",
  bathrooms: "",
  areaSqFt: "",
  parking: "",
  floor: "",
  address: "",
  latitude: "",
  longitude: "",
  highlightsText: "",
  amenitiesText: "",
  facilitiesText: "",
  additionalDetailsText: "",
};

const emptySettings = {
  websiteName: "",
  email: "",
  phone: "",
  emergencyPhone: "",
  facebook: "",
  instagram: "",
  whatsapp: "",
};

const emptyContent = {
  homeHeading: "",
  homeSubheading: "",
  aboutHeadline: "",
  aboutContent: "",
};

function statusClass(value) {
  if (["approved", "active", "new", "reviewed"].includes(String(value).toLowerCase())) return "status-positive";
  if (["rejected", "inactive", "closed", "sold", "rented"].includes(String(value).toLowerCase())) return "status-negative";
  return "status-warning";
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function Feedback({ error, message }) {
  if (!error && !message) return null;
  return (
    <p className={`form-feedback ${error ? "form-error" : "form-success"}`} role={error ? "alert" : "status"}>
      {error || message}
    </p>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="admin-stat-card">
      <span className="admin-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PropertyForm({ initial, busy, onCancel, onSave }) {
  const [form, setForm] = useState(() => initial ? {
    title: initial.title,
    type: initial.type,
    status: initial.status,
    price: initial.price,
    location: initial.location,
    description: initial.description,
    imageUrl: initial.imageUrl || "",
    featured: Boolean(initial.featured),
    imageUrlsText: (initial.imageUrls || []).join("\n"),
    bedrooms: initial.bedrooms ?? "",
    bathrooms: initial.bathrooms ?? "",
    areaSqFt: initial.areaSqFt ?? "",
    parking: initial.parking ?? "",
    floor: initial.floor || "",
    address: initial.address || "",
    latitude: initial.latitude ?? "",
    longitude: initial.longitude ?? "",
    highlightsText: (initial.highlights || []).join("\n"),
    amenitiesText: (initial.amenities || []).join("\n"),
    facilitiesText: (initial.facilities || []).join("\n"),
    additionalDetailsText: (initial.additionalDetails || []).join("\n"),
  } : emptyProperty);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.imageUrl ? resolvePropertyImageUrl(initial.imageUrl) : "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function submit(event) {
    event.preventDefault();
    const optionalNumbers = ["bedrooms", "bathrooms", "areaSqFt", "parking", "latitude", "longitude"];
    const optionalLists = {
      imageUrls: "imageUrlsText",
      highlights: "highlightsText",
      amenities: "amenitiesText",
      facilities: "facilitiesText",
      additionalDetails: "additionalDetailsText",
    };
    const values = { ...form, price: Number(form.price), imageUrl: form.imageUrl || null };
    optionalNumbers.forEach((key) => {
      if (form[key] === "") delete values[key];
      else values[key] = Number(form[key]);
    });
    Object.entries(optionalLists).forEach(([key, formKey]) => {
      const entries = form[formKey].split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (entries.length) values[key] = entries;
      else delete values[key];
      delete values[formKey];
    });
    if (form.latitude === "" && form.longitude === "") {
      delete values.latitude;
      delete values.longitude;
    }
    await onSave({
      ...values,
    }, file);
  }

  return (
    <form className="admin-card add-property-card" onSubmit={submit}>
      <div className="admin-panel-header compact-header">
        <div>
          <p className="admin-kicker">{initial ? "Edit Listing" : "Create Listing"}</p>
          <h2>{initial ? "Edit Property" : "Add New Property"}</h2>
        </div>
      </div>
      <div className="add-property-grid">
        <div className="property-form">
          <label className="admin-form-group">
            <span>Property Title</span>
            <input name="title" value={form.title} onChange={update} required minLength={3} maxLength={160} />
          </label>
          <label className="admin-form-group">
            <span>Property Type</span>
            <select name="type" value={form.type} onChange={update}>
              <option value="plot">Plot</option>
              <option value="house">House</option>
              <option value="rental">Rental</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>
          <label className="admin-form-group">
            <span>Price (INR)</span>
            <input name="price" type="number" min="0" max="1000000000000" step="1" value={form.price} onChange={update} required />
          </label>
          <label className="admin-form-group">
            <span>Location</span>
            <input name="location" value={form.location} onChange={update} required minLength={2} maxLength={180} />
          </label>
          {initial && (
            <label className="admin-form-group">
              <span>Status</span>
              <select name="status" value={form.status} onChange={update}>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
              </select>
            </label>
          )}
          <label className="admin-form-group">
            <span>Description</span>
            <textarea name="description" value={form.description} onChange={update} required maxLength={5000} />
          </label>
          <label className="admin-form-group">
            <span>Image URL (optional)</span>
            <input name="imageUrl" type="url" maxLength={2048} value={file ? "" : form.imageUrl || ""} onChange={update} />
          </label>
          <label className="admin-form-group">
            <span><input name="featured" type="checkbox" checked={Boolean(form.featured)} onChange={update} /> Feature on homepage</span>
          </label>
          <details className="admin-property-details">
            <summary>Additional property details</summary>
            <div className="admin-property-details-grid">
              <label className="admin-form-group"><span>Bedrooms</span><input name="bedrooms" type="number" min="0" max="100" value={form.bedrooms} onChange={update} /></label>
              <label className="admin-form-group"><span>Bathrooms</span><input name="bathrooms" type="number" min="0" max="100" value={form.bathrooms} onChange={update} /></label>
              <label className="admin-form-group"><span>Area (sq.ft)</span><input name="areaSqFt" type="number" min="0" value={form.areaSqFt} onChange={update} /></label>
              <label className="admin-form-group"><span>Parking spaces</span><input name="parking" type="number" min="0" max="100" value={form.parking} onChange={update} /></label>
              <label className="admin-form-group"><span>Floor</span><input name="floor" maxLength={80} value={form.floor} onChange={update} /></label>
              <label className="admin-form-group"><span>Full address</span><input name="address" maxLength={500} value={form.address} onChange={update} /></label>
              <label className="admin-form-group"><span>Latitude</span><input name="latitude" type="number" min="-90" max="90" step="any" value={form.latitude} onChange={update} /></label>
              <label className="admin-form-group"><span>Longitude</span><input name="longitude" type="number" min="-180" max="180" step="any" value={form.longitude} onChange={update} /></label>
              <label className="admin-form-group"><span>Gallery image URLs (one per line)</span><textarea name="imageUrlsText" maxLength={62000} value={form.imageUrlsText} onChange={update} /></label>
              <label className="admin-form-group"><span>Highlights (one per line)</span><textarea name="highlightsText" maxLength={6200} value={form.highlightsText} onChange={update} /></label>
              <label className="admin-form-group"><span>Amenities (one per line)</span><textarea name="amenitiesText" maxLength={6200} value={form.amenitiesText} onChange={update} /></label>
              <label className="admin-form-group"><span>Facilities (one per line)</span><textarea name="facilitiesText" maxLength={6200} value={form.facilitiesText} onChange={update} /></label>
              <label className="admin-form-group"><span>Additional details (one per line)</span><textarea name="additionalDetailsText" maxLength={9200} value={form.additionalDetailsText} onChange={update} /></label>
            </div>
          </details>
        </div>
        <div className="property-image-panel">
          <div className="image-preview">
            {preview ? <img src={preview} alt="Property preview" /> : <Building2 size={42} />}
          </div>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              if (nextFile) {
                setFile(nextFile);
                setForm((current) => ({ ...current, imageUrl: "" }));
              }
            }}
          />
          <button type="button" className="admin-button button-secondary" onClick={() => inputRef.current?.click()}>
            {file ? "Change Property Image" : "Upload Property Image"}
          </button>
          {file && <span>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
        </div>
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="admin-button button-primary" disabled={busy}>
          {busy ? "Saving..." : initial ? "Save Property" : "Create Property"}
        </button>
      </div>
    </form>
  );
}

function DashboardView({ stats, requests, search, busy, onNavigate, onReview }) {
  const pending = requests
    .filter((request) => request.status === "pending")
    .filter((request) => `${request.title} ${request.location} ${request.user?.name || ""}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 3);
  return (
    <>
      <div className="admin-section-header">
        <div><p className="admin-kicker">Overview</p><h1>Welcome Back, Admin</h1></div>
        <button type="button" className="admin-button button-primary" onClick={() => onNavigate("add-property")}>Add Property</button>
      </div>
      <div className="admin-stats-grid">
        <StatCard label="Total Properties" value={stats.totalProperties ?? "—"} />
        <StatCard label="Total Users" value={stats.totalUsers ?? "—"} />
        <StatCard label="Enquiries" value={stats.totalEnquiries ?? "—"} />
        <StatCard label="Upload Requests" value={stats.totalUploadRequests ?? "—"} />
      </div>
      <div className="admin-quick-actions">
        <button type="button" className="admin-action-card accent" onClick={() => onNavigate("add-property")}><Plus size={20} /><span>Add Property</span></button>
        <button type="button" className="admin-action-card" onClick={() => onNavigate("users")}><Users size={20} /><span>Manage Users</span></button>
        <button type="button" className="admin-action-card" onClick={() => onNavigate("property-requests")}><FileText size={20} /><span>Review Requests</span></button>
        <button type="button" className="admin-action-card" onClick={() => onNavigate("site-settings")}><Settings size={20} /><span>Edit Site</span></button>
      </div>
      <section className="admin-card panel-table">
        <div className="admin-panel-header">
          <h2>Recent Property Requests</h2>
          <button type="button" className="admin-link-button" onClick={() => onNavigate("property-requests")}>View All <ChevronRight size={16} /></button>
        </div>
        {pending.length === 0 ? <p className="state-message">There are no pending property requests.</p> : (
          <div className="request-grid">
            {pending.map((request) => (
              <article key={request.id} className="request-card">
                <div className="request-card-header">
                  <div><h3>{request.title}</h3><span>{request.location} · {request.user?.name}</span></div>
                  <span className={`status-pill ${statusClass(request.status)}`}>{request.status}</span>
                </div>
                <div className="request-card-meta">
                  <strong>{formatPrice(request.price)}</strong>
                  <div className="request-actions">
                    <button type="button" aria-label={`Approve ${request.title}`} className="icon-button approve" disabled={busy} onClick={() => onReview(request.id, "approved")}><Check size={14} /></button>
                    <button type="button" aria-label={`Reject ${request.title}`} className="icon-button reject" disabled={busy} onClick={() => onReview(request.id, "rejected")}><X size={14} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PropertiesView({ properties, search, busy, onAdd, onEdit, onDelete, onStatus }) {
  const rows = properties.filter((item) => `${item.title} ${item.location} ${item.type}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="admin-card">
      <div className="admin-panel-header">
        <div><p className="admin-kicker">Listings</p><h2>All Properties ({properties.length})</h2></div>
        <button type="button" className="admin-button button-primary" onClick={onAdd}>Add New Property</button>
      </div>
      {rows.length === 0 ? <p className="state-message">No properties match this search.</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Property Title</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((item) => (
              <tr key={item.id}>
                <td><div className="name-cell"><div className="mini-thumb"><House size={16} /></div><span>{item.title}</span></div></td>
                <td>{item.type}</td><td>{formatPrice(item.price)}</td>
                <td><select aria-label={`Status for ${item.title}`} value={item.status} disabled={busy} onChange={(event) => onStatus(item, event.target.value)}>
                  <option value="available">Available</option><option value="sold">Sold</option><option value="rented">Rented</option>
                </select></td>
                <td><div className="inline-actions">
                  <button type="button" className="icon-button ghost" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil size={14} /></button>
                  <button type="button" className="icon-button ghost" aria-label={`Delete ${item.title}`} disabled={busy} onClick={() => onDelete(item)}><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RequestsView({ requests, search, busy, onReview }) {
  const rows = requests.filter((item) => `${item.title} ${item.location} ${item.user?.name || ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="admin-card">
      <div className="admin-panel-header"><div><p className="admin-kicker">Requests</p><h2>Property Requests ({requests.length})</h2></div></div>
      {rows.length === 0 ? <p className="state-message">No property requests match this search.</p> : (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Property Title</th><th>Submitted By</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((item) => (
            <tr key={item.id}>
              <td>{item.title}<small>{item.location}</small></td><td>{item.user?.name || "User"}</td><td>{formatPrice(item.price)}</td>
              <td><span className={`status-pill ${statusClass(item.status)}`}>{item.status}</span></td>
              <td><div className="inline-actions">
                {item.status === "pending" ? <>
                  <button type="button" aria-label={`Approve ${item.title}`} className="icon-button approve" disabled={busy} onClick={() => onReview(item.id, "approved")}><Check size={14} /></button>
                  <button type="button" aria-label={`Reject ${item.title}`} className="icon-button reject" disabled={busy} onClick={() => onReview(item.id, "rejected")}><X size={14} /></button>
                </> : item.propertyId ? <span>Listing {item.propertyId.slice(-6)}</span> : "Reviewed"}
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}

function UsersView({ users, search, busy, editingId, setEditingId, onSave, onToggleActive }) {
  const [name, setName] = useState("");
  const rows = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="admin-card">
      <div className="admin-panel-header"><div><p className="admin-kicker">Users</p><h2>All Users ({users.length})</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((item) => (
          <tr key={item.id}>
            <td>{editingId === item.id ? <input aria-label="User name" value={name} onChange={(event) => setName(event.target.value)} /> : <div className="name-cell"><div className="avatar-badge">{item.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><span>{item.name}</span></div>}</td>
            <td>{item.email}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td>
            <td><span className={`status-pill ${statusClass(item.isActive ? "active" : "inactive")}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
            <td><div className="inline-actions">
              {editingId === item.id ? <>
                <button type="button" className="icon-button approve" aria-label="Save user" disabled={busy || name.trim().length < 2} onClick={() => onSave(item.id, name)}><Check size={14} /></button>
                <button type="button" className="icon-button reject" aria-label="Cancel user edit" onClick={() => setEditingId("")}><X size={14} /></button>
              </> : <>
                <button type="button" className="icon-button ghost" aria-label={`Edit ${item.name}`} onClick={() => { setName(item.name); setEditingId(item.id); }}><Pencil size={14} /></button>
                {item.role !== "admin" && <button type="button" className={`icon-button ${item.isActive ? "reject" : "approve"}`} aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`} disabled={busy} onClick={() => onToggleActive(item)}>{item.isActive ? <X size={14} /> : <Check size={14} />}</button>}
              </>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

function EnquiriesView({ contacts, search, busy, onUpdate }) {
  const rows = contacts.filter((item) => `${item.name} ${item.email} ${item.message} ${item.propertyTitle || ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="admin-card">
      <div className="admin-panel-header"><div><p className="admin-kicker">Inbox</p><h2>Enquiries / Contacts ({contacts.length})</h2></div></div>
      {rows.length === 0 ? <p className="state-message">No contact enquiries match this search.</p> : (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>{rows.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td><td><a href={`mailto:${item.email}`}>{item.email}</a></td><td>{item.phone || "—"}</td><td className="message-cell">{item.message}{item.propertyTitle && <small>Property: {item.propertyTitle}</small>}</td>
              <td><select value={item.status} disabled={busy} aria-label={`Status for ${item.name}`} onChange={(event) => onUpdate(item.id, event.target.value)}>
                <option value="new">New</option><option value="reviewed">Reviewed</option><option value="closed">Closed</option>
              </select></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}

function SettingsView({ settings, busy, onSave, onCancel, update }) {
  const fields = [["websiteName", "Website Name"], ["email", "Email Address"], ["phone", "Phone"], ["emergencyPhone", "Emergency Phone"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["whatsapp", "WhatsApp"]];
  return (
    <form className="admin-card settings-card" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="admin-panel-header"><div><p className="admin-kicker">Settings</p><h2>Site Settings</h2></div></div>
      <div className="settings-grid">
        <div className="settings-block"><h3>General</h3>{fields.slice(0, 4).map(([name, label]) => (
          <label className="admin-form-group" key={name}><span>{label}</span><input name={name} type={name === "email" ? "email" : "text"} value={settings[name] || ""} onChange={update} required /></label>
        ))}</div>
        <div className="settings-block"><h3>Social Links</h3>{fields.slice(4).map(([name, label]) => (
          <label className="admin-form-group" key={name}><span>{label}</span><input name={name} type="url" value={settings[name] || ""} onChange={update} /></label>
        ))}</div>
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="admin-button button-primary" disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
      </div>
    </form>
  );
}

function ContentView({ content, busy, onSave, onCancel, update }) {
  return (
    <form className="admin-card settings-card" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="admin-panel-header"><div><p className="admin-kicker">Marketing</p><h2>Website Content</h2></div></div>
      <div className="content-panels">
        <div className="settings-block"><h3>Home Banner</h3>
          <label className="admin-form-group"><span>Heading</span><input name="homeHeading" value={content.homeHeading || ""} onChange={update} required /></label>
          <label className="admin-form-group"><span>Subheading</span><textarea name="homeSubheading" value={content.homeSubheading || ""} onChange={update} required /></label>
        </div>
        <div className="settings-block"><h3>About Us</h3>
          <label className="admin-form-group"><span>Headline</span><input name="aboutHeadline" value={content.aboutHeadline || ""} onChange={update} required /></label>
          <label className="admin-form-group"><span>Content</span><textarea name="aboutContent" value={content.aboutContent || ""} onChange={update} required /></label>
        </div>
      </div>
      <div className="admin-form-actions">
        <button type="button" className="admin-button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="admin-button button-primary" disabled={busy}>{busy ? "Saving..." : "Save Content"}</button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [records, setRecords] = useState({
    stats: {},
    properties: [],
    requests: [],
    users: [],
    contacts: [],
  });
  const [settings, setSettings] = useState(emptySettings);
  const [savedSettings, setSavedSettings] = useState(emptySettings);
  const [content, setContent] = useState(emptyContent);
  const [savedContent, setSavedContent] = useState(emptyContent);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editingUserId, setEditingUserId] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const searchEnabled = ["dashboard", "properties", "property-requests", "upload-requests", "users", "enquiries"].includes(activeSection);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const loaders = {
      dashboard: () => Promise.all([api.adminOverview(), api.adminPropertyRequests()]).then(([overview, requests]) => {
        if (active) setRecords((current) => ({ ...current, stats: overview.stats, requests: requests.data }));
      }),
      properties: () => api.adminProperties().then((result) => {
        if (active) setRecords((current) => ({ ...current, properties: result.data }));
      }),
      "property-requests": () => api.adminPropertyRequests().then((result) => {
        if (active) setRecords((current) => ({ ...current, requests: result.data }));
      }),
      "upload-requests": () => api.adminPropertyRequests().then((result) => {
        if (active) setRecords((current) => ({ ...current, requests: result.data }));
      }),
      users: () => api.adminUsers().then((result) => {
        if (active) setRecords((current) => ({ ...current, users: result.data }));
      }),
      enquiries: () => api.adminContacts().then((result) => {
        if (active) setRecords((current) => ({ ...current, contacts: result.data }));
      }),
      "site-settings": () => api.adminSiteSettings().then(({ data }) => {
        if (active) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
          setContent(data.content);
          setSavedContent(data.content);
        }
      }),
      "website-content": () => api.adminSiteSettings().then(({ data }) => {
        if (active) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
          setContent(data.content);
          setSavedContent(data.content);
        }
      }),
      "add-property": async () => {},
    };
    Promise.resolve()
      .then(() => loaders[activeSection]())
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeSection, reloadKey]);

  const visibleRequests = useMemo(() => records.requests, [records.requests]);

  async function perform(action, successMessage) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
      setReloadKey((key) => key + 1);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function navigateSection(section) {
    setActiveSection(section);
    if (section !== "add-property") setEditingProperty(null);
    setError("");
    setMessage("");
  }

  async function saveProperty(values, file) {
    const saved = await perform(async () => {
      const property = { ...values };
      if (file) property.imageUrl = (await api.uploadPropertyImage(file)).imageUrl;
      if (editingProperty) await api.updateProperty(editingProperty.id, property);
      else await api.createProperty(property);
    }, editingProperty ? "Property updated." : "Property created.");
    if (saved) {
      setEditingProperty(null);
      setActiveSection("properties");
    }
  }

  async function removeProperty(property) {
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
    await perform(() => api.deleteProperty(property.id), "Property deleted.");
  }

  async function reviewRequest(id, status) {
    await perform(() => api.reviewPropertyRequest(id, status), `Property request ${status}.`);
  }

  async function saveSettings() {
    const saved = await perform(async () => {
      const result = await api.saveSiteSettings(settings);
      setSettings(result.data);
      setSavedSettings(result.data);
    }, "Site settings saved.");
    return saved;
  }

  async function saveContent() {
    const saved = await perform(async () => {
      const result = await api.saveWebsiteContent(content);
      setContent(result.data);
      setSavedContent(result.data);
    }, "Website content saved.");
    return saved;
  }

  async function logout() {
    try {
      await signOut();
      navigate("/admin/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updateForm(event, setValue) {
    setValue((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  let currentView;
  if (loading) currentView = <section className="admin-card"><p className="state-message">Loading {activeSection.replace("-", " ")}...</p></section>;
  else if (activeSection === "dashboard") {
    currentView = <DashboardView stats={records.stats} requests={visibleRequests} search={search} busy={busy} onNavigate={navigateSection} onReview={reviewRequest} />;
  } else if (activeSection === "properties") {
    currentView = <PropertiesView
      properties={records.properties}
      search={search}
      busy={busy}
      onAdd={() => navigateSection("add-property")}
      onEdit={(property) => {
        setEditingProperty(property);
        setActiveSection("add-property");
        setError("");
        setMessage("");
      }}
      onDelete={removeProperty}
      onStatus={(property, status) => perform(() => api.updateProperty(property.id, { status }), "Property status updated.")}
    />;
  } else if (activeSection === "add-property") {
    currentView = <PropertyForm
      key={editingProperty?.id || "new"}
      initial={editingProperty}
      busy={busy}
      onSave={saveProperty}
      onCancel={() => navigateSection("properties")}
    />;
  } else if (activeSection === "property-requests" || activeSection === "upload-requests") {
    currentView = <RequestsView requests={visibleRequests} search={search} busy={busy} onReview={reviewRequest} />;
  } else if (activeSection === "users") {
    currentView = <UsersView
      users={records.users}
      search={search}
      busy={busy}
      editingId={editingUserId}
      setEditingId={setEditingUserId}
      onSave={async (id, name) => {
        const saved = await perform(() => api.updateUser(id, { name: name.trim() }), "User details saved.");
        if (saved) setEditingUserId("");
      }}
      onToggleActive={(item) => perform(
        () => api.updateUser(item.id, { isActive: !item.isActive }),
        `User ${item.isActive ? "deactivated" : "activated"}.`,
      )}
    />;
  } else if (activeSection === "enquiries") {
    currentView = <EnquiriesView contacts={records.contacts} search={search} busy={busy} onUpdate={(id, status) => perform(() => api.updateContact(id, status), "Enquiry status updated.")} />;
  } else if (activeSection === "site-settings") {
    currentView = <SettingsView
      settings={settings}
      busy={busy}
      update={(event) => updateForm(event, setSettings)}
      onSave={saveSettings}
      onCancel={() => { setSettings(savedSettings); setError(""); setMessage(""); }}
    />;
  } else {
    currentView = <ContentView
      content={content}
      busy={busy}
      update={(event) => updateForm(event, setContent)}
      onSave={saveContent}
      onCancel={() => { setContent(savedContent); setError(""); setMessage(""); }}
    />;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <button type="button" className="brand-block admin-brand-button" onClick={() => navigateSection("dashboard")} aria-label="Go to admin dashboard">
          <span className="brand-logo">S</span>
          <span className="brand-copy"><strong>Shubh Lakshmi</strong><span>Properties</span></span>
        </button>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`admin-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => navigateSection(id)}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="admin-logout" onClick={logout}><LogOut size={16} /><span>Logout</span></button>
      </aside>
      <div className="admin-main-panel">
        <header className="admin-topbar">
          <div className="admin-search-field">
            <Search size={15} />
            <input type="search" aria-label="Search current admin list" placeholder="Search current list..." disabled={!searchEnabled} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="admin-user-actions">
            <button type="button" className="admin-icon-button" aria-label="View pending property requests" onClick={() => navigateSection("property-requests")}>
              <Bell size={16} />
              {records.stats.totalUploadRequests > 0 && <span className="notification-dot" />}
            </button>
            <div className="admin-user-badge"><div className="admin-avatar">{user?.name?.[0] || "A"}</div><div><strong>{user?.name || "Admin"}</strong><span>Administrator</span></div></div>
          </div>
        </header>
        <main className="admin-content">
          <Feedback error={error} message={message} />
          {currentView}
        </main>
      </div>
    </div>
  );
}
