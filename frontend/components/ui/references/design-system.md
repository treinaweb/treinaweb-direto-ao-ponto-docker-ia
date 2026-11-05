## Overview

**TreinaDesk** is a helpdesk application: customers open support tickets, agents triage and answer them, and supervisors follow queues, SLAs, and team performance from a dashboard. The interface is a working tool, used for hours at a time. It has to be calm, dense enough to scan a queue at a glance, and readable in both light and dark themes.

The visual language follows a clean **admin-dashboard** style (see `Dashboard-reference-white.png` and `Dashboard-reference-dark-theme.png`; they are visual references only, not content). In light mode the app sits on **pure white** (`{colors.canvas}` — `#ffffff`). Content is grouped in flat, softly rounded panels filled with `{colors.cloud}` / `{colors.fog}`. A pale-blue tint (`{colors.primary-soft}`) highlights the KPI stat cards. There is one chromatic action color, **Electric Blue** (`{colors.primary}` — `#024ad8`), and one ink color (`{colors.ink}` — `#1a1a1a`); together they do ninety percent of the work. Type is a single family across every surface: **Inter**, set at weight 500 for headings and 400 for body: clean, neutral, and legible at UI-chrome scale.

The layout is a **three-column app shell**: a left navigation sidebar, a central workspace (top bar + page content), and a right context rail for notifications, recent activity, and online agents. Panels round at 16px and stay flat; there are no decorative graphics. Data visualization (ticket volume, channel, category, priority) carries the color.

The system has two theme modes that share the same tokens: a **light theme** (white canvas, gray panels, ink text) and a **dark theme** (`{colors.ink-soft}` canvas, `{colors.charcoal}` panels, `{colors.on-ink}` text). In dark mode the KPI stat cards keep their light `{colors.primary-soft}` fill, so the four headline numbers stay the brightest elements on screen.

**Key Characteristics:**
- Three-column app shell: sidebar navigation → workspace (top bar + content) → right context rail
- Pure white canvas (`{colors.canvas}`) with flat `{colors.cloud}` / `{colors.fog}` panels in light mode; `{colors.ink-soft}` canvas with `{colors.charcoal}` panels in dark mode
- Electric Blue (`{colors.primary}`) is the only CTA fill and link color; it appears at most twice per viewport
- Inter across every surface (display, body, button, caption) at weights 400 / 500 / 600 / 700
- Panels and stat cards round at `{rounded.xl}` (16px); buttons and inputs sit at `{rounded.md}` (4px)
- KPI stat cards use `{colors.primary-soft}` in both themes, so they are the first thing the eye lands on
- Depth comes from surface contrast (panel vs. canvas), not shadows; shadows are reserved for floating overlays

## Colors

> **No Interaction sub-section.** Hover colors are silently filtered. Allowed sub-sections: Brand & Accent, Surface, Text, Semantic.

### Brand & Accent
- **Electric Blue** (`{colors.primary}` — `#024ad8`): the system's only signal color. It is used for the primary CTA fill ("New ticket", "Reply", "Save"), link color, the focus ring, and the active-item indicator in the sidebar. Use it sparingly.
- **Bright Blue** (`{colors.primary-bright}` — `#296ef9`): a lighter variant for dark mode (CTAs, links, chart highlight series), where the deeper blue loses contrast.
- **Deep Navy** (`{colors.primary-deep}` — `#0e3191`): pressed state for the primary CTA and the visited-link color.
- **Soft Blue** (`{colors.primary-soft}` — `#c9e0fc`): pale-blue fill for KPI stat cards, the selected ticket row, and selection chips.

### Surface
- **Canvas** (`{colors.canvas}` — `#ffffff`): the light-theme page background behind the sidebar, workspace, and right rail.
- **Paper** (`{colors.paper}` — `#ffffff`): surfaces that must stay white on top of a panel: dropdowns, popovers, the ticket composer.
- **Cloud** (`{colors.cloud}` — `#f7f7f7`): the default panel fill for chart cards, ticket lists, and table containers. It also marks the active sidebar item.
- **Fog** (`{colors.fog}` — `#e8e8e8`): a slightly darker panel and hairline color, used for the search pill, column dividers between shell regions, and table header rows.
- **Steel** (`{colors.steel}` — `#c2c2c2`): stronger border for outlined inputs and the active filter; also the disabled-button fill.
- **Bloom Coral / Bloom Rose** (`{colors.bloom-coral}` / `{colors.bloom-rose}` — `#ff5050`, `#f9d4d2`): the **Urgent** priority chip and the SLA-breach tint behind an overdue ticket row.
- **Storm Mist / Sea / Deep** (`{colors.storm-mist}`, `{colors.storm-sea}`, `{colors.storm-deep}` — `#8ebdce`, `#7fadbe`, `#356373`): teal tones for chart series and the **In progress** status family.

