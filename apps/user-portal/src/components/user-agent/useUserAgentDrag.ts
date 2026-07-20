import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react';

export type UserAgentFloatPosition = { right: number; bottom: number };
const POSITION_KEY = 'user-portal.page-agent.position';
const DEFAULT_POSITION: UserAgentFloatPosition = { right: 24, bottom: 92 };
const EDGE_GAP = 16;
const FLOAT_SIZE = 58;
const DRAG_THRESHOLD = 6;

type DragState = {
  startX: number;
  startY: number;
  startRight: number;
  startBottom: number;
  width: number;
  height: number;
  moved: boolean;
  latestPosition: UserAgentFloatPosition;
  pointerId: number;
};
type DragContext = {
  dragRef: MutableRefObject<DragState | null>;
  positionRef: MutableRefObject<UserAgentFloatPosition>;
  setPosition: (next: UserAgentFloatPosition) => void;
  onOpen: () => void;
};

export function useUserAgentDrag(onOpen: () => void) {
  const [position, setPosition] = useState<UserAgentFloatPosition>(DEFAULT_POSITION);
  const dragRef = useRef<DragState | null>(null);
  const positionRef = useRef<UserAgentFloatPosition>(DEFAULT_POSITION);
  useEffect(() => {
    const next = clampPosition(readPosition());
    positionRef.current = next;
    setPosition(next);
  }, []);
  useEffect(() => {
    const handleResize = () => {
      const next = clampPosition(positionRef.current);
      positionRef.current = next;
      setPosition(next);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const context: DragContext = { dragRef, positionRef, setPosition, onOpen };
  return {
    position,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => startDrag(event, context),
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => moveDrag(event, context),
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finishDrag(event, context),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => cancelDrag(event, context),
  };
}

function startDrag(event: PointerEvent<HTMLButtonElement>, context: DragContext) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const startPosition = clampPosition(
    { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom },
    rect.width,
    rect.height,
  );
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  context.dragRef.current = {
    startX: event.clientX,
    startY: event.clientY,
    startRight: startPosition.right,
    startBottom: startPosition.bottom,
    width: rect.width || FLOAT_SIZE,
    height: rect.height || FLOAT_SIZE,
    moved: false,
    latestPosition: startPosition,
    pointerId: event.pointerId,
  };
}

function moveDrag(event: PointerEvent<HTMLButtonElement>, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  drag.moved = drag.moved || movedEnough(event, drag);
  if (!drag.moved) return;
  const next = clampPosition(
    {
      right: drag.startRight - (event.clientX - drag.startX),
      bottom: drag.startBottom - (event.clientY - drag.startY),
    },
    drag.width,
    drag.height,
  );
  drag.latestPosition = next;
  context.positionRef.current = next;
  context.setPosition(next);
}

function finishDrag(event: PointerEvent<HTMLButtonElement>, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  context.dragRef.current = null;
  releasePointerCapture(event);
  if (drag.moved) return persistPosition(drag.latestPosition);
  context.onOpen();
}

function cancelDrag(event: PointerEvent<HTMLButtonElement>, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  context.dragRef.current = null;
  releasePointerCapture(event);
  if (drag.moved) persistPosition(drag.latestPosition);
  const next = clampPosition(drag.latestPosition, drag.width, drag.height);
  context.positionRef.current = next;
  context.setPosition(next);
}

function movedEnough(event: PointerEvent<HTMLButtonElement>, drag: DragState) {
  return (
    Math.abs(event.clientX - drag.startX) > DRAG_THRESHOLD ||
    Math.abs(event.clientY - drag.startY) > DRAG_THRESHOLD
  );
}

function readPosition(): UserAgentFloatPosition {
  try {
    const value = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? 'null') as Partial<UserAgentFloatPosition> | null;
    if (typeof value?.right === 'number' && typeof value.bottom === 'number') return value as UserAgentFloatPosition;
  } catch {
    return DEFAULT_POSITION;
  }
  return DEFAULT_POSITION;
}

function persistPosition(position: UserAgentFloatPosition) {
  window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
}

function clampPosition(position: UserAgentFloatPosition, width = FLOAT_SIZE, height = FLOAT_SIZE) {
  return {
    right: clamp(position.right, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP)),
    bottom: clamp(position.bottom, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP)),
  };
}

function releasePointerCapture(event: PointerEvent<HTMLButtonElement>) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
