"""
MiniBank - a deliberately vulnerable app for the CSRF (POST-based forged action) demo.

Run VULNERABLE:  python3 app.py
Run SECURE:      SECURE=1 python3 app.py

FOR LOCAL CLASSROOM USE ONLY. Do not deploy.
"""
import hmac
import os
import secrets

from flask import Flask, abort, redirect, render_template, request, session, url_for

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Toggle the one implemented mitigation (synchronizer / anti-CSRF token).
SECURE = os.environ.get("SECURE") == "1"

# Toy in-memory "database" (demo accounts only).
USERS = {
    "alice": {"password": "alice123", "balance": 10000},
    "attacker": {"password": "attacker123", "balance": 0},
}
LOG = []  # transaction history shown on the dashboard


# ---------------------------------------------------------------- helpers
def current_user():
    return session.get("user")


def get_csrf_token():
    """Synchronizer token: one random secret per session, stored server-side
    (in the signed session) and embedded in every legitimate form."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


app.jinja_env.globals["csrf_token"] = get_csrf_token


@app.context_processor
def inject_mode():
    return {"secure": SECURE}


# ---------------------------------------------------------------- routes
@app.route("/")
def index():
    if not current_user():
        return redirect(url_for("login"))
    user = current_user()
    return render_template(
        "dashboard.html", user=user, balance=USERS[user]["balance"], log=LOG
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        u, p = request.form.get("username", ""), request.form.get("password", "")
        if u in USERS and USERS[u]["password"] == p:
            session.clear()
            session["user"] = u
            return redirect(url_for("index"))
        error = "Invalid credentials"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/transfer", methods=["POST"])
def transfer():
    # ---------------------------------------------------------------------
    # VULNERABLE CODE PATH:
    # The only check is "is there a valid session cookie?". The browser
    # attaches that cookie automatically to ANY request to this origin,
    # including one fired by a form on an attacker's page. Nothing proves
    # the user actually intended this transfer.
    # ---------------------------------------------------------------------
    user = current_user()
    if not user:
        abort(401)

    # ---------------------------------------------------------------------
    # MITIGATION (enabled with SECURE=1): synchronizer token.
    # The attacker's page cannot read our pages (Same-Origin Policy), so it
    # cannot learn the token and cannot put the right value in its form.
    # ---------------------------------------------------------------------
    if SECURE:
        sent = request.form.get("csrf_token", "")
        expected = session.get("csrf_token", "")
        if not expected or not hmac.compare_digest(sent, expected):
            app.logger.warning("BLOCKED CSRF attempt on /transfer for user=%s", user)
            return render_template("blocked.html"), 403

    to = request.form.get("to", "")
    try:
        amount = int(request.form.get("amount", "0"))
    except ValueError:
        abort(400)

    if to not in USERS or amount <= 0 or amount > USERS[user]["balance"]:
        abort(400)

    USERS[user]["balance"] -= amount
    USERS[to]["balance"] += amount
    LOG.append(f"{user} -> {to}: Rs {amount}")
    app.logger.warning("TRANSFER %s -> %s : %d", user, to, amount)
    return redirect(url_for("index"))


if __name__ == "__main__":
    print("=" * 60)
    print(" MiniBank running in", "SECURE (CSRF token ON)" if SECURE else "VULNERABLE mode")
    print(" Open http://localhost:5050")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5050, debug=False)
