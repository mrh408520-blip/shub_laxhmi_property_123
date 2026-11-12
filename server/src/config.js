import "dotenv/config";

export function getConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV ?? "development";
  const ttlDays = Number(env.SESSION_TTL_DAYS ?? 7);
  if (!Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > 30) {
    throw new Error("SESSION_TTL_DAYS must be an integer between 1 and 30.");
  }

  const mongoUri = env.MONGODB_URI?.trim();
  if (!mongoUri || !/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    throw new Error("MONGODB_URI must be a MongoDB connection URI.");
  }

  const adminEmails = (env.ADMIN_EMAILS ?? env.ADMIN_EMAIL ?? "admin@shubhlakshmi.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return {
    port: Number(env.PORT ?? 3001),
    nodeEnv,
    mongoUri,
    clientOrigins: (env.CLIENT_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionTtlMs: ttlDays * 24 * 60 * 60 * 1000,
    cookieSecure: env.COOKIE_SECURE === "true" || nodeEnv === "production",
    adminEmails,
    adminPassword: env.ADMIN_PASSWORD ?? "Admin@12345",
  };
}
