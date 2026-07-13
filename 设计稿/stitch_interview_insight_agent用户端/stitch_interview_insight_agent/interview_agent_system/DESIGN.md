---
name: Interview Agent System
colors:
  surface: '#faf8fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf8fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#414753'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
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
  tertiary: '#4e5052'
  on-tertiary: '#ffffff'
  tertiary-container: '#67686a'
  on-tertiary-container: '#e8e8ea'
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
  tertiary-fixed: '#e2e2e4'
  tertiary-fixed-dim: '#c6c6c8'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#454749'
  background: '#faf8fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  max-width: 1200px
---

## Brand & Style

The design system is built for a focused, high-stakes environment where calm and clarity are paramount. It adopts a **Minimalist / Corporate Modern** aesthetic inspired by precision hardware and editorial clarity. The goal is to strip away the "AI hype" (gradients, glows, and robot motifs) in favor of an **Agent Workspace**—a professional, structured environment that feels like a premium tool rather than a toy.

The emotional response should be one of confidence and focus. By utilizing heavy whitespace, a restricted color palette, and high-quality typography, the UI recedes to let the user's performance and the AI's feedback take center stage.

## Colors

The palette is strictly functional, utilizing a "system-first" approach to color application:

- **Action Blue (#0066CC):** Reserved exclusively for primary actions, links, and active states. It provides a singular point of focus against the neutral backdrop.
- **Grayscale Hierarchy:** 
    - `#1D1D1F` for primary headings and body text.
    - `#424245` for secondary information.
    - `#86868B` for tertiary labels and disabled states.
- **Surface Strategy:** Use `#FFFFFF` for the main content workspace. Transition to `#F5F5F7` for sidebars and secondary containers. Use the **Immersive Dark (#1D1D1F)** for focus modes, video recording overlays, or technical terminal-style feedback sections.

## Typography

This design system uses a dual-font approach to balance human warmth with technical precision. 

**Inter** serves as the primary typeface, mimicking the clean, neutral systematic feel of SF Pro. It is used for all narrative content, navigation, and headings. **JetBrains Mono** is utilized sparingly for technical metadata, timestamps, AI confidence scores, and code-related interview snippets to provide an "engineered" feel.

Tighten letter-spacing on larger display sizes to maintain the premium, high-density editorial look. Increase line-height for body text to ensure readability during long feedback reviews.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for content-heavy pages (like performance dashboards) and a **Safe Margin** approach for the Agent Workspace (the interview interaction).

- **Desktop:** 12-column grid with a 1200px max-width, centered in the viewport.
- **Rhythm:** Use a 4px/8px baseline shift. Most components should use 16px or 24px of internal padding to maintain a sense of "luxury through space."
- **Focus Mode:** During active interviews, the layout should collapse into a single, centered column (approx. 720px) to eliminate peripheral distraction.

## Elevation & Depth

To maintain a minimalist profile, this design system avoids heavy shadows. Depth is communicated via **Tonal Layering** and **Low-Contrast Outlines**:

- **Level 0 (Base):** `#F5F5F7` background.
- **Level 1 (Card/Surface):** `#FFFFFF` with a 1px solid border of `#E5E5E7`. No shadow.
- **Level 2 (Active/Floating):** Same as Level 1, but with a very soft, diffused shadow: `0 8px 24px rgba(0,0,0,0.04)`.
- **Immersive Layers:** Use backdrop blurs (20px) on navigation bars to allow the content to scroll underneath while maintaining structural presence.

## Shapes

The shape language is a mix of geometric discipline and organic approachability:

- **Standard Containers:** Use **8px** (rounded-md) for cards, input fields, and standard modules.
- **Action Elements:** Use **Pill/Capsule** (100px or full height) for buttons, search bars, and status chips. This creates a clear visual distinction between "content containers" and "interactive triggers."
- **Gallery Items:** Large feature cards or video previews should use **18px** (rounded-xl) to feel more like modern consumer hardware.

## Components

### Buttons
- **Primary:** Pill-shaped, `#0066CC` background, white text. No gradient. 
- **Secondary:** Pill-shaped, `#F5F5F7` background, `#0066CC` text.
- **Tertiary:** Text-only with a subtle chevron, strictly for "Learn More" actions.

### Input Fields & Search
- Inputs use an 8px radius with a subtle 1px gray border.
- Search bars are strictly capsule-shaped (pill) to differentiate from data entry fields.

### Chips & Tags
- Used for interview categories (e.g., "Behavioral", "System Design"). Use a small 12px mono font inside a light gray capsule.

### Agent Workspace Cards
- Cards should have no borders when placed on the `#FFFFFF` background; use `#F5F5F7` fill to define the area. 
- Use high-contrast headers within cards to denote "AI Insight" vs "User Transcript."

### Video/Recording Indicators
- Active states use a pulsing red dot next to a monospaced timer. The recording surface should be a rounded-xl container with a black background to simulate a professional lens.