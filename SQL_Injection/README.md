# SQL Injection - Authentication Bypass (Mini Web Application)

A small, local-only Flask + SQLite application for the Cyber Security web-server assignment. It demonstrates:
1. A vulnerable login using unsafe SQL string concatenation.
2. The same login protected using a parameterized query.

## Requirements
- Python 3.9 or newer
- pip

## Run on Windows
Open Command Prompt or the VS Code terminal in this folder and run:

```bash
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000 in your browser.

If `py` is not recognized, use `python` instead.

## Demo credentials
- Username: `alice`
- Password: `wonderland`

## Demonstration payload
In the **Vulnerable login** form:
- Username: `' OR '1'='1' -- `
- Password: `anything`

The vulnerable query becomes:

```sql
SELECT * FROM users WHERE username = '' OR '1'='1' -- ' AND password = 'anything'
```

The `OR '1'='1'` condition is true, and `--` comments out the remaining password condition. The application therefore finds a user row and reports a bypass.

Use the exact same username and password in **Fixed login**. It should reject the login because the input is bound as data rather than interpreted as SQL syntax.

## Code locations
- Vulnerable code: `app.py`, route `/vulnerable`, query built using string concatenation.
- Fixed code: `app.py`, route `/secure`, `conn.execute(query, (username, password))`.

## Root cause and mitigation
**Root cause:** User-controlled input is concatenated directly into an SQL statement, allowing input to change the query's logic.

**Implemented mitigation:** Parameterized SQL queries. The SQL statement and input values are sent separately, preventing the input from becoming executable SQL syntax.

Other mitigations to study from the assignment slides: allow-list input validation, least-privilege database accounts, and safe error handling.

## Safety note
The vulnerable endpoint is intentionally insecure for a controlled coursework demonstration. Keep it on localhost, do not expose it to the internet, and do not use the payload against any other system.
