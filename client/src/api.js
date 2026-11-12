const API_BASE = import.meta.env.VITE_API_URL || "/api";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolvePropertyImageUrl(imageUrl) {
  if (!imageUrl) return "";
  const apiOrigin = new URL(API_BASE, window.location.origin).origin;
  const resolved = new URL(imageUrl, apiOrigin);
  if (localHosts.has(resolved.hostname)) {
    return new URL(`${resolved.pathname}${resolved.search}${resolved.hash}`, apiOrigin).toString();
  }
  return resolved.toString();
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (cause) {
    const error = new Error("Cannot reach the API. Start the server and configure MONGODB_URI in server/.env.");
    error.cause = cause;
    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const error = new Error(
      response.ok
        ? "The API returned an unexpected response."
        : "The API server returned an error. Check its startup logs and MongoDB configuration.",
    );
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "The request could not be completed.");
    error.status = response.status;
    error.details = result.details;
    throw error;
  }
  return result;
}

export const api = {
  properties: (query = {}, options = {}) => {
    const search = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) search.set(key, value);
    });
    const suffix = search.size ? `?${search}` : "";
    return request(`/properties${suffix}`, options);
  },
  getProperty: (id, options = {}) => request(`/properties/${encodeURIComponent(id)}`, options),
  login: (values) => request("/auth/login", { method: "POST", body: JSON.stringify(values) }),
  adminLogin: (values) => request("/auth/admin/login", { method: "POST", body: JSON.stringify(values) }),
  register: (values) => request("/auth/register", { method: "POST", body: JSON.stringify(values) }),
  me: () => request("/auth/me"),
  adminMe: () => request("/admin/me"),
  adminOverview: () => request("/admin/overview"),
  adminProperties: (query = {}) => {
    const search = new URLSearchParams(query);
    return request(`/admin/properties${search.size ? `?${search}` : ""}`);
  },
  createProperty: (values) => request("/properties", { method: "POST", body: JSON.stringify(values) }),
  updateProperty: (id, values) => request(`/admin/properties/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) }),
  deleteProperty: (id) => request(`/admin/properties/${encodeURIComponent(id)}`, { method: "DELETE" }),
  uploadPropertyImage: async (file) => {
    const result = await request("/admin/property-images", {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
    });
    const apiOrigin = new URL(API_BASE, window.location.origin).origin;
    return { ...result, imageUrl: new URL(result.imageUrl, apiOrigin).toString() };
  },
  submitPropertyRequest: (values) => request("/property-requests", { method: "POST", body: JSON.stringify(values) }),
  adminPropertyRequests: () => request("/admin/property-requests"),
  reviewPropertyRequest: (id, status) => request(`/admin/property-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  adminUsers: () => request("/admin/users"),
  updateUser: (id, values) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) }),
  adminContacts: () => request("/admin/contacts"),
  updateContact: (id, status) => request(`/admin/contacts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  adminSiteSettings: () => request("/admin/site-settings"),
  saveSiteSettings: (values) => request("/admin/site-settings", { method: "PUT", body: JSON.stringify(values) }),
  saveWebsiteContent: (values) => request("/admin/website-content", { method: "PUT", body: JSON.stringify(values) }),
  site: () => request("/site"),
  logout: () => request("/auth/logout", { method: "POST" }),
  submitContact: (values) => request("/contacts", { method: "POST", body: JSON.stringify(values) }),
};
