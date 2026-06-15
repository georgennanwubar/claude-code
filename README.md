# Claude Code Skills

A collection of globally installed Claude Code skills for design, writing, and decision-making workflows.

## Installation

Clone this repo into your `~/.claude` directory:

```bash
git clone git@github.com:georgennanwubar/claude-code.git ~/.claude
```

Or if `~/.claude` already exists, pull the latest skills:

```bash
cd ~/.claude && git pull
```

On **Windows (Claude Code Desktop)**, clone to `%USERPROFILE%\.claude`:

```powershell
git clone git@github.com:georgennanwubar/claude-code.git %USERPROFILE%\.claude
```

## Skills

### Design

---

#### `design`
**Comprehensive design skill** — brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), corporate identity programs (50 deliverables with mockups), HTML presentations (Chart.js), banner design (22 styles), icon design (15 styles, SVG), and social photos across all major platforms.

**Triggers:** `design logo`, `create CIP`, `generate mockups`, `build slides`, `design banner`, `generate icon`, `create social photos`

**Platforms:** Facebook, Twitter, LinkedIn, YouTube, Instagram, Pinterest, TikTok, Threads, Google Ads

---

#### `banner-design`
**Multi-format creative banner system** — generates multiple art direction options per request with AI-powered visuals. Covers social media covers, ad banners, website heroes, and print assets.

**Styles:** minimalist, gradient, bold typography, photo-based, illustrated, geometric, retro, glassmorphism, 3D, neon, duotone, editorial, collage

**Platforms:** Facebook, Twitter/X, LinkedIn, YouTube, Instagram, Google Display, website hero, print

---

#### `design-system`
**Token architecture & component specifications** — three-layer design token system (primitive → semantic → component), CSS variables, spacing and typography scales, component state specs, and strategic slide generation.

**Use for:** design tokens, systematic design, brand-compliant presentations, CSS variable systems

---

#### `ui-styling`
**Beautiful, accessible UI components** — shadcn/ui (Radix UI + Tailwind), Tailwind CSS utility-first styling, canvas-based visual designs, dark mode, responsive layouts, and accessible components (dialogs, dropdowns, forms, tables).

**Use for:** building interfaces, implementing design systems, component theming, responsive layouts

---

#### `ui-ux-pro-max`
**Full-stack UI/UX design intelligence** — 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 technology stacks.

**Stacks:** React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, HTML/CSS

**Projects:** website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app

---

### Brand

#### `brand`
**Brand identity & consistency** — brand voice definition, visual identity standards, messaging frameworks, asset management, consistency audits, and style guide development.

**Use for:** tone of voice, brand guidelines, marketing assets, brand audits, asset naming

---

### Presentations

#### `slides`
**Strategic HTML presentations** — Chart.js data visualization, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies.

**Use for:** pitch decks, marketing presentations, data-driven slides, strategic slide design

---

### Writing

#### `stop-slop`
**Eliminate AI writing patterns** — removes predictable AI tells from prose: filler phrases, formulaic structures, passive voice, and other patterns that mark text as AI-generated.

**Core rules:** cut filler, break formulas, use active voice with human subjects

*By [Hardik Pandya](https://hvpandya.com)*

---

### Decision Making

#### `llm-council`
**Multi-perspective decision analysis** — runs any question or decision through 5 independent AI advisors who analyze from different angles, peer-review each other anonymously, and synthesize a final verdict.

**Triggers:** `council this`, `run the council`, `war room this`, `pressure-test this`, `stress-test this`, `debate this`

*Adapted from Andrej Karpathy's LLM Council methodology.*

---

## Syncing

Skills are automatically pushed to GitHub at the end of each Claude Code session (via a `Stop` hook in `settings.json`) when changes are detected in the `skills/` directory.

To manually sync:

```bash
cd ~/.claude
git add skills/
git commit -m "Update skills"
git push
```

## Repository Structure

```
~/.claude/
├── skills/
│   ├── banner-design/     # Multi-format banner generation
│   ├── brand/             # Brand identity & consistency
│   ├── design/            # Unified design skill
│   ├── design-system/     # Token architecture & specs
│   ├── llm-council/       # Multi-advisor decision making
│   ├── slides/            # HTML presentation design
│   ├── stop-slop/         # AI writing pattern removal
│   ├── ui-styling/        # shadcn/ui + Tailwind UI skill
│   └── ui-ux-pro-max/     # Full UI/UX design intelligence
├── settings.json          # Claude Code global settings & hooks
├── .gitignore
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## License

MIT — see [LICENSE](LICENSE) for details.
