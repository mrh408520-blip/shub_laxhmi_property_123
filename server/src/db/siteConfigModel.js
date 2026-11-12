import mongoose from "mongoose";

const siteConfigSchema = new mongoose.Schema({
  key: { type: String, enum: ["settings", "content"], required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, strict: "throw" });

export function createSiteConfigModel(connection) {
  const SiteConfig = connection.models.SiteConfig
    ?? connection.model("SiteConfig", siteConfigSchema);

  return {
    initialize: () => SiteConfig.init(),

    async get(key) {
      const record = await SiteConfig.findOne({ key }).lean().exec();
      return record?.value ?? null;
    },

    async set(key, value) {
      await SiteConfig.findOneAndUpdate(
        { key },
        { $set: { value } },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      ).exec();
      return value;
    },
  };
}
