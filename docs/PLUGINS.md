# Stylus — Plugin Architecture

## Goal

Stylus must allow new business capabilities to be integrated without
modifying unrelated Core systems.

---

# Plugin Responsibilities

Plugins may contribute:

- routes
- UI navigation
- pages
- permissions
- capabilities
- AI tools
- agents
- workflows
- event handlers
- database migrations where supported

---

# Plugin Manifest

Conceptual example:

id: marketing
name: Marketing
version: 0.1.0

permissions:
  - company.read
  - marketing.read
  - marketing.write

memory_domains:
  - company
  - marketing

capabilities:
  - reels.analyze
  - reels.plan
  - campaigns.create

---

# Boundaries

Core does not depend on Marketing.

Marketing depends on public Core interfaces.

Plugins must not directly import private internals from other plugins.

Cross-plugin communication occurs through:

- capabilities
- public APIs
- events

---

# Memory

Plugins declare permitted memory domains.

The runtime must enforce them.

---

# Web Agency

The future Web Agency plugin is an integration adapter to a separate
system.

It should not require merging the Web Agency source tree or database into
Stylus.

Potential capabilities:

- agency.leads.list
- agency.audit.start
- agency.redesign.start
- agency.pipeline.read
- agency.revenue.read

Agency memory remains isolated.