### Text
- **Ink** (`{colors.ink}` — `#1a1a1a`): the universal text color on light surfaces (headings, body, labels, navigation). In dark mode it also serves as the deepest surface (sidebar and right rail background).
- **Ink Deep** (`{colors.ink-deep}` — `#000000`): pure black for the logo mark, chart axis strokes, and the darkest data series in light mode.
- **Ink Soft** (`{colors.ink-soft}` — `#292929`): the dark-theme canvas.
- **On Ink** (`{colors.on-ink}` — `#ffffff`): text and icons on every dark surface and on filled `{colors.primary}` buttons.
- **Charcoal** (`{colors.charcoal}` — `#3d3d3d`): muted body color on light surfaces (ticket previews, secondary descriptions). In dark mode it is the panel fill.
- **Graphite** (`{colors.graphite}` — `#636363`): small metadata such as timestamps ("59 minutes ago"), sidebar section labels ("Favorites", "Dashboards", "Pages"), chart axis labels, and breadcrumb ancestors.

### Semantic
- **Bloom Deep** (`{colors.bloom-deep}` — `#b3262b`) + **Bloom Wine** (`{colors.bloom-wine}` — `#5a1313`): error, destructive actions ("Delete ticket"), and SLA-breached labels.
- **Storm Deep** (`{colors.storm-deep}` — `#356373`): neutral status accent for **In progress** / **Waiting on customer** tickets.
- Ticket status and priority are always shown as text plus a color dot or chip, never by color alone.

### Theme Mapping

| Role | Light theme | Dark theme |
|---|---|---|
| Page canvas | `{colors.canvas}` | `{colors.ink-soft}` |
| Sidebar / right rail | `{colors.canvas}` | `{colors.ink-soft}` |
| Panel (chart card, list, table) | `{colors.cloud}` | `{colors.charcoal}` |
| KPI stat card | `{colors.primary-soft}` | `{colors.primary-soft}` (unchanged) |
| Active sidebar item | `{colors.cloud}` | `{colors.charcoal}` |
| Primary text | `{colors.ink}` | `{colors.on-ink}` |
| Muted text | `{colors.graphite}` | `{colors.steel}` |
| Hairline / divider | `{colors.fog}` | `{colors.charcoal}` |
| Primary CTA / link | `{colors.primary}` | `{colors.primary-bright}` |

## Typography

### Font Family

The type system uses **one family**: **Inter** (fallback `system-ui, Arial, sans-serif`) across every surface: display, body, button, caption. Inter is a neutral grotesque drawn for screens and stays legible at the small UI-chrome sizes a helpdesk lives on (table rows, timestamps, chips). Use weight 400 for body, 500 for headings and stat values, and 600/700 for emphasis and button labels. Enable tabular figures (`font-variant-numeric: tabular-nums`) on stat values, tables, and chart axes so numbers align.

The 16/14/12px caption tier carries ticket metadata (ticket IDs, requester, timestamps, SLA countdowns) at weight 400 with a 1.4–1.5 line-height. Button labels use weight 600/700 with positive 0.5–1.1px letter-spacing and an uppercase transform; buttons are the only place the system tracks letters.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | 72px | 500 | 1.0 | 0 | Login / onboarding hero headline |
| `{typography.display-xl}` | 56px | 500 | 1.0 | 0 | Empty-state and error-page headlines (404, "No tickets yet") |
| `{typography.display-lg}` | 44px | 500 | 1.0 | 0 | Report page titles |
| `{typography.display-md}` | 32px | 500 | 1.0 | 0 | Page titles inside the workspace |
| `{typography.display-sm}` | 24px | 500 | 1.17 | 0 | Ticket subject in the ticket detail view |
| `{typography.display-xs}` | 20px | 500 | 1.0 | 0 | Section headers ("Overview"), dialog titles |
| `{typography.body-lg}` | 18px | 400 | 1.33 | 0 | Lead paragraphs, knowledge-base article body |
| `{typography.body-md}` | 16px | 400 | 1.38 | 0 | Default body, ticket messages |
| `{typography.body-emphasis}` | 16px | 500 | 1.38 | 0 | Panel titles ("Tickets by Channel"), requester name |
| `{typography.caption-md}` | 14px | 400 | 1.5 | 0 | Sidebar links, table cells, metadata, chart legends |
| `{typography.caption-bold}` | 14px | 700 | 1.3 | 0 | Status / priority chips, unread counters |
| `{typography.caption-sm}` | 12px | 400 | 1.33 | 0 | Timestamps, axis labels, trend percentages |
| `{typography.link-md}` | 16px | 500 | 1.38 | 0 | Inline link emphasis |
| `{typography.button-md}` | 14px | 600 | 1.4 | 0.7px | Primary/secondary button labels (uppercase) |
| `{typography.button-sm}` | 12.6px | 700 | 1.0 | 0.126px | Compact button labels in table rows and toolbars |
| `{typography.stat-value}` | 24px | 500 | 1.17 | 0 | KPI numbers on stat cards ("128", "4h 12m") |

