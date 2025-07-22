// /api/proxy.js
export default async function handler(req, res) {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    try {
        const response = await fetch(targetUrl);
        const contentType = response.headers.get("content-type");
        const data = await response.text();

        res.setHeader("Content-Type", contentType || "text/plain");
        res.status(response.status).send(data);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed", details: err.message });
    }
}
