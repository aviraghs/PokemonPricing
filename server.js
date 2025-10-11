import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // <- read from Replit Secrets

app.post("/search", async (req, res) => {
  const { keywords } = req.body;
  if (!keywords) {
    return res.status(400).json({ err_msg: "A value for 'keywords' in the body data is required" });
  }

  try {
    const response = await fetch("https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "ebay-average-selling-price.p.rapidapi.com",
      },
      body: JSON.stringify({ keywords, max_search_results: 5 }) // last 5 sold
    });

    const data = await response.json();
    console.log("API response:", data); // <- debug the API response

    // Filter aggressively to avoid empty results
    const recentSold = data.recent_sold?.filter(item => item.price && item.title?.toLowerCase().includes(keywords.toLowerCase())) || [];
    const averagePrice = recentSold.length ? recentSold.reduce((sum, item) => sum + item.price, 0) / recentSold.length : 0;

    res.json({ averagePrice, recentSold });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err_msg: "Error fetching data" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
