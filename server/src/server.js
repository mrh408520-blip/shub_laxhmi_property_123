import { getConfig } from "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase, initializeModels } from "./db/database.js";
import { createContactModel } from "./db/contactModel.js";
import { createPropertyModel } from "./db/propertyModel.js";
import { createSessionModel } from "./db/sessionModel.js";
import { createUserModel } from "./db/userModel.js";
import { createPropertyRequestModel } from "./db/propertyRequestModel.js";
import { createSiteConfigModel } from "./db/siteConfigModel.js";
import { createApp } from "./app.js";
import { createAuthService } from "./services/authService.js";
import { createContactService } from "./services/contactService.js";
import { createPropertyService } from "./services/propertyService.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const config = getConfig();
  const db = await connectDatabase(config.mongoUri);
  try {
    const users = createUserModel(db);
    const sessions = createSessionModel(db);
    const properties = createPropertyModel(db);
    const contacts = createContactModel(db);
    const propertyRequests = createPropertyRequestModel(db);
    const siteConfig = createSiteConfigModel(db);
    await initializeModels([users, sessions, properties, contacts, propertyRequests, siteConfig]);

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
      uploadDirectory: path.resolve(serverDirectory, "../uploads"),
    });

    const server = app.listen(config.port, () => {
      console.log(`Shubh Lakshmi API listening on http://localhost:${config.port}`);
    });

    const shutdown = () => {
      server.close(() => {
        db.close().catch((error) => {
          console.error("Could not close the MongoDB connection cleanly.", error);
          process.exitCode = 1;
        });
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    await db.close();
    throw error;
  }
}

start().catch((error) => {
  console.error("Could not start the Shubh Lakshmi API.", error);
  process.exitCode = 1;
});
