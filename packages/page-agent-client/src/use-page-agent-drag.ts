import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent,
} from 'react';

export type PageAgentFloatPosition = { right: number; bottom: number };
export type PageAgentPositionStorage = Pick<Storage, 'setItem'>;

export type PageAgentDragOptions = {
  storageKey: string;
  defaultPosition: PageAgentFloatPosition;
  /** 浮窗按钮的兜底尺寸（px），用于测量失败时的边界钳制。 */
  floatSize: number;
  /** click：点击触发打开（拖动后抑制点击）；pointer-up：抬起且未拖动时打开。 */
  activation: 'click' | 'pointer-up';
  /** 命中该媒体查询时禁用拖拽（移动端停靠布局）。 */
  dockMediaQuery?: string;
};

const EDGE_GAP = 16;
const DRAG_THRESHOLD = 6;

type DragState = {
  startX: number;
  startY: number;
  startRight: number;
  startBottom: number;
  width: number;
  height: number;
  moved: boolean;
  latestPosition: PageAgentFloatPosition;
  pointerId: number;
};

type DragContext = {
  options: PageAgentDragOptions;
  dragRef: MutableRefObject<DragState | null>;
  positionRef: MutableRefObject<PageAgentFloatPosition>;
  suppressPointerClickRef: MutableRefObject<boolean>;
  setPosition: (next: PageAgentFloatPosition) => void;
  onOpen: () => void;
};

type FloatButtonEvent = PointerEvent<HTMLButtonElement>;

export function usePageAgentDrag(onOpen: () => void, options: PageAgentDragOptions) {
  const [position, setPosition] = useState<PageAgentFloatPosition>(() => ({
    ...options.defaultPosition,
  }));
  const dragRef = useRef<DragState | null>(null);
  const positionRef = useRef<PageAgentFloatPosition>({ ...options.defaultPosition });
  const suppressPointerClickRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  useEffect(() => {
    const next = clampPosition(readPosition(optionsRef.current), optionsRef.current);
    positionRef.current = next;
    setPosition(next);
  }, []);
  useEffect(() => {
    const handleResize = () => {
      const next = clampPosition(positionRef.current, optionsRef.current);
      positionRef.current = next;
      setPosition(next);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const context: DragContext = {
    options,
    dragRef,
    positionRef,
    suppressPointerClickRef,
    setPosition,
    onOpen,
  };
  return {
    position,
    onClick: (event: MouseEvent<HTMLButtonElement>) => activateFromClick(event, context),
    onPointerDown: (event: FloatButtonEvent) => startDrag(event, context),
    onPointerMove: (event: FloatButtonEvent) => moveDrag(event, context),
    onPointerUp: (event: FloatButtonEvent) => finishDrag(event, context),
    onPointerCancel: (event: FloatButtonEvent) => cancelDrag(event, context),
  };
}

export function persistPageAgentPositionSafely(
  position: PageAgentFloatPosition,
  storageKey: string,
  getStorage: () => PageAgentPositionStorage = () => window.localStorage,
): boolean {
  try {
    getStorage().setItem(storageKey, JSON.stringify(position));
    return true;
  } catch {
    return false;
  }
}

function startDrag(event: FloatButtonEvent, context: DragContext) {
  const { dockMediaQuery } = context.options;
  if (dockMediaQuery && window.matchMedia(dockMediaQuery).matches) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  context.suppressPointerClickRef.current = false;
  const rect = event.currentTarget.getBoundingClientRect();
  const startPosition = clampPosition(
    { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom },
    context.options,
    { width: rect.width, height: rect.height },
  );
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  context.dragRef.current = {
    startX: event.clientX,
    startY: event.clientY,
    startRight: startPosition.right,
    startBottom: startPosition.bottom,
    width: rect.width || context.options.floatSize,
    height: rect.height || context.options.floatSize,
    moved: false,
    latestPosition: startPosition,
    pointerId: event.pointerId,
  };
}

function moveDrag(event: FloatButtonEvent, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  drag.moved = drag.moved || movedEnough(event, drag);
  if (!drag.moved) return;
  context.suppressPointerClickRef.current = true;
  const next = clampPosition(
    {
      right: drag.startRight - (event.clientX - drag.startX),
      bottom: drag.startBottom - (event.clientY - drag.startY),
    },
    context.options,
    drag,
  );
  drag.latestPosition = next;
  context.positionRef.current = next;
  context.setPosition(next);
}

function finishDrag(event: FloatButtonEvent, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  context.dragRef.current = null;
  releasePointerCapture(event);
  if (drag.moved) {
    persistPageAgentPositionSafely(drag.latestPosition, context.options.storageKey);
    return;
  }
  if (context.options.activation === 'pointer-up') context.onOpen();
}

function cancelDrag(event: FloatButtonEvent, context: DragContext) {
  const drag = context.dragRef.current;
  if (!drag || drag.pointerId !== event.pointerId) return;
  context.dragRef.current = null;
  releasePointerCapture(event);
  if (drag.moved) persistPageAgentPositionSafely(drag.latestPosition, context.options.storageKey);
  const next = clampPosition(drag.latestPosition, context.options, drag);
  context.positionRef.current = next;
  context.setPosition(next);
}

function activateFromClick(event: MouseEvent<HTMLButtonElement>, context: DragContext) {
  if (context.options.activation !== 'click') return;
  const suppressed = context.suppressPointerClickRef.current && event.detail > 0;
  context.suppressPointerClickRef.current = false;
  if (suppressed) {
    event.preventDefault();
    return;
  }
  context.onOpen();
}

function movedEnough(event: FloatButtonEvent, drag: DragState) {
  return (
    Math.abs(event.clientX - drag.startX) > DRAG_THRESHOLD ||
    Math.abs(event.clientY - drag.startY) > DRAG_THRESHOLD
  );
}

function readPosition(options: PageAgentDragOptions): PageAgentFloatPosition {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(options.storageKey) ?? 'null',
    ) as Partial<PageAgentFloatPosition> | null;
    if (typeof value?.right === 'number' && typeof value.bottom === 'number')
      return value as PageAgentFloatPosition;
  } catch {
    return { ...options.defaultPosition };
  }
  return { ...options.defaultPosition };
}

function clampPosition(
  position: PageAgentFloatPosition,
  options: PageAgentDragOptions,
  size?: { width: number; height: number },
): PageAgentFloatPosition {
  const width = size?.width || options.floatSize;
  const height = size?.height || options.floatSize;
  return {
    right: clamp(
      position.right,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP),
    ),
    bottom: clamp(
      position.bottom,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP),
    ),
  };
}

function releasePointerCapture(event: FloatButtonEvent) {
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
