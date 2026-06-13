import { MongoClient, type Db } from "mongodb";

const MONGO_URI = process.env.MONGO_CONNECTION_STRING ?? "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DB ?? "wec-livetiming";

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[db] Connected to MongoDB — ${DB_NAME} @ ${MONGO_URI}`);
  return db;
}

export function getDB(): Db {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) await client.close();
}
