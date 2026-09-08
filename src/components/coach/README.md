# Bloom Coach Component

Premium, production-quality personal AI interface for the Bloom wellness platform.

## Component: CoachPage

The main Coach experience, redesigned to rival modern ChatGPT/Claude/Grok interfaces while remaining unmistakably Bloom.

### Sub-Components

| Component | Purpose |
|-----------|---------|
| `MessageCard` | Individual message with avatar, metadata, actions, blocks |
| `BlockView` | Structured content (metric, plan, proposal) |
| `LensButton` | Mode selector button (Ask/Reflect/Plan) |
| `ContextDrawer` | Personal context and memory panel |
| `CameraDialog` | Real-time photo capture |
| `AttachmentPreview` | File preview in composer |
| `EmptyConversation` | Welcome state with lens buttons and prompts |

### Key Features

- Three interaction lenses (Ask, Reflect, Plan)
- Multi-modal input (text, voice, camera, files)
- Typewriter animation on responses
- Context and Memory drawers
- Full keyboard accessibility
- Mobile-first responsive design
- Reduced-motion support

### Files

```
CoachPage.tsx (3500+ lines) — Main component
ProviderPicker.tsx — AI provider selection
```

### Related

- `useCoachSystem` hook — Backend integration (Supabase, AI)
- `useTypewriter` hook — Response animation
- `coach.css` — Comprehensive styling (2850 lines)