### Principles

The system uses **weight 500 for every heading size**, including the largest login headline. It does not jump to 600/700 at large sizes. The result feels open and calm instead of shouty, which suits a tool agents keep open all day.

There is no italic in the system except inside quoted customer messages; emphasis comes from weight (500 → body-emphasis, 700 → caption-bold).

### Font Fallbacks

- **Inter** is the primary family, at weights 400 / 500 / 600 / 700
- **Manrope** at weights 400 / 500 / 600 / 700 has similar proportions and gentler curves; use it directly with no metric adjustment
- **Roboto** at weights 400 / 500 / 700 has a flatter character; use it only as a last-resort fallback

Set body line-height to 1.4 and display line-height to 1.0 explicitly.

## Layout

### Spacing System

- **Base unit**: 8px, with a 4px half-step. Most panel padding lands at 16px or 24px; the gap between dashboard rows is 32px.
- **Tokens (front matter)**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 80px
- **Panel internal padding**: `{spacing.xl}` (24px) for stat cards and chart panels; `{spacing.md}` (16px) for sidebar groups, right-rail items, and compact list rows.
- **Gutter**: `{spacing.xxl}` (32px) between dashboard cards on desktop; `{spacing.md}` (16px) on tablet/mobile.
- **Workspace padding**: `{spacing.xxl}` (32px) around the page content; `{spacing.section}` (80px) is reserved for vertical breathing room on login and empty-state screens.

### App Shell & Grid

- **Sidebar** (left, ~212px): logo + workspace name, a "Favorites / Recently" switcher, then grouped navigation (Dashboards: Overview, Tickets, Queues; Pages: Customers, Agents, Knowledge Base, Reports, Settings). Groups expand with a chevron, and child links indent under their parent.
- **Top bar** (in the workspace, 68px): sidebar toggle + favorite star + breadcrumb ("Dashboards / Overview") on the left; ⌘K search pill, theme toggle, history, notifications bell, and right-rail toggle on the right. A 1px `{colors.fog}` bottom border separates it from the content.
- **Workspace content**: a section header row ("Overview" + period dropdown "Today"), then a 4-column KPI stat-card row, then a 12-column grid of chart and list panels (for example, a 2/3-width tickets-over-time chart next to a 1/3-width "Tickets by Channel" panel, then two half-width panels).
- **Right rail** (~280px): stacked sections for Notifications, Activities (vertical timeline), and Agents online (avatar list).
- 1px `{colors.fog}` vertical dividers separate the three shell regions.

### Whitespace Philosophy

Whitespace is **workspace-clean**: generous around panels so the dashboard reads as distinct blocks, tight inside lists and tables so agents can scan many tickets without scrolling. Chart panels leave at least 24px between the title row and the plot area. Metadata rows (timestamps, requester, ticket ID) use a 1.3 line-height and 12px type to stay compact.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No border, no shadow. | Canvas, panels, stat cards, sidebar, right rail |
| 1 — Hairline | 1px solid `{colors.hairline}` (`#e8e8e8`) border, no shadow. | Shell dividers, table rows, outlined inputs and buttons |
| 2 — Soft Lift | `0 2px 8px rgba(26, 26, 26, 0.08)`. | Dropdown menus, popovers, the drag preview of a ticket card |
| 3 — Floating Modal | `0 8px 24px rgba(26, 26, 26, 0.12)`. | Dialogs, the ⌘K command palette, the mobile navigation drawer |

The system is **mostly flat**. Depth comes from **surface contrast**: a `{colors.cloud}` panel on a `{colors.canvas}` page in light mode, or a `{colors.charcoal}` panel on a `{colors.ink-soft}` page in dark mode. Shadows are kept for elements that float above the layout.

