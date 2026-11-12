import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { createPropertyRouter } from "./routes/propertyRoutes.js";
import { createContactRouter } from "./routes/contactRoutes.js";
import { createPropertyRequestRouter } from "./routes/propertyRequestRoutes.js";
import { createSiteRouter } from "./routes/siteRoutes.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));

export function createApp({
  db,
  config,
  authService,
  propertyService,
  contactService,
  propertyRequests,
  users,
  contacts,
  siteConfig,
  uploadDirectory,
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers.origin) {
      if (!config.clientOrigins.includes(req.headers.origin)) {
        return res.status(403).json({ error: "Origin is not allowed." });
      }
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    if (db.readyState !== 1) {
      return res.status(503).json({ status: "error", database: "disconnected" });
    }
    return res.json({ status: "ok", database: "connected" });
  });
  app.use("/api/auth", createAuthRouter({ authService, config }));
  app.use("/api/admin", createAdminRouter({
    authService,
    propertyService,
    propertyRequests,
    users,
    contacts,
    siteConfig,
    uploadDirectory,
  }));
  app.use("/api/property-requests", createPropertyRequestRouter({ authService, propertyRequests }));
  app.use("/api/site", createSiteRouter(siteConfig));
  app.use("/api/properties", createPropertyRouter({ authService, propertyService }));
  app.use("/api/contacts", createContactRouter(contactService));
  app.use("/uploads", express.static(uploadDirectory, {
    fallthrough: false,
    immutable: true,
    maxAge: "1y",
  }));

  if (config.nodeEnv === "production") {
    const clientDist = path.resolve(serverDirectory, "../../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => res.json({ name: "Shubh Lakshmi Properties API", health: "/api/health" }));
  }

  app.use((req, res) => res.status(404).json({ error: "Resource not found." }));
  app.use((error, _req, res, _next) => {
    let status = Number.isInteger(error.status) ? error.status : 500;
    let details = error.details;
    if (error.name === "ValidationError") {
      status = 400;
      details = Object.values(error.errors).map(({ path, message }) => ({ field: path, message }));
    } else if (error.name === "CastError") {
      status = 400;
      details = [{ field: error.path, message: "Invalid value." }];
    } else if (error.code === 11000) {
      status = 409;
    } else if ([
      "MongoServerSelectionError",
      "MongoNetworkError",
      "MongoNotConnectedError",
      "MongoServerClosedError",
      "MongooseServerSelectionError",
    ].includes(error.name)) {
      status = 503;
    }
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: status >= 500 ? "An unexpected server error occurred." : error.message,
      ...(details ? { details } : {}),
    });
  });

  return app;
}
