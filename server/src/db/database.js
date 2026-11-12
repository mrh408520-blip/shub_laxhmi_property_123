import mongoose from "mongoose";

export async function connectDatabase(uri) {
  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  await connection.asPromise();
  return connection;
}

export async function initializeModels(models) {
  await Promise.all(models.map((model) => model.initialize()));
}