### Data Visualization

Charts are the system's main source of color:
- **Line charts** (tickets over time): solid `{colors.ink}` line for the current period (`{colors.on-ink}` in dark mode) and a dashed `{colors.primary-bright}` line for the comparison period, with a subtle gradient fill under the main series.
- **Bar charts** (tickets by category / channel): rounded-top bars (`{rounded.lg}`), one color per category drawn from the blue, storm, and mint/violet chart palette, and `{colors.graphite}` axis labels.
- **Donut charts** (tickets by priority / status): a thick ring with a legend to the right listing the label, a color dot, and the percentage in tabular figures.
- **Mini bar meters** (inline in a list, as in "Tickets by Channel"): short segmented bars that show relative volume next to each label.
- Gridlines are omitted or drawn as `{colors.fog}` hairlines; axis labels use `{typography.caption-sm}`.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Shell dividers, full-width table rows |
| `{rounded.xs}` | 2px | Inline code, keyboard hints (⌘K) |
| `{rounded.sm}` | 3px | Small icon buttons in table toolbars |
| `{rounded.md}` | 4px | Primary and secondary buttons, text inputs |
| `{rounded.lg}` | 8px | Sidebar active item, status chips, dropdown menus, chart bars |
| `{rounded.xl}` | 16px | Stat cards, chart panels, list panels, dialogs |
| `{rounded.pill}` | 9999px | Search pill, filter chips, avatars, notification badges |

The system follows a two-tier rule: **buttons and inputs stay sharp** (4px, almost rectangular) while **panels and cards stay soft** (16px). This contrast is the visual signature: sharp interactive elements against softer containers.

### Avatars & Icons

User and agent avatars are circular (`{rounded.pill}`), 24px in lists and the right rail and 32px in the ticket detail header. Notification icons sit inside 24px `{rounded.lg}` tiles tinted with `{colors.primary-soft}`. UI icons are 20px outline (1.5px stroke) in `{colors.ink}` (`{colors.on-ink}` in dark mode).

## Components

> **No hover states documented.** Every component spec below documents only Default and Active/Pressed states. Variants live as separate front-matter entries.

### Buttons

