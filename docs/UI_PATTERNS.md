# Stylus — UI Patterns

## Application Shell

Desktop:

Sidebar
+
Topbar
+
Page Header
+
Main Content

The sidebar provides primary navigation.

The topbar provides global actions such as:

- search
- notifications
- account/team controls

---

# Page Header

Standard pages should use:

Title
Optional description
Primary action
Optional secondary actions

Avoid placing page titles inside decorative cards.

---

# Home

Home answers:

"What requires attention today?"

Sections may include:

- My Day
- Upcoming Deadlines
- Team Activity
- Marketing Attention
- Notifications
- Recent AI Results

Avoid turning Home into a dense analytics dashboard.

---

# Tasks

Header:
Tasks + Create Task

Views:

- My Tasks
- Team
- Today
- Upcoming
- Overdue
- Completed
- Archive
- Calendar

Task interaction may use a detail drawer/dialog rather than navigating
away for every edit.

---

# Whiteboards

Board list:

- board name
- preview
- owner
- updated time
- collaborators

Board editor:

- compact toolbar
- large canvas
- comments panel when required
- zoom controls

The canvas itself should receive most of the screen area.

---

# Company Knowledge

Use structured sections rather than one giant text editor.

Possible navigation:

- Company
- Product
- Audience
- Brand
- Positioning
- Marketing
- Research
- Decisions

---

# Marketing

Marketing has its own navigation within the plugin.

Initial screens:

- Overview
- Reel Ideas
- Creative Studio
- Competitors
- Research
- Campaigns
- Reasoning History

---

# Competitors

Support:

- competitor list
- competitor detail
- Instagram identity
- Reel history
- analysis summaries
- recurring creative patterns

Avoid presenting raw AI output as giant text blocks.

Prefer structured sections and evidence.

---

# Reel Creative Studio

A Reel should move through understandable stages:

Idea
-> Research
-> Creative Reasoning
-> Draft
-> Review
-> Approved

Display the production brief structurally.

Allow team comments.

---

# Empty States

Empty states should explain:

- what the feature does
- why the user might use it
- the next available action

Do not use excessive decorative artwork.

---

# Loading

Prefer:

- skeletons
- local progress indicators
- explicit job progress

For long AI/media jobs show actual stages where available.

---

# Errors

Errors must be actionable.

Bad:

"Something went wrong."

Better:

"Reel transcription failed because the worker could not find FFmpeg."

Where appropriate provide retry actions.