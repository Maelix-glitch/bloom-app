## What and why
<!-- one paragraph -->

## Screenshots
| Before | After |
|---|---|
| desktop | desktop |
| mobile  | mobile  |

## Design system
- [ ] Uses tokens only (no raw colors/px/z-index)
- [ ] Reuses existing components (or adds a new one to /components with README)
- [ ] One primary action per region; gold budget respected
- [ ] Wayfinding labels consistent (pill = eyebrow = heading)

## States
- [ ] Loading  - [ ] Empty  - [ ] Error  - [ ] Success  - [ ] Disabled  - [ ] Overflow (long text)

## Accessibility
- [ ] Keyboard operable, focus visible
- [ ] Labels, roles, aria-live where needed
- [ ] Contrast checked for new color pairs
- [ ] 44px touch targets; no hover-only actions
- [ ] Reduced motion respected
- [ ] Tested at 200% zoom and 320px

## Data trust
- [ ] Dates/money/numbers go through formatters
- [ ] Counts and claims are computed, not hard-coded
- [ ] No test data visible

## Layering & performance
- [ ] Dialogs use <dialog>; no new z-index > 50
- [ ] No layout shift; images sized; lists paginated

## Copy
- [ ] Says it once; sentence case; verbs on buttons; errors are actionable