**`button-primary`**: the Electric Blue CTA
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}` (uppercase, 0.7px tracking), padding `{spacing.sm} {spacing.xl}` (12 × 24), height 44px, rounded `{rounded.md}`
- Pressed state `button-primary-pressed`: background `{colors.primary-deep}`, same text
- Disabled state `button-primary-disabled`: background `{colors.steel}`, white text
- Used for: "New ticket", "Send reply", "Save", primary form submit

**`button-ink`**: black filled CTA
- Background `{colors.ink}`, text `{colors.on-primary}`, padding `{spacing.sm} {spacing.xl}`, height 44px, rounded `{rounded.md}`, type `{typography.button-md}`
- Used for: secondary main actions next to a blue primary ("Assign to me", "Close ticket")

**`button-outline`**: blue-text outlined CTA
- Background `{colors.canvas}`, text `{colors.primary}`, 1px `{colors.primary}` border, padding `{spacing.sm} {spacing.xl}`, height 44px, rounded `{rounded.md}`
- Used for: "Add note", "Merge", "Export": secondary actions on light surfaces

**`button-outline-ink`**: black-text outlined CTA
- Background `{colors.canvas}`, text `{colors.ink}`, 1px `{colors.ink}` border, padding `{spacing.sm} {spacing.xl}`, height 44px, rounded `{rounded.md}`
- Used for: "Cancel", "Filters", neutral toolbar actions

**`button-icon`**: top-bar icon button
- Transparent background, 20px icon in `{colors.ink}`, 32×32 hit box, rounded `{rounded.lg}`
- Used for: sidebar toggle, favorite, theme toggle, history, notifications, right-rail toggle

**`button-text-link`**: inline blue link
- Text `{colors.primary}`, type `{typography.link-md}`, padding `{spacing.xxs} 0`
- Used for: "View ticket", "See all activity"

### Cards & Panels

**`card-stat`**: the KPI tile in the top row of the dashboard
- Background `{colors.primary-soft}` (both themes), text `{colors.ink}`, rounded `{rounded.xl}`, padding `{spacing.xl}`
- Layout: label in `{typography.caption-md}` ("Open tickets") → value in `{typography.stat-value}` + trend percentage in `{typography.caption-sm}` with a small up/down arrow icon
- Standard set: Open tickets · Pending · Resolved today · Avg. first response

**`panel-chart`**: chart container
- Background `{colors.cloud}` (`{colors.charcoal}` in dark mode), rounded `{rounded.xl}`, padding `{spacing.xl}`, flat
- Header row: title in `{typography.body-emphasis}`; optional tab switcher in `{typography.caption-md}` (active tab in `{colors.ink}`, inactive tabs in `{colors.graphite}`, e.g. "Total tickets · By agent · SLA status") and a legend ("● This week ● Last week")

**`panel-list`**: list container (tickets, channels, agents)
- Same surface as `panel-chart`; rows separated by `{spacing.md}` spacing or `{colors.fog}` hairlines
- Used for: "Tickets by Channel" (Email, Chat, Phone, WhatsApp, Portal) with mini bar meters, "Latest tickets"

**`ticket-row`**: a single ticket in a queue table
- Columns: ticket ID (`{typography.caption-md}`, `{colors.graphite}`), subject (`{typography.body-emphasis}`), requester avatar + name, `chip-status`, `chip-priority`, assignee, updated-at (`{typography.caption-sm}`)
- Selected row: `{colors.primary-soft}` background; SLA-breached row: `{colors.bloom-rose}` tint

### Inputs & Forms

**`text-input`** + **`text-input-focused`**
- Background `{colors.canvas}`, text `{colors.ink}`, rounded `{rounded.md}`, padding `{spacing.sm} {spacing.md}`, height 44px
- 1px `{colors.steel}` border by default; on focus it changes to a 1px `{colors.primary}` border (no halo)

**`text-input-search`**: ⌘K search pill in the top bar
- Background `{colors.fog}` at low opacity (`{colors.charcoal}` in dark mode), rounded `{rounded.pill}`, height 32px, padding `0 {spacing.sm}`, magnifier icon on the left, "⌘K" hint on the right in `{typography.caption-sm}`
- Opens the command palette (Floating Modal) to search tickets, customers, and articles

**`select-period`**: compact dropdown ("Today ▾")
- Text `{typography.caption-md}`, chevron-down icon, no border; opens a Soft Lift menu

**`chip-status`**: ticket status
- Rounded `{rounded.lg}`, padding 2px 8px, type `{typography.caption-bold}`, color dot + label
- Open → `{colors.primary-soft}` / `{colors.primary}` · In progress → `{colors.storm-mist}` / `{colors.storm-deep}` · Resolved → `{colors.cloud}` / `{colors.charcoal}` · Closed → `{colors.fog}` / `{colors.graphite}`

**`chip-priority`**: ticket priority
- Same shape as `chip-status`
- Urgent → `{colors.bloom-coral}` / `{colors.on-primary}` · High → `{colors.bloom-rose}` / `{colors.bloom-deep}` · Medium → `{colors.primary-soft}` / `{colors.primary-deep}` · Low → `{colors.cloud}` / `{colors.graphite}`

**`badge-counter`**: unread / queue count
- Background `{colors.primary}`, text `{colors.on-primary}`, rounded `{rounded.pill}`, min-width 18px, type `{typography.caption-bold}` at 12px
- Used on the notifications bell and next to sidebar queue links

### Navigation

**`sidebar`**
- Background `{colors.canvas}` (`{colors.ink-soft}` in dark mode), width ~212px, padding `{spacing.md}`, 1px `{colors.fog}` right divider
- Top: logo avatar + "TreinaDesk" in `{typography.caption-md}` weight 500
- Section labels ("Favorites", "Dashboards", "Pages") in `{typography.caption-md}`, `{colors.graphite}`

**`sidebar-item`** + **`sidebar-item-active`**
- Default: 20px icon + label in `{typography.caption-md}`, padding `{spacing.xs} {spacing.sm}`, rounded `{rounded.lg}`, optional expand chevron on the left
- Active: background `{colors.cloud}` (`{colors.charcoal}` in dark mode) with a 4px `{colors.primary}` indicator bar on the left edge
- Child items indent 28px under their parent and have no icon

**`breadcrumb`**
- `{typography.caption-md}`; ancestors in `{colors.graphite}`, current page in `{colors.ink}`, "/" separators in `{colors.steel}`

**`tab-switcher`** + **`tab-switcher-active`**
- Text-only tabs inside panel headers; default `{colors.graphite}`, active `{colors.ink}` weight 500; a vertical `{colors.fog}` hairline separates tabs from the legend

### Right Rail

**`notification-item`**
- 24px icon tile (`{colors.primary-soft}`, `{rounded.lg}`) + title in `{typography.caption-md}` ("New ticket #1042 assigned to you") + timestamp in `{typography.caption-sm}`, `{colors.graphite}`

**`activity-timeline`**
- 24px avatar + action text + timestamp; a 1px `{colors.fog}` vertical line connects consecutive avatars
- Example events: "Replied to ticket #1038", "Changed priority to High", "Closed ticket #1021"

**`agent-list-item`**
- 24px avatar with an online/away status dot + agent name in `{typography.caption-md}`

## Do's and Don'ts

### Do
- Keep `{colors.primary}` for the primary CTA, links, focus ring, and the active sidebar indicator, with at most two uses per viewport
- Set every heading in Inter at weight 500 with line-height 1.0, even at large sizes
- Use `{rounded.xl}` (16px) for panels and stat cards and `{rounded.md}` (4px) for buttons and inputs; keep the two-tier contrast
- Separate panels from the canvas with surface color (`{colors.cloud}` on white, `{colors.charcoal}` on `{colors.ink-soft}`), not shadows
- Keep `card-stat` on `{colors.primary-soft}` in both themes, so the KPI row is always the brightest element
- Pair every status/priority color with a text label
- Use tabular figures for every number (stat values, tables, chart axes)
- Design every screen for both themes using the Theme Mapping table

### Don't
- Don't introduce saturated colors outside the `{colors.primary}` family, the `bloom` (urgent/error), and `storm` (in progress) families, and the chart palette
- Don't put shadows on panels or stat cards; shadows are only for floating overlays
- Don't round buttons above `{rounded.md}` (4px)
- Don't set text below 12px
- Don't use color alone to show ticket status, priority, or SLA state
- Don't drop ink text opacity to create hierarchy; switch to `{colors.charcoal}` / `{colors.graphite}` instead
- Don't fill section backgrounds with `{colors.primary}`

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | Single column; sidebar and right rail become drawers; stat cards stack 1-up; workspace padding drops to 16px |
| Mobile-Large | 480–767px | Stat cards 2×2; chart panels stack vertically |
| Tablet | 768–1023px | Sidebar collapses to an icon-only rail; right rail hidden (opened from the top bar toggle); stat cards 2×2 |
| Desktop | 1024–1279px | Full sidebar; right rail opens as an overlay; stat cards 4-up |
| Desktop-Large | ≥ 1280px | Full three-column shell with sidebar and right rail both docked |

### Touch Targets

Every interactive element is at least 44×44px on touch screens. `button-primary` at 44px height + 24px horizontal padding meets the WCAG-AAA target size. Top-bar icon buttons keep a 20px glyph inside an invisible 44×44 hit box on touch. Sidebar items grow to 44px row height on touch.

### Collapsing Strategy

- **Sidebar**: full → icon-only rail (tablet) → off-canvas drawer behind a hamburger (mobile)
- **Right rail**: docked (≥1280px) → overlay sheet (1024–1279px) → hidden behind the top-bar toggle (below 1024px)
- **Top bar**: breadcrumb truncates to the current page on mobile; the search pill collapses to a magnifier icon
- **Stat cards**: 4 → 2×2 → 1 column; they keep `{rounded.xl}` corners at every size
- **Chart panels**: side-by-side → stacked full width; charts keep their aspect ratio and the legend moves below the plot
- **Ticket tables**: become stacked ticket cards on mobile (subject, status/priority chips, requester, updated-at)

## Iteration Guide

1. Focus on ONE component at a time; don't refactor a whole screen in one pass
2. Reference component names and tokens directly (`{colors.primary}`, `{typography.stat-value}`, `{rounded.xl}`, `card-stat`); don't paraphrase them as hex/px in prose
3. Run `npx @google/design.md lint DESIGN.md` after edits; `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically
4. Add new variants as separate component entries (`-pressed`, `-disabled`, `-focused`, `-active`); don't describe states only in prose
5. Default body text to `{typography.body-md}` and table/list text to `{typography.caption-md}`; keep display sizes for real heading roles
6. Keep `{colors.primary}` scarce, with at most two uses per viewport (e.g. one CTA + the active sidebar indicator)
7. Choose surfaces only from the Theme Mapping table: `{colors.canvas}` / `{colors.cloud}` / `{colors.fog}` / `{colors.primary-soft}` in light mode and `{colors.ink-soft}` / `{colors.charcoal}` / `{colors.ink}` in dark mode
