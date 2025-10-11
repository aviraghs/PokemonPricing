import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.post('/search', async (req, res) => {
    try {
        const { keywords, maxSearchResults } = req.body;
        if (!keywords) {
            return res.status(400).json({ error: 'Keywords are required' });
        }
        if (maxSearchResults && (!Number.isInteger(maxSearchResults) || maxSearchResults <= 0)) {
            return res.status(400).json({ error: 'maxSearchResults must be a positive integer' });
        }

        const response = await fetch('https://ebay-listing.p.rapidapi.com/findCompletedItems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'ebay-listing.p.rapidapi.com'
            },
            body: JSON.stringify({
                keywords,
                maxSearchResults: maxSearchResults || 60
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const apiData = await response.json();
        console.log('API Response:', apiData);

        const recentSold = (apiData.completedItems || []).slice(0, maxSearchResults || 5);

        const averagePrice = recentSold.length
            ? recentSold.reduce((sum, item) => sum + (item.sale_price || 0), 0) / recentSold.length
            : 0;

        res.json({ averagePrice, recentSold });
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));