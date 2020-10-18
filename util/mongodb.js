import { MongoClient } from 'mongodb'

let uri = process.env.MONGODB_URI
let dbName = process.env.MONGODB_DB

let cachedClient = null
let cachedDb = null

if (!uri) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

if (!dbName) {
  throw new Error(
    'Please define the MONGODB_DB environment variable inside .env.local'
  )
}

export const connectToDatabase = async () => {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const db = await client.db(dbName)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export const checkCache = async (collection, id, expirationMinutes = process.env.EXTENDED_CACHE_MINS) => {
  const { db } = await connectToDatabase();
  const cacheTime = expirationMinutes * 60 * 1000;
  const cache = await db
    .collection(collection)
    .findOne({
      _id: id,
      updated_at: {
        $gte: new Date(new Date().getTime() - cacheTime).toISOString()
      }
    })

  if (cache) {
    return cache.data;
  }
  return false;
}

export const saveCache = async (collection, id, data) => {
  const { db } = await connectToDatabase();
  const response = await db
  .collection(collection)
  .updateOne(
    { _id: id },
    { $set: { data: data, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
  return response;
}
