import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    required: true,
  },
  isActive: { type: Boolean, default: true, required: true },
  passwordHash: {
    type: String,
    required: true,
    select: false,
    match: /^[a-f\d]{128}$/i,
  },
  passwordSalt: {
    type: String,
    required: true,
    select: false,
    match: /^[a-f\d]{32}$/i,
  },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: "throw" });

userSchema.index({ email: 1 }, { unique: true });

function toPublicUser(document) {
  if (!document) return null;
  return {
    id: document.id,
    name: document.name,
    email: document.email,
    role: document.role,
    isActive: document.isActive,
    createdAt: document.createdAt,
  };
}

export function createUserModel(connection) {
  const User = connection.models.User
    ?? connection.model("User", userSchema);

  return {
    initialize: () => User.init(),

    async create({ name, email, passwordHash, passwordSalt, role = "user", isActive = true }) {
      const document = await User.create({ name, email, role, isActive, passwordHash, passwordSalt });
      return toPublicUser(document);
    },

    async findByEmail(email) {
      const document = await User.findOne({ email: email.toLowerCase() })
        .select("+passwordHash +passwordSalt")
        .exec();
      if (!document) return null;
      return {
        id: document.id,
        name: document.name,
        email: document.email,
        role: document.role,
        isActive: document.isActive,
        passwordHash: document.passwordHash,
        passwordSalt: document.passwordSalt,
      };
    },

    async updateRole(id, role) {
      const document = await User.findByIdAndUpdate(id, { role }, { returnDocument: "after" }).exec();
      return toPublicUser(document);
    },

    async findPublicById(id) {
      return toPublicUser(await User.findById(id).exec());
    },

    async findPublicByEmail(email) {
      return toPublicUser(await User.findOne({ email: email.toLowerCase() }).exec());
    },

    async list() {
      const documents = await User.find().sort({ createdAt: -1 }).exec();
      return documents.map(toPublicUser);
    },

    async update(id, input) {
      const document = await User.findByIdAndUpdate(
        id,
        { $set: input },
        { returnDocument: "after", runValidators: true },
      ).exec();
      return toPublicUser(document);
    },
  };
}
