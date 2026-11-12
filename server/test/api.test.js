import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { connectDatabase, initializeModels } from "../src/db/database.js";
import { createContactModel } from "../src/db/contactModel.js";
import { createPropertyModel } from "../src/db/propertyModel.js";
import { createSessionModel } from "../src/db/sessionModel.js";
import { createUserModel } from "../src/db/userModel.js";
import { createPropertyRequestModel } from "../src/db/propertyRequestModel.js";
import { createSiteConfigModel } from "../src/db/siteConfigModel.js";
import { createAuthService } from "../src/services/authService.js";
import { createContactService } from "../src/services/contactService.js";
import { createPropertyService } from "../src/services/propertyService.js";

let server;
let db;
let mongoServer;
let baseUrl;
let users;
let properties;
let propertyRequests;
let siteConfig;
let contacts;
let uploadDirectory;

before(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  db = await connectDatabase(mongoServer.getUri());
  users = createUserModel(db);
  const sessions = createSessionModel(db);
  properties = createPropertyModel(db);
  contacts = createContactModel(db);
  propertyRequests = createPropertyRequestModel(db);
  siteConfig = createSiteConfigModel(db);
  uploadDirectory = await mkdtemp(path.join(os.tmpdir(), "shubh-lakshmi-test-"));
  await initializeModels([users, sessions, properties, contacts, propertyRequests, siteConfig]);

  const config = {
    nodeEnv: "test",
    port: 0,
    clientOrigins: ["http://localhost:5173"],
    sessionTtlMs: 60 * 60 * 1000,
    cookieSecure: false,
    adminEmails: ["admin@shubhlakshmi.com"],
    adminPassword: "Admin@12345",
  };
  const authService = createAuthService({
    users,
    sessions,
    sessionTtlMs: config.sessionTtlMs,
    adminEmails: config.adminEmails,
    adminPassword: config.adminPassword,
  });
  await authService.ensureAdminAccounts();
  const propertyService = createPropertyService(properties);
  const app = createApp({
    db,
    config,
    authService,
    propertyService,
    contactService: createContactService(contacts, propertyService),
    propertyRequests,
    users,
    contacts,
    siteConfig,
    uploadDirectory,
  });
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
  if (mongoServer) await mongoServer.stop();
  if (uploadDirectory) await rm(uploadDirectory, { recursive: true, force: true });
});

async function request(pathname, { body, cookie, ...options } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = response.status === 204 ? null : await response.json();
  return { response, result, setCookie: response.headers.get("set-cookie") };
}

async function requestRaw(pathname, { body, cookie, contentType, ...options }) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": contentType,
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
    body,
  });
  const result = response.status === 204 ? null : await response.json();
  return { response, result };
}

