import { getConfig } from "../config.js";
import { connectDatabase, initializeModels } from "./database.js";
import { createContactModel } from "./contactModel.js";
import { createPropertyModel } from "./propertyModel.js";
import { createSessionModel } from "./sessionModel.js";
import { createUserModel } from "./userModel.js";
import { createPropertyRequestModel } from "./propertyRequestModel.js";
import { createSiteConfigModel } from "./siteConfigModel.js";

const db = await connectDatabase(getConfig().mongoUri);
try {
  const users = createUserModel(db);
  const sessions = createSessionModel(db);
  const properties = createPropertyModel(db);
  const contacts = createContactModel(db);
  const propertyRequests = createPropertyRequestModel(db);
  const siteConfig = createSiteConfigModel(db);
  await initializeModels([users, sessions, properties, contacts, propertyRequests, siteConfig]);
  console.log("MongoDB collections and indexes are ready.");
} finally {
  await db.close();
}
