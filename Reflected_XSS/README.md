
# Reflected XSS – Protected Application

## Assignment Details

| Field | Details |
|---|---|
| Subject | Cyber Security |
| Vulnerability | Cross-Site Scripting (XSS) |
| Variant | Reflected XSS |
| Application | Protected Version |
| Technology | Node.js, Express, HTML, CSS, JavaScript |
| Implemented Mitigation | HTML Output Encoding |

## Project Overview

This application demonstrates how HTML output encoding prevents
Reflected Cross-Site Scripting (XSS).

It is the protected version of a two-application demonstration.
The application provides a search portal where users can submit
queries and view the reflected search input.

Before inserting user input into the HTML response, the application
encodes special HTML characters. This prevents the browser from
interpreting injected HTML or JavaScript as executable content.

The application uses a simple frontend built with HTML, CSS and
JavaScript, along with a Node.js and Express backend.

No database is required because search input is reflected
immediately in the response.

## Features

- Simple search portal interface.
- GET-based search functionality.
- HTML output encoding on the server.
- Safe display of user-supplied input.
- Sample XSS test payload for demonstration.
- Separate protected application running on port 3002.

## Project Structure

```text
secure/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
└── README.md
```

## Requirements

- Node.js
- npm

## Installation and Execution

Open a terminal in this directory and run:

```bash
npm install
npm start
```

Open the following URL in your browser:

http://localhost:3002

## Testing the Protection

Enter the following test payload in the search box:

```html
<script>alert('Reflected XSS')</script>
```

Click **Submit Search**.

### Expected Result

The payload is displayed as ordinary text in the search results.

The JavaScript alert does not execute because the special HTML
characters are encoded before the response is sent to the browser.

## Implemented Mitigation: HTML Output Encoding

The application uses an `escapeHTML()` function in `server.js`.

The function converts special HTML characters into their
corresponding safe HTML entities.

For example:

| Character | Encoded Representation |
|---|---|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

The encoded value is then inserted into the HTML response
instead of the original user input.

This ensures that injected markup is displayed as text rather
than interpreted as executable HTML.

## Comparison with Vulnerable Application

| Feature | Vulnerable Application | Protected Application |
|---|---|---|
| User input reflection | Yes | Yes |
| HTML output encoding | No | Yes |
| Script execution | Possible | Prevented by output encoding |
| Search functionality | Yes | Yes |
| Port | 3001 | 3002 |

## Other XSS Mitigation Techniques

The following are additional techniques that can help prevent
Cross-Site Scripting attacks:

1. **Context-Aware Output Encoding:** Encodes user input
   according to the context in which it is inserted, such as
   HTML, JavaScript or URL contexts.

2. **Framework Auto-Escaping:** Frameworks such as React
   automatically escape values rendered as normal text.

3. **HTML Sanitization:** Removes unsafe HTML elements and
   attributes when applications intentionally allow rich HTML.

4. **Content Security Policy (CSP):** Restricts the sources
   from which scripts and other resources can be loaded.

5. **HttpOnly Cookies:** Prevent JavaScript from accessing
   cookies marked with the HttpOnly attribute.

6. **Safe DOM Sinks:** Prefer `textContent` and
   `createTextNode()` over unsafe DOM APIs such as `innerHTML`
   when displaying untrusted text.

## Evidence

The parent project's `evidence/` directory contains screenshots
demonstrating:

- The protected application interface.
- The test payload displayed as ordinary text.
- The protected HTML response containing encoded characters.
- The corresponding vulnerable application behavior.

## Academic Integrity

This application is developed for educational purposes as part
of a Cyber Security assignment.

It is intended to be tested locally on localhost.
