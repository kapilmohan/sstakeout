// Import Required Modules
const functions = require('firebase-functions'); // For defining Firebase functions
const admin = require('firebase-admin'); // Firebase Admin SDK for Firestore
const axios = require('axios'); // For HTTP requests
const xml2js = require('xml2js'); // For parsing XML RSS feeds
const puppeteer = require('puppeteer'); // For headless browser automation

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// 1. Fetch SlideShare RSS Feed and Store Metadata in Firestore
exports.fetchRSS = functions.https.onRequest(async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    const rssUrl = `https://www.slideshare.net/rss/user/${username}`;

    try {
        // Fetch RSS feed
        const { data } = await axios.get(rssUrl);

        // Parse RSS feed
        const feed = await xml2js.parseStringPromise(data);
        const presentations = feed.rss.channel[0].item.map(item => ({
            title: item.title[0],
            link: item.link[0],
            description: item.description[0],
        }));

        // Save to Firestore
        await db.collection('users').doc(username).set({ presentations }, { merge: true });

        res.json({ message: 'RSS data fetched and stored successfully.', presentations });
    } catch (error) {
        console.error('Error fetching RSS:', error);
        res.status(500).send('Error fetching RSS feed.');
    }
});

// 2. Generate Download Links Using Puppeteer
exports.generateDownloadLinks = functions.https.onRequest(async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    try {
        // Get user presentations from Firestore
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            return res.status(404).send('User not found.');
        }

        const presentations = userDoc.data().presentations;
        const browser = await puppeteer.launch();
        const slideSaverUrl = 'https://slidesaver.app';
        const downloadLinks = {};

        for (const presentation of presentations) {
            const page = await browser.newPage();
            await page.goto(slideSaverUrl);

            // Input SlideShare URL
            await page.type('input[name="url"]', presentation.link);
            await page.click('button[type="submit"]');

            // Wait for download links
            await page.waitForSelector('a.download-link', { timeout: 60000 });
            const pdfLink = await page.$eval('a.download-link[href$=".pdf"]', el => el.href);
            const pptxLink = await page.$eval('a.download-link[href$=".pptx"]', el => el.href);

            downloadLinks[presentation.title] = { pdfLink, pptxLink };
            await page.close();
        }

        await browser.close();

        // Update Firestore with download links
        await db.collection('users').doc(username).update({ downloadLinks });

        res.json({ message: 'Download links generated successfully.', downloadLinks });
    } catch (error) {
        console.error('Error generating download links:', error);
        res.status(500).send('Error generating download links.');
    }
});

// 3. Get Download Links
exports.getDownloadLinks = functions.https.onRequest(async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    try {
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            return res.status(404).send('User not found.');
        }

        const data = userDoc.data();
        res.json({ downloadLinks: data.downloadLinks || {} });
    } catch (error) {
        console.error('Error fetching download links:', error);
        res.status(500).send('Error fetching download links.');
    }
});
