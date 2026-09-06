# Support

Stylus is open-source software supplied without managed hosting or guaranteed
support. Please search the documentation and existing issues before opening a
new issue, and never include credentials, private data, or vulnerability details
in a public report.

## Supported and documented paths

- Repository setup using the documented Node.js, npm, and local Supabase flow
- The Vercel-compatible web application and Supabase architecture
- Core application features and current Marketing workflows
- The documented outbound Windows worker
- Reproducible bugs and documentation corrections on the latest `main`

## Best effort

- Alternative Node.js-compatible hosting
- Additional OpenAI-compatible model providers
- Worker development on non-Windows operating systems
- Older commits or forks that differ materially from `main`

## Not supported

- Bypassing PostgreSQL Row Level Security or tenant boundaries
- Exposing service-role, provider, Cron, pairing, or worker credentials to a
  browser or worker
- Unofficial Instagram, TikTok, YouTube, Pinterest, or Reddit scraping
- Exposing a local Ollama endpoint publicly without appropriate authentication
- Removing organization or AI-memory isolation from a deployment
- Arbitrary worker shell execution or platform-policy workarounds

Use normal GitHub issues for reproducible non-security bugs and focused feature
requests. Follow [.github/SECURITY.md](.github/SECURITY.md) for vulnerabilities.
