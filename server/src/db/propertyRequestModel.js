import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  type: { type: String, required: true, enum: ["plot", "house", "rental", "commercial"] },
  price: { type: Number, required: true, min: 0, max: 1_000_000_000_000 },
  location: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  imageUrl: { type: String, maxlength: 2048 },
  imageUrls: [{ type: String, maxlength: 2048 }],
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
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
}, { timestamps: true, strict: "throw" });

requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ user: 1, createdAt: -1 });

function toRequest(document) {
  const populatedUser = document.populated("user") ? document.user : null;
  return {
    id: document.id,
    title: document.title,
    type: document.type,
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
    status: document.status,
    propertyId: document.property?.toString() ?? null,
    user: populatedUser ? {
      id: populatedUser.id,
      name: populatedUser.name,
      email: populatedUser.email,
    } : { id: document.user?.toString() ?? null, name: "User", email: "" },
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function createPropertyRequestModel(connection) {
  const Request = connection.models.PropertyRequest
    ?? connection.model("PropertyRequest", requestSchema);

  return {
    initialize: () => Request.init(),

    async create(userId, input) {
      const request = { ...input, user: userId };
      if (request.imageUrl === null) delete request.imageUrl;
      return toRequest(await Request.create(request));
    },

    async list() {
      const documents = await Request.find()
        .populate({ path: "user", select: "name email" })
        .sort({ createdAt: -1 })
        .exec();
      return documents.map(toRequest);
    },

    async findById(id) {
      const document = await Request.findById(id).exec();
      return document ? toRequest(document) : null;
    },

    async updateStatus(id, status, propertyId = null) {
      const document = await Request.findByIdAndUpdate(
        id,
        { $set: { status, property: propertyId } },
        { returnDocument: "after", runValidators: true },
      ).populate({ path: "user", select: "name email" }).exec();
      return document ? toRequest(document) : null;
    },
  };
}
