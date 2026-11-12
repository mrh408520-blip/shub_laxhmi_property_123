import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthService({ users, sessions, sessionTtlMs, adminEmails = [], adminPassword = "Admin@12345" }) {
  async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
    const derivedKey = await scrypt(password, salt, 64);
    return { passwordHash: derivedKey.toString("hex"), passwordSalt: salt };
  }

  async function verifyPassword(password, salt, expectedHash) {
    const actual = await scrypt(password, salt, 64);
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async function issueSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + sessionTtlMs;
    await sessions.create(userId, hashToken(token), expiresAt);
    return { token, expiresAt };
  }

  async function getValidUser(record, password) {
    if (!record) return null;
    const valid = await verifyPassword(password, record.passwordSalt, record.passwordHash);
    return valid ? record : null;
  }

  async function ensureAdminAccounts() {
    const emails = [...new Set(adminEmails.filter(Boolean).map((email) => String(email).trim().toLowerCase()))];
    if (emails.length === 0) return [];

    const created = [];
    for (const email of emails) {
      const record = await users.findByEmail(email);
      if (record && record.role === "admin") continue;

      if (record) {
        const updated = await users.updateRole(record.id, "admin");
        created.push(updated);
        continue;
      }

      const passwordData = await hashPassword(adminPassword);
      const user = await users.create({
        name: "Administrator",
        email,
        role: "admin",
        ...passwordData,
      });
      created.push(user);
    }
    return created;
  }

  return {
    ensureAdminAccounts,

    async register({ name, email, password }) {
      const normalizedEmail = email.toLowerCase();
      if (await users.findByEmail(normalizedEmail)) {
        const error = new Error("An account with this email already exists.");
        error.status = 409;
        throw error;
      }

      const passwordData = await hashPassword(password);
      let user;
      try {
        user = await users.create({ name, email: normalizedEmail, role: "user", ...passwordData });
      } catch (error) {
        if (error.code === 11000) {
          const conflict = new Error("An account with this email already exists.");
          conflict.status = 409;
          throw conflict;
        }
        throw error;
      }
      return { user, session: await issueSession(user.id) };
    },

    async login({ email, password }) {
      const record = await users.findByEmail(email.toLowerCase());
      const validUser = await getValidUser(record, password);
      if (!validUser || !validUser.isActive) {
        const error = new Error("Email or password is incorrect.");
        error.status = 401;
        throw error;
      }
      const user = await users.findPublicById(validUser.id);
      return { user, session: await issueSession(user.id) };
    },

    async adminLogin({ email, password }) {
      const record = await users.findByEmail(email.toLowerCase());
      const validUser = await getValidUser(record, password);
      if (!validUser || !validUser.isActive || validUser.role !== "admin") {
        const error = new Error("Admin access is required.");
        error.status = 403;
        throw error;
      }
      const user = await users.findPublicById(validUser.id);
      return { user, session: await issueSession(user.id) };
    },

    async getUser(token) {
      return token ? sessions.findUserByTokenHash(hashToken(token)) : null;
    },

    async logout(token) {
      if (token) await sessions.deleteByTokenHash(hashToken(token));
    },
  };
}
