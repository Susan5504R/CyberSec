
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3002;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// HTML output encoding function
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

// Protected search endpoint
app.get("/search", (req, res) => {
    const search = req.query.search;

    // Validate input type and length
    const query =
        typeof search === "string"
            ? search.slice(0, 500)
            : "";

    // MITIGATION: Encode user input before HTML insertion
    const safeQuery = escapeHTML(query);

    res.setHeader("X-Content-Type-Options", "nosniff");

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Search Results - Protected</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reflected XSS Lab</h1>
                    <span class="safe">PROTECTED VERSION</span>
                </div>

                <h2>Search Results</h2>

                <div class="result">
                    <p>You searched for:</p>
                    <div class="search-output">${safeQuery}</div>
                </div>

                <a href="/" class="back">Back to Home</a>
            </div>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(
        `Protected application running at http://localhost:${PORT}`
    );
});
