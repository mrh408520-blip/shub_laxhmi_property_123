import mongoose from "mongoose";

function isValidImageUrl(value) {
  if (value === null || value === undefined) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const propertySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  type: { type: String, required: true, enum: ["plot", "house", "rental", "commercial"] },
  status: { type: String, required: true, enum: ["available", "sold", "rented"] },
  price: { type: Number, required: true, min: 0, max: 1_000_000_000_000 },
  location: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  imageUrl: {
    type: String,
    maxlength: 2048,
    validate: { validator: isValidImageUrl, message: "Image URL must be a valid HTTP(S) URL." },
  },
  imageUrls: [{
    type: String,
    maxlength: 2048,
    validate: { validator: isValidImageUrl, message: "Image URLs must be valid HTTP(S) URLs." },
  }],
  bedrooms: { type: Number, min: 0, max: 100 },
  bathrooms: { type: Number, min: 0, max: 100 },
  areaSqFt: { type: Number, min: 0, max: 100_000_000 },
  parking: { type: Number, min: 0, max: 100 },
  floor: { type: String, trim: true, maxlength: 80 },
  address: { type: String, trim: true, maxlength: 500 },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  highlights: [{ type: String, trim: true, maxlength: 200 }],
  amenities: [{ type: String, trim: true, maxlength: 200 }],
  facilities: [{ type: String, trim: true, maxlength: 200 }],
  additionalDetails: [{ type: String, trim: true, maxlength: 300 }],
  nearbyLocations: [{
    name: { type: String, required: true, trim: true, maxlength: 160 },
    distance: { type: String, trim: true, maxlength: 80 },
    verified: { type: Boolean, default: false },
  }],
  featured: { type: Boolean, default: false },
  source: { type: String, enum: ["real", "sample"], default: "real" },
  sampleKey: { type: String, select: false },
}, { timestamps: true, strict: "throw" });

propertySchema.index({ type: 1, status: 1, price: 1, createdAt: -1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ featured: 1, createdAt: -1 });
propertySchema.index({ location: 1 });
propertySchema.index(
  { sampleKey: 1 },
  { unique: true, partialFilterExpression: { sampleKey: { $type: "string" } } },
);

function toProperty(document) {
  if (!document) return null;
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    status: document.status,
    price: document.price,
    location: document.location,
    description: document.description,
    imageUrl: document.imageUrl,
    imageUrls: document.imageUrls ?? [],
    bedrooms: document.bedrooms,
    bathrooms: document.bathrooms,
    areaSqFt: document.areaSqFt,
    parking: document.parking,
    floor: document.floor,
    address: document.address,
    latitude: document.latitude,
    longitude: document.longitude,
    highlights: document.highlights ?? [],
    amenities: document.amenities ?? [],
    facilities: document.facilities ?? [],
    additionalDetails: document.additionalDetails ?? [],
    nearbyLocations: document.nearbyLocations ?? [],
    featured: document.featured,
    source: document.source,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function createPropertyModel(connection) {
  const Property = connection.models.Property
    ?? connection.model("Property", propertySchema);

  return {
    initialize: () => Property.init(),

    async list(filters) {
      const query = {};
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
        if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
      }
      if (filters.location) {
        const escapedLocation = filters.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.location = { $regex: escapedLocation, $options: "i" };
      }
      if (filters.featured !== undefined) query.featured = filters.featured;
      if (filters.source) query.source = filters.source;

      const [total, documents] = await Promise.all([
        Property.countDocuments(query),
        Property.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .skip((filters.page - 1) * filters.limit)
          .limit(filters.limit)
          .exec(),
      ]);
      return { items: documents.map(toProperty), total };
    },

    async findById(id) {
      return toProperty(await Property.findById(id).exec());
    },

    async findOwner(id) {
      const document = await Property.findById(id).select("owner").exec();
      return document?.owner.toString() ?? null;
    },

    async create(ownerId, input) {
      const property = { ...input, owner: ownerId };
      if (property.imageUrl === null) delete property.imageUrl;
      if (property.imageUrls === undefined) property.imageUrls = [];
      const document = await Property.create(property);
      return toProperty(document);
    },

    async update(id, input) {
      const updates = { ...input };
      const update = { $set: updates };
      if (updates.imageUrl === null) {
        delete update.$set.imageUrl;
        update.$unset = { imageUrl: 1 };
      }
      const document = await Property.findByIdAndUpdate(
        id,
        update,
        { returnDocument: "after", runValidators: true },
      ).exec();
      return toProperty(document);
    },

    async delete(id) {
      const result = await Property.deleteOne({ _id: id }).exec();
      return result.deletedCount > 0;
    },

    async seedSample(ownerId, sampleKey, input) {
      let document = await Property.findOne({ sampleKey }).exec();
      if (document) {
        Object.assign(document, input, { owner: ownerId });
        await document.save();
      } else {
        document = await Property.create({
          ...input,
          owner: ownerId,
          source: "sample",
          sampleKey,
        });
      }
      return toProperty(document);
    },
  };
}
