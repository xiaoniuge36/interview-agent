'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type {
  AccentColor,
  ThemeMode,
  ThemePreferences,
} from './theme-preferences';
import { useThemePreferences } from './ThemePreferencesProvider';

const THEMES: Array<{ value: ThemeMode; label: string; helper: string }> = [
  { value: 'dawn', label: '晨光', helper: '温暖、专注' },
  { value: 'ocean', label: '海盐', helper: '清爽、理性' },
  { value: 'night', label: '深夜', helper: '低亮度训练' },
];
const ACCENTS: Array<{ value: AccentColor; label: string }> = [
  { value: 'coral', label: '珊瑚' },
  { value: 'blue', label: '蓝色' },
  { value: 'teal', label: '薄荷' },
  { value: 'amber', label: '琥珀' },
];

export function ThemeMenu({ variant }: { variant: 'sidebar' | 'floating' }) {
  const controls = useThemePreferences();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  useThemeMenuDismissal(open, rootRef, closeMenu);

  const theme = THEMES.find((item) => item.value === controls.preferences.theme) ?? THEMES[0]!;
  const accent = ACCENTS.find((item) => item.value === controls.preferences.accent) ?? ACCENTS[0]!;
  return (
    <div className={`theme-menu theme-menu-${variant}`} ref={rootRef}>
      <ThemeMenuTrigger
        variant={variant}
        open={open}
        summary={`${theme.label} · ${accent.label}`}
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
  variant: 'sidebar' | 'floating';
  open: boolean;
  summary: string;
  onToggle: () => void;
}) {
  return (
    <button
      className="theme-menu-trigger"
      type="button"
      aria-label="切换外观主题和主题色"
      aria-expanded={props.open}
      onClick={props.onToggle}
    >
      <PaletteIcon />
      {props.variant === 'sidebar' ? (
        <span><strong>外观主题</strong><small>{props.summary}</small></span>
      ) : null}
    </button>
  );
}

type ThemeMenuPopoverProps = {
  preferences: ThemePreferences;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setMotion: (motion: boolean) => void;
};

function ThemeMenuPopover(props: ThemeMenuPopoverProps) {
  return (
    <div className="theme-menu-popover" role="dialog" aria-label="外观与主题色">
      <header><strong>外观与主题色</strong><small>保存在当前设备</small></header>
      <ThemeModeList preferences={props.preferences} onSelect={props.setTheme} />
      <ThemeAccentSection preferences={props.preferences} onSelect={props.setAccent} />
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
      {THEMES.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={props.preferences.theme === item.value}
          onClick={() => props.onSelect(item.value)}
        >
          <ThemePreview theme={item.value} />
          <span><strong>{item.label}</strong><small>{item.helper}</small></span>
          <CheckIcon />
        </button>
      ))}
    </div>
  );
}

function ThemeAccentSection(props: {
  preferences: ThemePreferences;
  onSelect: (accent: AccentColor) => void;
}) {
  return (
    <div className="theme-accent-section">
      <span>主题色</span>
      <div>
        {ACCENTS.map((item) => (
          <button
            key={item.value}
            className={`accent-${item.value}`}
            type="button"
            aria-label={item.label}
            aria-pressed={props.preferences.accent === item.value}
            onClick={() => props.onSelect(item.value)}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeMotionRow(props: {
  preferences: ThemePreferences;
  onChange: (motion: boolean) => void;
}) {
  return (
    <div className="theme-motion-row">
      <span><strong>界面微动效</strong><small>保留选题和 Agent 状态反馈</small></span>
      <button
        type="button"
        aria-label="界面微动效"
        aria-pressed={props.preferences.motion}
        onClick={() => props.onChange(!props.preferences.motion)}
      />
    </div>
  );
}

function PaletteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.35-3l-.3-.35a1.5 1.5 0 0 1 1.13-2.48H17A4 4 0 0 0 21 11a8 8 0 0 0-9-8Z" /><path d="M7.5 10h.01M9.5 6.5h.01M14 6.2h.01M17.2 9h.01" /></svg>;
}

function CheckIcon() {
  return <svg className="theme-option-check" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>;
}

function ThemePreview({ theme }: { theme: ThemeMode }) {
  return <span className={`theme-preview theme-preview-${theme}`}><i /><i /></span>;
}
