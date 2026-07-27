# User Agent Dynamic Conversation Context Design

## Problem

`useUserAgentRuntime` stores the latest conversation summary in a ref, but the ref is only read
when `createUserAgentRuntime` constructs its static system instruction. The live runtime therefore
does not see messages persisted after its creation, even though PageAgentCore calls
`getPageInstructions` before every reasoning step.

## Decision

Keep the runtime instance stable across normal conversation updates. Create its static system
instruction from the safety baseline only, and supply a `getPageInstructions` callback that reads a
latest-context getter on every step. The callback combines current URL, page scenario, and the
current bounded conversation summary.

## Boundaries

- Preserve the existing context length and message-role filtering in
  `formatUserAgentConversationContext`.
- Preserve runtime recreation for configuration, active-conversation, page-scenario, and user
  confirmation-handler changes.
- Do not change Agent APIs, contracts, persistence, schemas, dependencies, or backend behavior.
- Do not mutate PageAgentCore internal history or use unpublished APIs.

## Verification

- RED/GREEN tests prove one instruction callback reads a newly supplied conversation context without
  recreating it, while retaining safety and page instructions.
- Run focused tests, User Portal lint, TypeScript, full Vitest, production build, Prettier, and
  `git diff --check`.
