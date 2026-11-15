
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Vulnerable search endpoint
app.get("/search", (req, res) => {
    const search = req.query.search;

    // Basic input type and length handling
    const query =
        typeof search === "string"
            ? search.slice(0, 500)
            : "";

    // INTENTIONALLY VULNERABLE:
    // User input is directly inserted into HTML.
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Search Results - Vulnerable</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reflected XSS Lab</h1>
                    <span class="danger">VULNERABLE VERSION</span>
                </div>

                <h2>Search Results</h2>

                <div class="result">
                    <p>You searched for:</p>
                    <div class="search-output">${query}</div>
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
        `Vulnerable application running at http://localhost:${PORT}`
    );
});
