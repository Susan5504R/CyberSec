# CSRF Demo – POST-based Forged Action (Auto-submitting Form)

Cyber Security (IT-30001), Web Server Security assignment, IIIT Allahabad.

> ⚠️ This app is intentionally vulnerable. Run it only on your own machine (localhost).

## Ownership declaration

| Member name | Roll number | Category | Variant implemented |
|---|---|---|---|
| Priyanshi Giri | IIT2024069 | Cross-Site Request Forgery (CSRF) | POST-based forged action (auto-submitting form) |

## Project structure

```
CSRF/
├── bank/                      # Victim app "MiniBank" (Flask) → http://localhost:5050
│   ├── app.py                 # vulnerable /transfer route + mitigation (SECURE=1)
│   └── templates/             # login, dashboard and blocked pages
├── attacker/
│   └── index.html             # Attacker page (exploit) → http://localhost:8000
└── requirements.txt
```

## Setup (macOS / Linux)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Note: the app uses port **5050** because on macOS, port 5000 is taken by the AirPlay Receiver.

## How to run the demo

### A. Exploit (vulnerable mode)

Terminal 1 (bank):
```bash
cd bank && python3 app.py
```
Terminal 2 (attacker site, a different origin):
```bash
python3 -m http.server 8000 --directory attacker
```
1. Open http://localhost:5050 and log in as `alice / alice123`. The balance is **Rs 10000**.
2. In the same browser, open http://localhost:8000. This is the "You won an iPhone" page.
3. The page auto-submits a hidden form, and you land back on MiniBank with a balance of **Rs 5000**. The log shows `alice -> attacker: Rs 5000`. The victim never clicked anything.

### B. Mitigation (same payload fails)

Stop Terminal 1 (Ctrl+C), then run:
```bash
SECURE=1 python3 app.py
```
1. Log in again as alice (the balance is back to Rs 10000).
2. Visit http://localhost:8000 again. The bank returns **403 Forbidden: CSRF token missing or invalid**, and the balance stays Rs 10000.
3. A normal transfer from the MiniBank page still works, because that form carries the token.

## (a) Vulnerable implementation

`bank/app.py`, the `transfer()` route. It accepts `POST /transfer` when the user has a valid session cookie. No other check proves that the request came from the user's own action on MiniBank.

```python
user = current_user()
if not user:
    abort(401)
# ...transfer is performed without any proof of intent
```

## (b) Exploit payload

`attacker/index.html`:
```html
<form id="csrf" action="http://localhost:5050/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="5000">
</form>
<script>document.getElementById("csrf").submit();</script>
```

## (c) Root cause

The server accepts a state-changing request without proof of intent. The browser automatically attaches MiniBank's session cookie to any request sent to MiniBank, even one triggered by another site, so the server cannot tell a forged transfer from a real one. Using POST instead of GET does not help, because an attacker's page can auto-submit a hidden POST form.

## (d) Mitigation implemented: synchronizer (anti-CSRF) token

* The server creates a random 256-bit token (`secrets.token_hex(32)`) and stores it in the user's session.
* Every legitimate form includes it as a hidden field: `<input type="hidden" name="csrf_token" ...>`.
* `/transfer` compares the submitted token with the session token using a constant-time comparison (`hmac.compare_digest`). It returns **403** if the token is missing or wrong.
* **Why it works:** because of the Same-Origin Policy, the attacker's page (localhost:8000) cannot read MiniBank's pages, so it cannot learn the token. The browser sends the cookie automatically, but it does not add the token.

```python
if SECURE:
    sent = request.form.get("csrf_token", "")
    expected = session.get("csrf_token", "")
    if not expected or not hmac.compare_digest(sent, expected):
        return render_template("blocked.html"), 403
```

## (e) Other mitigations (theory)

* **SameSite cookies.** Set the session cookie with `SameSite=Strict` or `Lax`. The browser then does not attach it to requests started by other *sites*, so the forged request arrives unauthenticated. This is defense-in-depth: it relies on browser support, and it does not protect against requests from the same site (for example a sibling subdomain, or another port on the same host as in this demo).
* **Re-authentication for sensitive actions.** Ask for the password, an OTP or a CAPTCHA again before a transfer or a password change. The attacker does not know this secret, so a forged request cannot complete the action. It adds friction, so it is used only for high-risk actions.
* **Avoid state-changing GET requests.** GET should only read data. If a transfer could be done through GET, a simple `<img src="...">` tag would trigger it. Making actions POST-only blocks that trivial vector, but as this demo shows, it is **not enough on its own**, so it must be combined with tokens.
* **Origin/Referer checks and custom request headers** also help, because a cross-origin form cannot set or forge those headers.
