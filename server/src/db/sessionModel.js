import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: "throw" });

sessionSchema.index({ user: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

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

export function createSessionModel(connection) {
  const Session = connection.models.Session
    ?? connection.model("Session", sessionSchema);

  return {
    initialize: () => Session.init(),

    async create(userId, tokenHash, expiresAt) {
      await Session.deleteMany({ expiresAt: { $lte: new Date() } }).exec();
      await Session.create({ user: userId, tokenHash, expiresAt: new Date(expiresAt) });
    },

    async findUserByTokenHash(tokenHash) {
      const session = await Session.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() },
      })
        .select("+tokenHash")
        .populate({ path: "user", select: "name email role isActive createdAt" })
        .exec();
      return toPublicUser(session?.user);
    },

    async deleteByTokenHash(tokenHash) {
      const result = await Session.deleteOne({ tokenHash }).exec();
      return result.deletedCount > 0;
    },
  };
}
