from flask import Flask, request, render_template_string
import sqlite3

app = Flask(__name__)
DB = "demo.db"

PAGE = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SQL Injection Lab - Authentication Bypass</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; background: #f3f5f9; color: #202938; }
    main { max-width: 900px; margin: 42px auto; padding: 0 18px; }
    h1 { margin-bottom: 8px; }
    .sub { color: #596579; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 18px; margin-top: 25px; }
    section { background: white; border: 1px solid #dce2eb; border-radius: 12px; padding: 22px; box-shadow: 0 5px 18px #1720330c; }
    h2 { margin-top: 0; font-size: 20px; }
    label { display:block; margin: 13px 0 6px; font-weight: bold; }
    input { width:100%; padding:11px; border:1px solid #bbc5d3; border-radius:7px; }
    button { margin-top:16px; width:100%; padding:11px; border:0; border-radius:7px; background:#2457c5; color:white; font-weight:bold; cursor:pointer; }
    .vuln button { background:#b54735; }
    .result { margin-top:18px; padding:12px; border-radius:8px; line-height:1.45; overflow-wrap:anywhere; }
    .bad { background:#fff0ed; border:1px solid #f2b5aa; }
    .good { background:#eaf8ef; border:1px solid #a7d8b6; }
    .neutral { background:#eef3fb; border:1px solid #c8d6ee; }
    code { background:#edf0f5; padding:2px 5px; border-radius:4px; }
    pre { white-space:pre-wrap; overflow-wrap:anywhere; background:#202938; color:#f4f7fb; padding:12px; border-radius:7px; font-size:12px; }
    .hint { color:#596579; font-size:13px; line-height:1.5; }
  </style>
</head>
<body>
<main>
  <h1>SQL Injection: Authentication Bypass</h1>
  <p class="sub">A local educational demo showing a vulnerable login and its parameterized-query fix.</p>
  <div class="grid">
    <section class="vuln">
      <h2>1. Vulnerable login</h2>
      <p class="hint">This version directly joins user input into an SQL query. Use only in this local lab.</p>
      <form method="post" action="/vulnerable">
        <label>Username</label><input name="username" required>
        <label>Password</label><input name="password" type="password" required>
        <button type="submit">Test vulnerable login</button>
      </form>
      {% if vulnerable_result %}
        <div class="result {{ vulnerable_result.kind }}">
          <strong>{{ vulnerable_result.title }}</strong><br>{{ vulnerable_result.message }}
          {% if vulnerable_result.query %}<p>SQL query generated:</p><pre>{{ vulnerable_result.query }}</pre>{% endif %}
        </div>
      {% endif %}
    </section>
    <section>
      <h2>2. Fixed login</h2>
      <p class="hint">This version uses placeholders and passes input separately from the SQL statement.</p>
      <form method="post" action="/secure">
        <label>Username</label><input name="username" required>
        <label>Password</label><input name="password" type="password" required>
        <button type="submit">Test secure login</button>
      </form>
      {% if secure_result %}
        <div class="result {{ secure_result.kind }}">
          <strong>{{ secure_result.title }}</strong><br>{{ secure_result.message }}
          {% if secure_result.query %}<p>Parameterized SQL:</p><pre>{{ secure_result.query }}</pre>{% endif %}
        </div>
      {% endif %}
    </section>
  </div>
  <section style="margin-top:18px">
    <h2>How to demonstrate</h2>
    <ol>
      <li>First try the normal credentials: <code>alice</code> / <code>wonderland</code>.</li>
      <li>For the vulnerable form, enter username <code>' OR '1'='1' -- </code> / <code>alice'--</code> and any password.</li>
      <li>It logs in without the real password because the injected condition makes the WHERE clause true.</li>
      <li>Use the same payload in the fixed form. It should show “Invalid username or password”.</li>
    </ol>
    <p class="hint"><strong>Root cause:</strong> concatenating untrusted input into SQL changes the query's structure.
    <strong>Mitigation implemented:</strong> parameterized queries keep input as data, not SQL code.</p>
    <p class="hint"></p>
  </section>
</main>
</body>
</html>
"""

def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)
        conn.execute(
            "INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)",
            ("alice", "wonderland")
        )

@app.route("/", methods=["GET"])
def home():
    return render_template_string(PAGE, vulnerable_result=None, secure_result=None)

@app.route("/vulnerable", methods=["POST"])
def vulnerable():
    username = request.form.get("username", "")
    password = request.form.get("password", "")
    # INTENTIONALLY VULNERABLE: do not use this pattern in real applications.
    query = (
        "SELECT * FROM users WHERE username = '" + username +
        "' AND password = '" + password + "'"
    )
    try:
        with connect() as conn:
            user = conn.execute(query).fetchone()
        if user:
            result = {
                "kind": "bad",
                "title": "VULNERABILITY DEMONSTRATED: Login bypassed",
                "message": "A user session would be granted even though the real password was not supplied.",
                "query": query
            }
        else:
            result = {
                "kind": "neutral",
                "title": "Login rejected",
                "message": "No matching account was found.",
                "query": query
            }
    except sqlite3.Error as exc:
        result = {
            "kind": "bad",
            "title": "SQL error (also evidence of unsafe query construction)",
            "message": str(exc),
            "query": query
        }
    return render_template_string(PAGE, vulnerable_result=result, secure_result=None)

@app.route("/secure", methods=["POST"])
def secure():
    username = request.form.get("username", "")
    password = request.form.get("password", "")
    query = "SELECT * FROM users WHERE username = ? AND password = ?"
    with connect() as conn:
        user = conn.execute(query, (username, password)).fetchone()
    if user:
        result = {
            "kind": "good",
            "title": "Login successful",
            "message": "Valid demo credentials accepted.",
            "query": query + "\\nValues are bound separately: (username, password)"
        }
    else:
        result = {
            "kind": "good",
            "title": "Blocked: Invalid username or password",
            "message": "The injection string was treated as ordinary input, so authentication was not bypassed.",
            "query": query + "\\nValues are bound separately: (username, password)"
        }
    return render_template_string(PAGE, vulnerable_result=None, secure_result=result)

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=False)
