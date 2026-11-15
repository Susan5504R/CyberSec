const { Router } = require("express");
const { exec, execFile } = require("child_process");
const { isIP } = require("net");
const { performance } = require("perf_hooks");

const router = Router();

const VULNERABLE_TIMEOUT_MS = 7500;
const SECURED_TIMEOUT_MS = 6000;

// This exact, harmless Windows payload is enabled only for the local classroom
// demonstration. It runs one additional ping sequence and redirects its output
// to NUL. Do not expand this to accept arbitrary command strings.
const CONTROLLED_DELAY_PAYLOAD =
    "127.0.0.1 & ping -n 5 127.0.0.1 > nul";

function isAllowedHostname(value) {
    if (typeof value !== "string") {
        return false;
    }

    const host = value.trim();

    if (host.length === 0 || host.length > 253) {
        return false;
    }

    // Accept IPv4 addresses or ordinary DNS hostnames (including localhost).
    if (isIP(host) === 4) {
        return true;
    }

    if (host.toLowerCase() === "localhost") {
        return true;
    }

    const labels = host.split(".");
    return labels.every((label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)
    );
}

function elapsedMilliseconds(startTime) {
    return Math.round((performance.now() - startTime) * 100) / 100;
}

// POST /api/diagnostic/vulnerable
// Intentionally vulnerable teaching route: the supplied value is concatenated
// into a command string and interpreted by the Windows command shell.
// The server is loopback-only and this route permits only the baseline host
// or the one fixed harmless delay payload shown in the UI.
router.post("/vulnerable", (req, res) => {
    const host = req.body && req.body.host;

    if (typeof host !== "string" || host.trim().length === 0) {
        return res.status(400).json({
            success: false,
            accepted: false,
            message: "Enter a hostname or IPv4 address."
        });
    }

    const trimmedHost = host.trim();
    const isBaseline = trimmedHost === "127.0.0.1";
    const isDemoPayload = trimmedHost === CONTROLLED_DELAY_PAYLOAD;

    if (!isBaseline && !isDemoPayload) {
        return res.status(400).json({
            success: false,
            accepted: false,
            message: "This lab endpoint accepts only 127.0.0.1 or the displayed controlled demo payload."
        });
    }

    // Vulnerability: user-controlled text is joined into a shell command.
    // exec() invokes a shell, so shell metacharacters can change command flow.
    const command = `ping -n 1 ${trimmedHost}`;
    const startedAt = performance.now();

    exec(
        command,
        {
            timeout: VULNERABLE_TIMEOUT_MS,
            windowsHide: true,
            maxBuffer: 1024 * 1024
        },
        (error) => {
            const elapsedMs = elapsedMilliseconds(startedAt);

            // Do not return stdout/stderr or the constructed command to the browser.
            if (error && error.killed) {
                return res.status(200).json({
                    success: false,
                    accepted: true,
                    status: "timeout",
                    message: "The diagnostic process exceeded its time limit.",
                    elapsedMs
                });
            }

            if (error) {
                return res.status(200).json({
                    success: false,
                    accepted: true,
                    status: "unreachable",
                    message: "The host could not be reached or the diagnostic failed.",
                    elapsedMs
                });
            }

            return res.status(200).json({
                success: true,
                accepted: true,
                status: isDemoPayload ? "completed_demo" : "reachable",
                message: isDemoPayload
                    ? "Controlled demonstration completed. Compare the response time."
                    : "The diagnostic process completed.",
                elapsedMs
            });
        }
    );
});

// POST /api/diagnostic/secured
// Secure route: validate the hostname and pass it as one separate argument.
// execFile() does not use a shell when shell:false.
router.post("/secured", (req, res) => {
    const host = req.body && req.body.host;

    if (!isAllowedHostname(host)) {
        return res.status(400).json({
            success: false,
            accepted: false,
            status: "rejected",
            message: "Input rejected. Enter a valid hostname or IPv4 address.",
            elapsedMs: 0
        });
    }

    const trimmedHost = host.trim();
    const startedAt = performance.now();

    execFile(
        "ping",
        ["-n", "1", trimmedHost],
        {
            timeout: SECURED_TIMEOUT_MS,
            windowsHide: true,
            shell: false
        },
        (error) => {
            const elapsedMs = elapsedMilliseconds(startedAt);

            if (error && error.killed) {
                return res.status(200).json({
                    success: false,
                    accepted: true,
                    status: "timeout",
                    message: "The diagnostic process exceeded its time limit.",
                    elapsedMs
                });
            }

            if (error) {
                return res.status(200).json({
                    success: false,
                    accepted: true,
                    status: "unreachable",
                    message: "The host could not be reached or the diagnostic failed.",
                    elapsedMs
                });
            }

            return res.status(200).json({
                success: true,
                accepted: true,
                status: "reachable",
                message: "The host responded to the diagnostic.",
                elapsedMs
            });
        }
    );
});

module.exports = router;