test("REST API persists auth, property and contact data in MongoDB", async (t) => {
  await t.test("health, indexes, filtering, and pagination use the connected database", async () => {
    const health = await request("/api/health");
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.result, { status: "ok", database: "connected" });

    const listings = await request("/api/properties");
    assert.equal(listings.response.status, 200);
    assert.deepEqual(listings.result.data, []);
    assert.equal(listings.result.pagination.total, 0);

    const invalidRange = await request("/api/properties?minPrice=500&maxPrice=200");
    assert.equal(invalidRange.response.status, 400);

    const indexes = await db.collection("properties").indexes();
    assert.ok(indexes.some((index) => index.key.type === 1 && index.key.status === 1));
  });

  await t.test("contact submissions validate and persist", async () => {
    const invalid = await request("/api/contacts", {
      method: "POST",
      body: { name: "A", email: "not-an-email", message: "short" },
    });
    assert.equal(invalid.response.status, 400);

    const valid = await request("/api/contacts", {
      method: "POST",
      body: { name: "Test Visitor", email: "visitor@example.com", phone: "", message: "Please share more details." },
    });
    assert.equal(valid.response.status, 201);
    assert.equal(valid.result.submission.status, "new");
    assert.ok(valid.result.submission.id);
    assert.equal(await db.collection("contacts").countDocuments(), 1);
  });

  await t.test("registration and login hash passwords and issue revocable sessions", async () => {
    const registration = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Property Owner", email: "owner@example.com", password: "a-secure-passphrase" },
    });
    assert.equal(registration.response.status, 201);
    assert.match(registration.setCookie, /HttpOnly/i);
    assert.match(registration.setCookie, /SameSite=Lax/i);
    const ownerCookie = registration.setCookie.split(";")[0];
    assert.ok(registration.result.user.id);

    const storedCredentials = await db.collection("users").findOne({ email: "owner@example.com" });
    assert.notEqual(storedCredentials.passwordHash, "a-secure-passphrase");

    const currentUser = await request("/api/auth/me", { cookie: ownerCookie });
    assert.equal(currentUser.response.status, 200);
    assert.equal(currentUser.result.user.email, "owner@example.com");

    const duplicate = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Duplicate", email: "owner@example.com", password: "a-secure-passphrase" },
    });
    assert.equal(duplicate.response.status, 409);

    const wrongPassword = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.com", password: "wrong-password" },
    });
    assert.equal(wrongPassword.response.status, 401);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: { email: "OWNER@example.com", password: "a-secure-passphrase" },
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.setCookie.includes("slp_session="));

    const adminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: { email: "admin@shubhlakshmi.com", password: "Admin@12345" },
    });
    assert.equal(adminLogin.response.status, 200);
    assert.equal(adminLogin.result.user.role, "admin");
    const adminCookie = adminLogin.setCookie.split(";")[0];

    const adminGuard = await request("/api/admin/me", { cookie: ownerCookie });
    assert.equal(adminGuard.response.status, 403);

    const adminUser = await request("/api/admin/me", { cookie: adminCookie });
    assert.equal(adminUser.response.status, 200);
    assert.equal(adminUser.result.user.role, "admin");
  });

  await t.test("property filters, sample labels, validation and admin-only write access are enforced", async () => {
    const owner = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.com", password: "a-secure-passphrase" },
    });
    const ownerCookie = owner.setCookie.split(";")[0];

    const adminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: { email: "admin@shubhlakshmi.com", password: "Admin@12345" },
    });
    const adminCookie = adminLogin.setCookie.split(";")[0];

    const anonymousCreate = await request("/api/properties", {
      method: "POST",
      body: { title: "Test home", type: "house", status: "available", price: 2500000, location: "Jaipur", description: "Test listing." },
    });
    assert.equal(anonymousCreate.response.status, 401);

    const forbiddenCreate = await request("/api/properties", {
      method: "POST",
      cookie: ownerCookie,
      body: { title: "Test home", type: "house", status: "available", price: 2500000, location: "Jaipur", description: "Test listing.", featured: true },
    });
    assert.equal(forbiddenCreate.response.status, 403);

    const created = await request("/api/properties", {
      method: "POST",
      cookie: adminCookie,
      body: { title: "Test home", type: "house", status: "available", price: 2500000, location: "Jaipur", description: "Test listing.", featured: true },
    });
    assert.equal(created.response.status, 201);
    const propertyId = created.result.data.id;
    assert.equal(created.result.data.source, "real");

    const anotherProperty = await request("/api/properties", {
      method: "POST",
      cookie: adminCookie,
      body: { title: "Test plot", type: "plot", status: "available", price: 1800000, location: "Jaipur", description: "Second test listing." },
    });
    assert.equal(anotherProperty.response.status, 201);
    const detail = await request(`/api/properties/${propertyId}`);
    assert.equal(detail.result.data.id, propertyId);

    const matching = await request("/api/properties?type=house&status=available&minPrice=2000000&location=jaip&page=1&limit=1");
    assert.equal(matching.result.pagination.total, 1);
    assert.equal(matching.result.data[0].id, propertyId);
    const featured = await request("/api/properties?featured=true&limit=1");
    assert.equal(featured.result.data.length, 1);
    const secondPage = await request("/api/properties?location=jaip&page=2&limit=1");
    assert.equal(secondPage.result.pagination.total, 2);
    assert.equal(secondPage.result.pagination.totalPages, 2);
    assert.equal(secondPage.result.data.length, 1);

    const sampleInput = {
      title: "Sample listing: test",
      type: "plot",
      status: "available",
      price: 1,
      location: "Sample location",
      description: "Illustrative data only; not a real property offer.",
    };
    await properties.seedSample(owner.result.user.id, "test-sample", sampleInput);
    await properties.seedSample(owner.result.user.id, "test-sample", sampleInput);
    const samples = await request("/api/properties?source=sample");
    assert.equal(samples.result.data.length, 1);
    assert.equal(samples.result.data[0].source, "sample");

    const invalidId = await request("/api/properties/not-an-object-id");
    assert.equal(invalidId.response.status, 400);

    const invalidUpdate = await request(`/api/properties/${propertyId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { price: -1 },
    });
    assert.equal(invalidUpdate.response.status, 400);

    const secondUser = await request("/api/auth/register", {
      method: "POST",
      body: { name: "Other Owner", email: "other@example.com", password: "another-secure-pass" },
    });
    const otherCookie = secondUser.setCookie.split(";")[0];
    const forbiddenUpdate = await request(`/api/properties/${propertyId}`, {
      method: "PATCH",
      cookie: otherCookie,
      body: { price: 1 },
    });
    assert.equal(forbiddenUpdate.response.status, 403);

    const updated = await request(`/api/properties/${propertyId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { price: 2750000 },
    });
    assert.equal(updated.result.data.price, 2750000);

    const forbiddenDelete = await request(`/api/properties/${propertyId}`, {
      method: "DELETE",
      cookie: otherCookie,
    });
    assert.equal(forbiddenDelete.response.status, 403);

    const removed = await request(`/api/properties/${propertyId}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    assert.equal(removed.response.status, 204);

    await request("/api/auth/logout", { method: "POST", cookie: ownerCookie });
    const afterLogout = await request("/api/auth/me", { cookie: ownerCookie });
    assert.equal(afterLogout.response.status, 200);
    assert.equal(afterLogout.result.user, null);
  });

  await t.test("admin workflows persist property requests, users, contacts, settings and image uploads", async () => {
    const ownerLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "owner@example.com", password: "a-secure-passphrase" },
    });
    const ownerCookie = ownerLogin.setCookie.split(";")[0];
    const adminLogin = await request("/api/auth/admin/login", {
      method: "POST",
      body: { email: "admin@shubhlakshmi.com", password: "Admin@12345" },
    });
    const adminCookie = adminLogin.setCookie.split(";")[0];

    const anonymousSubmission = await request("/api/property-requests", {
      method: "POST",
      body: { title: "Not allowed", type: "house", price: 1, location: "Jaipur", description: "Login is required to submit." },
    });
    assert.equal(anonymousSubmission.response.status, 401);
    const forbiddenImageUpload = await requestRaw("/api/admin/property-images", {
      method: "POST",
      cookie: ownerCookie,
      contentType: "image/jpeg",
      body: Buffer.from([0xff, 0xd8, 0xff]),
    });
    assert.equal(forbiddenImageUpload.response.status, 403);

    const submission = await request("/api/property-requests", {
      method: "POST",
      cookie: ownerCookie,
      body: {
        title: "Owner submitted home",
        type: "house",
        price: 4500000,
        location: "Jaipur",
        description: "A user-submitted property for approval.",
        bedrooms: 3,
        bathrooms: 2,
        areaSqFt: 1450,
        parking: 1,
        address: "Civil Lines, Jaipur",
        latitude: 26.9124,
        longitude: 75.7873,
        imageUrls: ["https://example.com/property-front.jpg", "https://example.com/property-living-room.jpg"],
        highlights: ["Modern interiors", "Corner plot"],
        nearbyLocations: [{ name: "Central market", distance: "1 km", verified: true }],
      },
    });
    assert.equal(submission.response.status, 201);
    assert.equal(submission.result.data.status, "pending");
    const pendingPublicRead = await request(`/api/properties/${submission.result.data.id}`);
    assert.equal(pendingPublicRead.response.status, 404);

    const review = await request(`/api/admin/property-requests/${submission.result.data.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "approved" },
    });
    assert.equal(review.response.status, 200, JSON.stringify(review.result));
    assert.equal(review.result.data.status, "approved");
    const publicListing = await request(`/api/properties/${review.result.data.propertyId}`);
    assert.equal(publicListing.response.status, 200);
    assert.equal(publicListing.result.data.title, "Owner submitted home");
    assert.equal(publicListing.result.data.bedrooms, 3);
    assert.equal(publicListing.result.data.areaSqFt, 1450);
    assert.equal(publicListing.result.data.imageUrls.length, 2);
    assert.equal(publicListing.result.data.nearbyLocations[0].verified, true);

    const invalidPropertyEnquiry = await request("/api/contacts", {
      method: "POST",
      body: {
        name: "Test Visitor",
        email: "visitor@example.com",
        message: "I would like to know more about this listing.",
        propertyId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    assert.equal(invalidPropertyEnquiry.response.status, 404);

    const propertyEnquiry = await request("/api/contacts", {
      method: "POST",
      body: {
        name: "Property Visitor",
        email: "property-visitor@example.com",
        message: "Please share more details about this listing.",
        propertyId: review.result.data.propertyId,
      },
    });
    assert.equal(propertyEnquiry.response.status, 201);

    const contactsList = await request("/api/admin/contacts", { cookie: adminCookie });
    assert.equal(contactsList.response.status, 200);
    assert.equal(contactsList.result.data.length, 2);
    const linkedContact = contactsList.result.data.find((item) => item.propertyId === review.result.data.propertyId);
    assert.equal(linkedContact.propertyTitle, "Owner submitted home");
    const contactId = linkedContact.id;
    const contactStatus = await request(`/api/admin/contacts/${contactId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { status: "reviewed" },
    });
    assert.equal(contactStatus.result.data.status, "reviewed");

    const siteUpdate = await request("/api/admin/site-settings", {
      method: "PUT",
      cookie: adminCookie,
      body: {
        websiteName: "Shubh Lakshmi",
        email: "contact@example.com",
        phone: "+91-1234567890",
        emergencyPhone: "+91-0987654321",
        facebook: "",
        instagram: "",
        whatsapp: "https://wa.me/911234567890",
      },
    });
    assert.equal(siteUpdate.response.status, 200);
    const publicSite = await request("/api/site");
    assert.equal(publicSite.result.settings.email, "contact@example.com");
    const contentUpdate = await request("/api/admin/website-content", {
      method: "PUT",
      cookie: adminCookie,
      body: {
        homeHeading: "Find a Better Home",
        homeSubheading: "Updated home search intro.",
        aboutHeadline: "Find your next move",
        aboutContent: "Updated call to action.",
      },
    });
    assert.equal(contentUpdate.response.status, 200);
    const updatedPublicSite = await request("/api/site");
    assert.equal(updatedPublicSite.result.content.homeHeading, "Find a Better Home");

    const user = await request("/api/admin/users", { cookie: adminCookie });
    const owner = user.result.data.find((item) => item.email === "owner@example.com");
    const deactivated = await request(`/api/admin/users/${owner.id}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: { isActive: false },
    });
    assert.equal(deactivated.result.user.isActive, false);
    const inactiveAccess = await request("/api/admin/overview", { cookie: ownerCookie });
    assert.equal(inactiveAccess.response.status, 403);

    const thisFile = fileURLToPath(import.meta.url);
    const imageBytes = await readFile(path.resolve(path.dirname(thisFile), "../../client/public/images/lotus.jpg"));
    const image = await requestRaw("/api/admin/property-images", {
      method: "POST",
      cookie: adminCookie,
      contentType: "image/jpeg",
      body: imageBytes,
    });
    assert.equal(image.response.status, 201);
    assert.match(image.result.imageUrl, /^\/uploads\/[a-f\d-]+\.jpg$/i);
    const uploaded = await fetch(`${baseUrl}${image.result.imageUrl}`);
    assert.equal(uploaded.status, 200);
    assert.equal(uploaded.headers.get("content-type"), "image/jpeg");
  });
});
