# Bloom Coach — Design Snapshot

## Visual Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Bloom Coach          [Live indicator]  [Cmd K]      │
│                                                      │
│  A second mind                                       │
│  for your day.                                       │
│                                                      │
│  A place to ask, reflect, and decide...             │
├──────────┬───────────────────────────────────────────┤
│          │  💫 Bloom Coach        [thinking/ready]   │
│  ASK     │  ──────────────────────────────────────── │
│  Compass │                                           │
│          │  💫  Hello! How can I help...            │
│ REFLECT  │      [Copy] [👍] [👎] [⋯]                │
│  Brain   │                                           │
│          │  👤  I've been feeling low...            │
│  PLAN    │                                           │
│  Target  │                                           │
│          │                                           │
│ CONTEXT  │  ┌─────────────────────────────────────┐ │
│ MEMORY   │  │ 📎  Ask or type a message...  [📷]  │ │
│          │  │                       [🎤] [➤ Send] │ │
│          │  └─────────────────────────────────────┘ │
│          │  Private context · Enter to send         │
└──────────┴───────────────────────────────────────────┘
```

## Color System

| Role | Color |
|------|-------|
| Primary | Violet #c8a7ee |
| Ask Mode | Sky #9fd6ed |
| Plan Mode | Amber #e0b36b |
| Success | Sage #9bc7a4 |
| Error | Rose #e9b3c3 |

## Typography

| Role | Font |
|------|------|
| Display | Fraunces |
| Body | System |
| Mono | IBM Plex Mono |

## Interaction States

### Lens Button
- **Default:** Icon + label + description + chevron
- **Active:** Highlighted + current indicator
- **Hover:** Subtle background
- **Focus:** Visible ring

### Message Card
- **User:** Right-aligned, user avatar
- **Coach:** Left-aligned, Bloom avatar
- **Fresh:** Typewriter animation
- **Error:** Rose border + retry button

### Composer
- **Idle:** Neutral border
- **Draft:** Highlighted
- **Thinking:** Disabled + spinner
- **Recording:** Timer + stop/cancel

## Design Principles

1. **Editorial tone** — Conversational, not technical
2. **Intentional modes** — Ask/Reflect/Plan guide interaction
3. **Visible context** — Users see exactly what's tracked
4. **Privacy-first** — Control over saved context
5. **Respectful motion** — Reduced-motion aware
6. **Full accessibility** — ARIA, keyboard, contrast
