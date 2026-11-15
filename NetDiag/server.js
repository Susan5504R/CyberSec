const express = require("express");
const path = require("path");
const diagnosticRouter = require("./routes/diagnostic");

const app = express();
const PORT = 3000;

// Parse JSON request bodies, with a small size limit.
app.use(express.json({ limit: "10kb" }));

// Serve index.html, style.css and script.js from the public directory.
app.use(express.static(path.join(__dirname, "public")));

// Mount the diagnostic API routes under /api/diagnostic.
app.use("/api/diagnostic", diagnosticRouter);

// A simple endpoint to confirm that the backend is running.
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "NetDiag server is running"
    });
});

// Return a generic message for malformed JSON or unexpected server errors.
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "The request body must contain valid JSON."
        });
    }

    console.error("Unexpected server error:", err.message);
    return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

// Bind only to the loopback interface so the teaching demo is not exposed
// to other computers on the network.
app.listen(PORT, "127.0.0.1", () => {
    console.log(`NetDiag running at http://127.0.0.1:${PORT}`);
    console.log("Local-only teaching demo. Do not expose this server to a network.");
});
