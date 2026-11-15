# CSRF Demo – POST-based Forged Action (Auto-submitting Form)

Cyber Security (IT-30001), Web Server Security assignment, IIIT Allahabad.

> ⚠️ This app is intentionally vulnerable. Run it only on your own machine (localhost).

## Ownership declaration (Table 3)

| Priyanshi Giri | IIT2024069 | Cross-Site Request Forgery (CSRF) | POST-based forged action (auto-submitting form) |
| | | | |
| | | | |
| | | | |

## Project structure

```
csrf-demo/
├── bank/                      # Victim app "MiniBank" (Flask) → http://localhost:5050
│   ├── app.py                 # vulnerable /transfer + mitigation (SECURE=1)
│   └── templates/             # login, dashboard, blocked pages
├── attacker/
│   └── index.html             # Attacker page (exploit) → http://localhost:8000
└── requirements.txt
```

## Setup on macOS

```bash
cd csrf-demo
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> Note: the app uses port **5050** because on macOS, port 5000 is taken by the AirPlay Receiver.

## Demo steps

### A. Show the vulnerability (exploit works)

Terminal 1 (bank, vulnerable mode):
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

### B. Show the mitigation (same payload fails)

Stop Terminal 1 (Ctrl+C), then run:
```bash
SECURE=1 python3 app.py
```
1. Log in again as alice (the server restarted, so the balance is back to Rs 10000).
2. Visit http://localhost:8000 again. You get **403 Forbidden: CSRF token missing or invalid**, and the balance stays Rs 10000. Take a screenshot of this page for item (d).
3. A normal transfer from the MiniBank page still works, because that form carries the token.

## (a) Vulnerable implementation

`bank/app.py`, the `transfer()` route. It accepts `POST /transfer` when the user has a valid session cookie. No other check proves the request came from the user's own action on MiniBank.

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

The server accepts a state-changing request without proof of intent. The browser automatically attaches MiniBank's session cookie to any request sent to MiniBank, even one triggered by another site. The server therefore cannot tell a forged transfer from a real one. Using POST instead of GET does not help, because an attacker's page can auto-submit a hidden POST form.

## (d) Mitigation implemented: synchronizer (anti-CSRF) token

* On login, the server creates a random 256-bit token (`secrets.token_hex(32)`) and stores it in the user's session.
* Every legitimate form includes it as a hidden field: `<input type="hidden" name="csrf_token" ...>`.
* `/transfer` compares the submitted token with the session token using a constant-time comparison (`hmac.compare_digest`). It returns **403** if the token is missing or wrong.
* **Why it works:** because of the Same-Origin Policy, the attacker's page (localhost:8000) cannot read MiniBank's pages, so it cannot learn the token. The browser sends the cookie automatically, but it does not add the token.

## (e) Other mitigations (theory)

* **SameSite cookies.** Set the session cookie with `SameSite=Strict` or `Lax`. The browser then does not attach it to requests started by other *sites*. With `Lax`, a cross-site POST arrives without the cookie, so the attacker's request is unauthenticated. This is defense-in-depth: it relies on browser support, and it does not protect against attacks from the same site (for example a sibling subdomain or another port on the same host, as in this demo).
* **Re-authentication for sensitive actions.** Ask for the password, an OTP or a CAPTCHA again before a transfer or a password change. The attacker does not know this secret, so a forged request cannot complete the action. It adds friction, so use it only for high-risk actions.
* **Avoid state-changing GET requests.** GET should only read data. If a transfer could be done through GET, a simple `<img src="...">` tag would trigger it. Making actions POST-only blocks that trivial vector. As this demo shows, it is **not enough on its own**, so combine it with tokens.
* (Extra) **Checking the Origin/Referer header** and **custom request headers** for AJAX also help. A cross-origin form cannot forge those headers.

## Viva quick answers

* **Why didn't the attacker just read the token?** The Same-Origin Policy prevents scripts on localhost:8000 from reading responses from localhost:5050.
* **Why does the cookie still go along in this demo even though Chrome defaults to SameSite=Lax?** localhost:8000 and localhost:5050 are the *same site* (ports are ignored for "site"), although they are different *origins*. So SameSite does not block it here, and the token is the defense that actually works.
* **Is CSRF the same as XSS?** No. XSS runs attacker script *inside* the trusted site. CSRF only makes the victim's browser *send a request*, and the attacker never sees the response. Note that XSS can defeat CSRF tokens, because a script on the trusted site can read the token.
