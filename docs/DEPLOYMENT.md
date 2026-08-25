# Stylus — Deployment Strategy

## Initial Constraint

Stylus should initially operate without a mandatory paid VPS.

---

# Initial Hosted Architecture

Use free-tier/serverless services where practical.

Conceptual deployment:

Team
-> hosted Stylus frontend/API
-> Supabase
-> queue/job infrastructure
-> lightweight hosted AI where available

Heavy jobs
-> optional Windows worker

---

# Developer Laptop

The developer laptop is not the production server.

It may provide optional heavy computation.

When offline:

- users can still log in
- tasks remain available
- whiteboards remain available
- company knowledge remains available
- stored marketing analysis remains available
- heavy queued work waits

---

# Windows Worker

Worker responsibilities may include:

- FFmpeg processing
- OpenCV processing
- transcription
- Ollama inference
- multimodal analysis

The worker connects outbound to hosted infrastructure.

Do not expose inbound Ollama ports.

---

# Future Migration

When funding/revenue permits:

Windows Worker
-> cloud GPU worker

Free/serverless components may later migrate to dedicated infrastructure
without changing core application contracts.

---

# Deployment Philosophy

Optimize initially for:

- zero/low fixed cost
- security
- recoverability
- portability
- simple operations

Do not optimize for hypothetical massive scale.