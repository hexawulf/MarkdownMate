# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.5.x   | :white_check_mark: |
| < 3.5   | :x:                |

## Reporting a Vulnerability

Please do **not** open public GitHub issues for security vulnerabilities (such as Markdown/HTML sanitization bypasses, XSS, CSP regressions, or server header issues).

Instead, report vulnerabilities privately via GitHub Security Advisories (**Security → Advisories → Report a vulnerability**) or email `zk@hexawulf.dev` with:

- A description of the vulnerability and its impact
- Reproduction steps, sample Markdown payload, or proof of concept
- Affected MarkdownMate version and browser/Node.js version

You can expect an initial acknowledgement within 72 hours.

## Security Architecture

- **Local-first storage:** Documents live exclusively in browser IndexedDB (`markdownmate-db`); no document data is sent to the server.
- **Sanitized preview:** Markdown rendering runs through `rehype-sanitize` before injecting HTML into the preview pane.
- **Strict HTTP headers:** Production responses are served through `helmet` with a Content Security Policy verified against the production build by Playwright E2E tests in CI.
