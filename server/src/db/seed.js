import { getConfig } from "../config.js";
import { connectDatabase, initializeModels } from "./database.js";
import { createPropertyModel } from "./propertyModel.js";
import { createUserModel } from "./userModel.js";

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
if (!ownerEmail) {
  throw new Error("Set SEED_OWNER_EMAIL to an existing account before seeding sample listings.");
}

const db = await connectDatabase(getConfig().mongoUri);
try {
  const users = createUserModel(db);
  const properties = createPropertyModel(db);
  await initializeModels([users, properties]);

  const owner = await users.findPublicByEmail(ownerEmail);
  if (!owner) {
    throw new Error("SEED_OWNER_EMAIL must match an existing account.");
  }

  const samples = [
    {
      key: "sample-jaipur-plot",
      title: "Sample listing: Residential plot",
      type: "plot",
      status: "available",
      price: 1800000,
      location: "Jaipur (sample location)",
      description: "Illustrative sample data only. This is not a real property offer.",
    },
    {
      key: "sample-jaipur-house",
      title: "Sample listing: Family home",
      type: "house",
      status: "available",
      price: 5200000,
      location: "Jaipur (sample location)",
      description: "Illustrative sample data only. This is not a real property offer.",
      featured: true,
    },
    {
      key: "sample-jaipur-rental",
      title: "Sample listing: Rental apartment",
      type: "rental",
      status: "rented",
      price: 24000,
      location: "Jaipur (sample location)",
      description: "Illustrative sample data only. This is not a real property offer.",
    },
  ];

  for (const { key, ...input } of samples) {
    await properties.seedSample(owner.id, key, input);
  }
  console.log(`Seeded ${samples.length} clearly marked sample listings.`);
} finally {
  await db.close();
}
