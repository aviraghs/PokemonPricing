// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const MONGO_URI = process.env.MONGO_URI;

// --- MongoDB Setup ---
let db;
const client = new MongoClient(MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db("pokemon_prices");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}
connectDB();

// --- Function to call RapidAPI ---
async function fetchEbaySold(query) {
  const url = "https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": "a438851fb2mshe8fa00ad66f2771p17e03bjsnc71097a3519f",
      "X-RapidAPI-Host": "ebay-average-selling-price.p.rapidapi.com",
    },
    body: JSON.stringify({ search: query, max_search_results: 60 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RapidAPI error ${res.status}: ${text}`);
  }

  return res.json();
}

// --- Main API route ---
app.get("/api/card", async (req, res) => {
  const card = req.query.name;
  if (!card) return res.status(400).json({ error: "Missing ?name parameter" });

  try {
    const collection = db.collection("sold_data");

    // check cache (6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const cached = await collection.findOne({
      name: card.toLowerCase(),
      updatedAt: { $gt: sixHoursAgo },
    });

    if (cached) {
      return res.json({ source: "cache", data: cached.data });
    }

    // fetch fresh data
    const data = await fetchEbaySold(card);
    await collection.updateOne(
      { name: card.toLowerCase() },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({ source: "api", data });
  } catch (err) {
    console.error("❌ Error fetching card data:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Debug route (optional) ---
app.get("/api/debug/all", async (req, res) => {
  try {
    const docs = await db.collection("sold_data").find({}).toArray();
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
