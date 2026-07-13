---
name: Governance Console
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#414753'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#727784'
  outline-variant: '#c1c6d5'
  surface-tint: '#005cba'
  primary: '#004e9f'
  on-primary: '#ffffff'
  primary-container: '#0066cc'
  on-primary-container: '#dfe8ff'
  inverse-primary: '#aac7ff'
  secondary: '#5f5e60'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfe1'
  on-secondary-container: '#636264'
  tertiary: '#505050'
  on-tertiary: '#ffffff'
  tertiary-container: '#686868'
  on-tertiary-container: '#e9e8e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458e'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 260px
  drawer-width: 480px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is engineered for high-stakes oversight and clarity in AI governance. It adopts a **Minimalist** aesthetic where the UI chrome recedes, positioning the content as the protagonist. The emotional response is one of calm, authoritative control, designed for long-duration technical auditing.

The visual language is defined by:
- **Exceptional Whitespace:** Generous margins and internal padding to separate complex data streams.
- **Precision Typography:** High-contrast weights and monospaced details for technical traceability.
- **Functional Grayscale:** A monochromatic rhythm that uses light gray surfaces (#f5f5f7) and deep charcoal accents to create architectural depth without visual noise.
- **Focus on Utility:** No decorative gradients, glowing effects, or typical "AI" tropes. The interface is a tool for precision and accountability.

## Colors
This design system utilizes a strict Apple-inspired palette. The primary color, **Action Blue**, is reserved exclusively for interactive elements and critical focus states.

- **Canvas:** Use #f5f5f7 for the base background to provide a soft contrast against white surfaces.
- **Surfaces:** Use #ffffff for primary panels, cards, and content areas.
- **High-Contrast Accents:** Deep charcoal (#1d1d1f) is used for headers and primary text; a slightly lighter charcoal (#2a2a2c) is used for high-contrast dark sections like sidebars or utility drawers.
- **Typography:** Primary text is #1d1d1f. Secondary text and metadata use #7a7a7a for clear information hierarchy.
- **Semantic Colors:** Success, warning, and error states use muted, professional tones that align with the high-fidelity aesthetic.

## Typography
The typography system uses **Inter** (as a high-fidelity alternative to system-ui) for its legibility and neutral character. **JetBrains Mono** is introduced for technical data, including Trace IDs, Workflow IDs, and JSON schema results.

- **Hierarchy:** Headers should be powerful but never bulky. Use SemiBold (600) for headlines and Regular (400) for body text.
- **Reading Comfort:** Body text is set at 17px for long-form audit logs and 15px for interface labels to maintain high information density without sacrificing clarity.
- **Technical IDs:** All IDs, timestamps, and system logs must use the `code-sm` style for distinct visual categorization.
- **Labels:** Small caps or letter-spaced labels are used sparingly for category headers in sidebars or table headers.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy within defined architectural boundaries. 

- **Structure:** A persistent 260px left navigation bar anchors the application. A top-level search and workspace utility bar provides global context.
- **Canvas:** The primary content area uses a "Wide Canvas" layout. On desktop, this is capped at 1440px for readability, centered with 32px side margins.
- **Drawers:** Contextual details for interviews or governance logs appear in 480px right-side drawers, which slide over the canvas.
- **Responsive Behavior:** 
  - **Desktop:** 12-column grid, 24px gutters.
  - **Tablet:** 8-column grid, 16px gutters, left navigation collapses to an icon-only rail.
  - **Mobile:** 4-column grid, 16px margins, navigation moves to a bottom bar or hamburger menu.

## Elevation & Depth
Depth is established through **Tonal Layers** and thin borders rather than heavy shadows.

- **Base Layer:** #f5f5f7 (Canvas background).
- **Secondary Layer:** #ffffff (Surface/Cards) with a 1px solid border of #e5e5e7. No shadow is applied to base cards.
- **Overlay Layer:** Modals and Right-side Drawers use a very subtle, extra-diffused ambient shadow (`0 10px 30px rgba(0,0,0,0.04)`) to separate them from the canvas.
- **Interactive States:** Subtle 1px borders become slightly darker (#d1d1d6) on hover. Actionable buttons do not use depth, relying on the Action Blue fill to signify priority.

## Shapes
The shape language is **Soft** and precise.

- **Standard Elements:** Buttons, input fields, and small cards use a 0.25rem (4px) radius to maintain a professional, slightly sharp appearance.
- **Large Components:** Main content panels and larger containers use a 0.5rem (8px) radius.
- **Pills:** Status badges (e.g., "Active", "Completed") use a fully rounded (pill) shape to distinguish them from actionable buttons.

## Components
- **Buttons:** Primary buttons use #0066cc with white text. Secondary buttons are ghost-style with a #1d1d1f border or simple text links.
- **Status Badges:** Use a "dot + label" pattern. The dot carries the semantic color, while the background is a 10% opacity tint of that same color.
- **Input Fields:** 1px border (#d1d1d6) with a white fill. On focus, the border changes to Action Blue with no outer glow.
- **Persistent Left Nav:** Uses a dark charcoal (#1d1d1f) or white background with light gray hover states. Icons should be thin-line (2pt) to match the typography.
- **Filter Bars:** Located at the top of the canvas, using a segmented control or horizontal list of ghost buttons to refine data views.
- **Data Tables:** Borderless rows with 1px bottom dividers. Use `code-sm` for technical columns. Row hover state uses #f5f5f7.
- **Detail Drawers:** Should include a fixed header with a close action and a scrollable body for deep-dive metadata.