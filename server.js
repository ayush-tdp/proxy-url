const express = require("express");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/proxy", async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        const response = await fetch(targetUrl);
        const contentType = response.headers.get("content-type");
        const data = await response.text();

        res.set("Content-Type", contentType || "text/plain");
        res.status(response.status).send(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch resource", details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`CORS Proxy Server running on http://localhost:${PORT}`);
});
