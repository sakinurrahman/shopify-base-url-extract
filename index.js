const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); // Import CORS middleware

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

let browser;

(async () => {
    // Launch Puppeteer once
    browser = await puppeteer.launch({ headless: true });
})();

app.get('/', async (req, res) => {
    try {
        let shopUrl = req.query.url;
        if (!shopUrl) {
            return res.status(400).send({ error: 'Please provide a domain name as a query parameter (e.g., ?url=devluxx.com)' });
        }

        if (!shopUrl.startsWith('http')) {
            shopUrl = `https://${shopUrl}`;
        }

        const page = await browser.newPage();

        // Block unnecessary resources to speed up load time
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to: ${shopUrl}`);
        await page.goto(shopUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const title = await page.title();
        console.log(`Page loaded with title: ${title}`);

        const shopifyUrl = await page.evaluate(() => {
            if (window.Shopify && window.Shopify.shop) {
                return window.Shopify.shop;
            }
            return null;
        });

        await page.close();

        if (shopifyUrl) {
            res.json({ shopifyUrl });
        } else {
            res.status(404).send({ error: 'Could not find Shopify URL for the provided domain.' });
        }
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send({ error: 'An error occurred while fetching the Shopify URL.', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
