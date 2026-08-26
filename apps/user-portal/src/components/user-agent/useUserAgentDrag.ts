import {
  persistPageAgentPositionSafely,
  usePageAgentDrag,
  type PageAgentDragOptions,
  type PageAgentFloatPosition,
  type PageAgentPositionStorage,
} from '@interview-agent/page-agent-client';

export type UserAgentFloatPosition = PageAgentFloatPosition;

const POSITION_KEY = 'user-portal.page-agent.position';
const DEFAULT_POSITION: UserAgentFloatPosition = { right: 16, bottom: 92 };
const FLOAT_SIZE = 48;
const MOBILE_DOCK_MEDIA_QUERY = '(max-width: 820px)';

const DRAG_OPTIONS: PageAgentDragOptions = {
  storageKey: POSITION_KEY,
  defaultPosition: DEFAULT_POSITION,
  floatSize: FLOAT_SIZE,
  activation: 'click',
  dockMediaQuery: MOBILE_DOCK_MEDIA_QUERY,
};

export function useUserAgentDrag(onOpen: () => void) {
  return usePageAgentDrag(onOpen, DRAG_OPTIONS);
}

export function defaultUserAgentFloatPosition(): UserAgentFloatPosition {
  return { ...DEFAULT_POSITION };
}

export function persistUserAgentPositionSafely(
  position: UserAgentFloatPosition,
  getStorage: () => PageAgentPositionStorage = () => window.localStorage,
): boolean {
  return persistPageAgentPositionSafely(position, POSITION_KEY, getStorage);
}
