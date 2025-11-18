import mongoose, { Mongoose } from "mongoose";

/**
 * MongoDB connection URI.
 *
 * Expected to be provided via the MONGODB_URI environment variable.
 * This should include credentials and the default database name, e.g.:
 *   mongodb+srv://user:password@cluster.mongodb.net/my-database
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside your environment (e.g. .env.local).",
  );
}

/**
 * Cached connection object stored on the Node.js global scope.
 *
 * In development, Next.js reloads modules on every request. Without a cache,
 * this would create a new MongoDB connection on each reload, quickly
 * exhausting available connections. By storing the connection globally, we
 * ensure that the same connection is reused across reloads.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Augment the Node.js global type to include our cached Mongoose connection.
declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var mongoose: MongooseCache | undefined;
}

// Use the existing cached connection if it exists, otherwise create a new cache container.
const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Establishes (or retrieves) a cached Mongoose connection.
 *
 * This function is safe to call from both server components and API routes.
 * It ensures that only a single MongoDB connection is created per server
 * instance in production, and it reuses the same connection across hot
 * reloads in development.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // If we already have an active connection, reuse it.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is not already in progress, start a new one.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Disable command buffering so errors surface immediately if the
      // connection is not ready yet.
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise so that future calls can retry the connection.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
