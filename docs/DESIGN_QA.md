# UI review ledger

Reference concept: `docs/design-concept.png` (generated for this assignment). Latest browser captures: `docs/screenshots/*.png`, 1440×900. The live app was also inspected in the Codex in-app browser at 1440×900 and 390×844. The mobile page reported `scrollWidth === innerWidth`.

| Check | Concept evidence | Render evidence | Decision / fix |
|---|---|---|---|
| Workspace structure | Left library, large center reader, right research desk | `chat-verified.png` | Preserved the three-column structure. |
| Palette | Cool white, navy ink, cobalt actions, sage Verified state | `chat-verified.png`, `comparison.png` | Preserved the palette; reduced decorative chrome. |
| Type hierarchy | Serif document and editorial headings, quiet sans UI | `chat-verified.png` | Preserved the serif reader and stronger heading scale. |
| Quote treatment | Green verification marker, source name, jump action | `chat-verified.png`, `citation-highlight.png` | Verified card and exact in-reader mark work in the browser. |
| Comparison | Clear A/B wording and prominent high significance | `comparison.png` | High liability cap change ranks first; summary rewritten to state the tenfold increase plainly. |
| Responsive behavior | Desktop concept only | in-app browser at 390×844 | Stacked reader/chat, library drawer, no horizontal overflow; mobile empty-state spacing was reduced to keep upload visible. |

Intentional differences from the concept: no decorative sample files, account avatar, Share action, or global search box. They were concept artifacts without a supported workflow. The actual screen uses the user's uploaded documents. The comparison is a focused modal rather than the concept's compact bottom strip so longer clause text remains readable.

The first viewport, document reading area, evidence cards, comparison, and mobile layout were visually inspected. No clipped primary content or horizontal overflow remained in the checked states. A live-provider research answer still needs visual review once `LLM_API_KEY` is configured.
