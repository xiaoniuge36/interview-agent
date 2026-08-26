import {
  usePageAgentDrag,
  type PageAgentDragOptions,
  type PageAgentFloatPosition,
} from '@interview-agent/page-agent-client';

export type FloatPosition = PageAgentFloatPosition;

const DRAG_OPTIONS: PageAgentDragOptions = {
  storageKey: 'admin-console.page-agent.position',
  defaultPosition: { right: 24, bottom: 24 },
  floatSize: 52,
  activation: 'pointer-up',
};

export function useAdminAgentDrag(onOpen: () => void) {
  return usePageAgentDrag(onOpen, DRAG_OPTIONS);
}
