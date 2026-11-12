import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: { type: String, trim: true, maxlength: 30, default: null },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
  propertyTitle: { type: String, trim: true, maxlength: 160, default: null },
  status: { type: String, enum: ["new", "reviewed", "closed"], default: "new" },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: "throw" });

contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1, createdAt: -1 });

export function createContactModel(connection) {
  const Contact = connection.models.Contact
    ?? connection.model("Contact", contactSchema);

  return {
    initialize: () => Contact.init(),

    async create({ name, email, phone, message, propertyId, propertyTitle }) {
      const document = await Contact.create({
        name,
        email,
        phone: phone || null,
        message,
        property: propertyId || null,
        propertyTitle: propertyTitle || null,
      });
      return { id: document.id, status: document.status, createdAt: document.createdAt };
    },

    async list() {
      const documents = await Contact.find().sort({ createdAt: -1 }).exec();
      return documents.map((document) => ({
        id: document.id,
        name: document.name,
        email: document.email,
        phone: document.phone,
        message: document.message,
        propertyId: document.property?.toString() ?? null,
        propertyTitle: document.propertyTitle,
        status: document.status,
        createdAt: document.createdAt,
      }));
    },

    async updateStatus(id, status) {
      const document = await Contact.findByIdAndUpdate(
        id,
        { $set: { status } },
        { returnDocument: "after", runValidators: true },
      ).exec();
      return document ? { id: document.id, status: document.status } : null;
    },
  };
}
