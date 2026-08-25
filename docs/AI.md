# Stylus — AI Architecture

## Principle

AI is a platform capability used by Stylus modules and plugins.

No business module directly integrates with a model vendor.

---

# ModelGateway

All AI inference goes through ModelGateway.

Logical capabilities:

- fast
- general
- reasoning
- vision
- embedding
- transcription

Providers may include:

- Ollama
- hosted open-model providers
- optional API fallback providers

Provider selection is configuration.

---

# Agents

Agents are logical roles consisting of:

- identity
- instructions
- tools
- memory permissions
- model profile
- input schema
- output schema

Agents are not separate permanently-running model processes.

---

# Workflows

Prefer bounded workflows.

Example Marketing workflow:

Evidence
-> Audience Research
-> Competitor Research
-> Concepts
-> Hook
-> Script
-> Retention
-> Visual Direction
-> Brand Review
-> Critic
-> limited revision
-> Judge
-> Reel Brief

---

# Memory

Retrieval must specify organization and domain.

No global unrestricted vector search.

Marketing:

company + marketing

Agency:

agency

---

# Reasoning Transparency

Stylus should expose useful application-level reasoning artifacts such as:

- evidence used
- proposals
- critiques
- scores
- explicit rationale
- final decision

Do not design the application around exposing private model
chain-of-thought.

---

# Cost Strategy

Use the cheapest suitable computation.

Tier 0:
No model.

Examples:
- SQL
- filtering
- deduplication
- FFmpeg
- OpenCV
- statistics

Tier 1:
Small model.

Examples:
- classification
- tagging

Tier 2:
General model.

Examples:
- summaries
- content ideation

Tier 3:
Reasoning/vision.

Examples:
- creative analysis
- script critique
- visual reasoning

Tier 4:
Optional powerful fallback.

Examples:
- difficult final judgment

---

# Local Hardware

Current development machine:

- Windows
- 8 GB system RAM
- GTX 1650
- ample disk space

Design local inference conservatively.

Prefer small quantized models and sequential inference.

Do not require large models for basic application functionality.

---

# Testing

AI-dependent application logic must support fake/mock providers.

Automated tests should not require real paid AI calls.