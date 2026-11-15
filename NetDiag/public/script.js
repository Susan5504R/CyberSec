const hostInput = document.getElementById("hostInput");
const vulnerableButton = document.getElementById("vulnerableButton");
const securedButton = document.getElementById("securedButton");
const resetButton = document.getElementById("resetButton");
const usePayloadButton = document.getElementById("usePayloadButton");

const activityLabel = document.getElementById("activityLabel");
const resultIcon = document.getElementById("resultIcon");
const resultOverline = document.getElementById("resultOverline");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const resultTime = document.getElementById("resultTime");
const lastRequest = document.getElementById("lastRequest");
const acceptanceState = document.getElementById("acceptanceState");

const controlledPayload = "127.0.0.1 & ping -n 5 127.0.0.1 > nul";

function setBusy(isBusy) {
    vulnerableButton.disabled = isBusy;
    securedButton.disabled = isBusy;
    activityLabel.innerHTML = isBusy ? "<i></i> RUNNING" : "<i></i> IDLE";
}

function showResult(data, mode) {
    const elapsed = typeof data.elapsedMs === "number" ? data.elapsedMs : null;

    resultOverline.textContent = `${mode.toUpperCase()} / ${data.status || "RESPONSE"}`;
    resultTitle.textContent = data.accepted
        ? (data.success ? "Diagnostic completed." : "Diagnostic did not succeed.")
        : "Input rejected.";
    resultMessage.textContent = data.message || "The server returned no message.";
    resultIcon.textContent = data.success ? "✓" : (data.accepted ? "!" : "×");
    resultIcon.style.color = data.success ? "var(--green)" : "var(--orange)";
    resultTime.innerHTML = elapsed === null
        ? "—<small> ms</small>"
        : `${elapsed.toFixed(2)}<small> ms</small>`;
    lastRequest.textContent = mode.toUpperCase();
    acceptanceState.textContent = `INPUT: ${data.accepted ? "ACCEPTED" : "REJECTED"}`;
    acceptanceState.style.color = data.accepted ? "var(--green)" : "var(--orange)";
}

async function runDiagnostic(mode) {
    const host = hostInput.value.trim();

    if (!host) {
        showResult({
            accepted: false,
            success: false,
            status: "missing_input",
            message: "Enter a hostname or IPv4 address first."
        }, mode);
        return;
    }

    setBusy(true);
    resultOverline.textContent = `${mode.toUpperCase()} / REQUEST SENT`;
    resultTitle.textContent = "Measuring response...";
    resultMessage.textContent = "Waiting for the local NetDiag server.";
    resultIcon.textContent = "⌁";
    resultTime.innerHTML = "…<small> ms</small>";

    try {
        const response = await fetch(`/api/diagnostic/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host })
        });

        const data = await response.json();
        showResult(data, mode);
    } catch (error) {
        showResult({
            accepted: false,
            success: false,
            status: "connection_error",
            message: "Could not contact NetDiag. Check that the local server is running."
        }, mode);
    } finally {
        setBusy(false);
    }
}

vulnerableButton.addEventListener("click", () => runDiagnostic("vulnerable"));
securedButton.addEventListener("click", () => runDiagnostic("secured"));

resetButton.addEventListener("click", () => {
    hostInput.value = "127.0.0.1";
    hostInput.focus();
});

usePayloadButton.addEventListener("click", () => {
    hostInput.value = controlledPayload;
    hostInput.focus();
});
