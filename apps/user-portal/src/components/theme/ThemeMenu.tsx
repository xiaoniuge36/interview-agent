'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { ThemeMode, ThemePreferences } from './theme-preferences';
import { useThemePreferences } from './ThemePreferencesProvider';

export const THEME_OPTIONS = [
  { value: 'aurora', label: '极光叙事', helper: '渐变巨字与星空轨道' },
  { value: 'terminal', label: '终端工业', helper: '命令语义与状态扫描' },
  { value: 'constructivist', label: '结构主义印刷', helper: '红黑米白与硬边构图' },
  { value: 'daylight', label: '白昼编辑部', helper: '高对比明亮阅读' },
  { value: 'glass', label: '雾光玻璃', helper: '通透材质与空间景深' },
  { value: 'playground', label: '彩色训练场', helper: '明亮模块与成长反馈' },
] satisfies Array<{ value: ThemeMode; label: string; helper: string }>;

export function ThemeMenu({ variant }: { variant: 'sidebar' | 'floating' | 'topbar' }) {
  const controls = useThemePreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  useThemeMenuDismissal(open, rootRef, closeMenu);

  const theme =
    THEME_OPTIONS.find((item) => item.value === controls.preferences.theme) ?? THEME_OPTIONS[0]!;
  return (
    <div className={`theme-menu theme-menu-${variant}`} ref={rootRef}>
      <ThemeMenuTrigger
        variant={variant}
        open={open}
        summary={theme.label}
        onToggle={() => setOpen((value) => !value)}
      />
      {open ? <ThemeMenuPopover {...controls} /> : null}
    </div>
  );
}

function useThemeMenuDismissal(
  open: boolean,
  rootRef: RefObject<HTMLDivElement>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function closeWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeWithKeyboard);
    return () => {
      window.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeWithKeyboard);
    };
  }, [onClose, open, rootRef]);
}

function ThemeMenuTrigger(props: {
  variant: 'sidebar' | 'floating' | 'topbar';
  open: boolean;
  summary: string;
  onToggle: () => void;
}) {
  return (
    <button
      className="theme-menu-trigger"
      type="button"
      aria-label="切换外观主题"
      aria-expanded={props.open}
      onClick={props.onToggle}
    >
      <PaletteIcon />
      {props.variant === 'sidebar' ? (
        <span>
          <strong>外观主题</strong>
          <small>{props.summary}</small>
        </span>
      ) : null}
    </button>
  );
}

type ThemeMenuPopoverProps = {
  preferences: ThemePreferences;
  setTheme: (theme: ThemeMode) => void;
  setMotion: (motion: boolean) => void;
};

export function ThemeMenuPopover(props: ThemeMenuPopoverProps) {
  return (
    <div className="theme-menu-popover" role="dialog" aria-label="外观主题">
      <header>
        <span>
          <strong>选择界面主题</strong>
          <small>六种完整视觉语言</small>
        </span>
        <small>保存在当前设备</small>
      </header>
      <ThemeModeList preferences={props.preferences} onSelect={props.setTheme} />
      <ThemeMotionRow preferences={props.preferences} onChange={props.setMotion} />
    </div>
  );
}

function ThemeModeList(props: {
  preferences: ThemePreferences;
  onSelect: (theme: ThemeMode) => void;
}) {
  return (
    <div className="theme-mode-list">
      {THEME_OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={props.preferences.theme === item.value}
          onClick={() => props.onSelect(item.value)}
        >
          <ThemePreview theme={item.value} />
          <span>
            <strong>{item.label}</strong>
            <small>{item.helper}</small>
          </span>
          <CheckIcon />
        </button>
      ))}
    </div>
  );
}

function ThemeMotionRow(props: {
  preferences: ThemePreferences;
  onChange: (motion: boolean) => void;
}) {
  return (
    <div className="theme-motion-row">
      <span>
        <strong>界面动态效果</strong>
        <small>控制页面进入、环境氛围与状态反馈</small>
      </span>
      <button
        type="button"
        aria-label="界面动态效果"
        aria-pressed={props.preferences.motion}
        onClick={() => props.onChange(!props.preferences.motion)}
      />
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.35-3l-.3-.35a1.5 1.5 0 0 1 1.13-2.48H17A4 4 0 0 0 21 11a8 8 0 0 0-9-8Z" />
      <path d="M7.5 10h.01M9.5 6.5h.01M14 6.2h.01M17.2 9h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="theme-option-check" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10 3 3 7-7" />
    </svg>
  );
}

function ThemePreview({ theme }: { theme: ThemeMode }) {
  return (
    <span className={`theme-preview theme-preview-${theme}`}>
      <i />
      <i />
    </span>
  );
}
