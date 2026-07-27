# User Agent Read-only Tool Boundary Design

## Problem

The User Agent is designed to give training advice, read safe user data, and navigate to existing
portal views. Its current system prompt describes that boundary, but PageAgentCore still retains
default DOM click, input, and select tools. A prompt is not an enforcement mechanism: an unexpected
model tool call could still manipulate a page.

## Decision

Create the runtime tool set through an explicit unsafe-tool denylist: project-owned read tools and
`navigate_user_view` remain available, while default click, input, select, script, and horizontal
scroll tools are set to `null`. Safe built-in coordination/read capabilities (`wait`, `ask_user`,
`done`, and vertical `scroll`) remain available. Disable the interaction mask and remove the
visual-pointer feedback that only existed for the now-disabled mutation tools.

## Boundaries

- Preserve safe training-data reads, profile summary, and route navigation.
- Preserve conversation, model, API, contract, schema, and persistence behavior.
- Do not add a replacement authorization system in this iteration; page form edits remain user
  actions in the existing UI.
- Do not alter the Admin Agent or backend modules.

## Verification

- RED/GREEN tests assert the retained project tools and every disabled default mutation tool.
- Run focused runtime tests, User Portal lint, TypeScript, full Vitest, production build, Prettier,
  and `git diff --check`.
