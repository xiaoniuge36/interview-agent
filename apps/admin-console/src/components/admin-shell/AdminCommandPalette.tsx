'use client';

import { SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Modal, Typography } from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import type { AdminNavigationItem, AdminView } from '@/components/admin-navigation';
import { useAdminWorkspace } from '@/components/admin-workspace-context';
import {
  buildCommandSections,
  flattenCommandSections,
  moveCommandSelection,
  type CommandSection,
} from './admin-command-model';

const COMMAND_LIST_ID = 'admin-command-list';
const COMMAND_OPTION_PREFIX = 'admin-command-option';

type AdminCommandPaletteProps = {
  onViewChange: (view: AdminView) => void;
  role: string | undefined;
};

export function AdminCommandPalette(props: AdminCommandPaletteProps) {
  const palette = useCommandPaletteState(props);
  return (
    <>
      <CommandTrigger onOpen={palette.openPalette} />
      <Modal
        footer={null}
        open={palette.open}
        title="快捷命令"
        width={600}
        onCancel={palette.close}
      >
        <Input
          aria-activedescendant={palette.activeItem ? optionId(palette.activeItem.id) : undefined}
          aria-controls={COMMAND_LIST_ID}
          aria-expanded={palette.open}
          autoFocus
          placeholder="搜索功能、页面或操作"
          prefix={<SearchOutlined />}
          role="combobox"
          value={palette.query}
          onChange={(event) => palette.setQuery(event.target.value)}
          onKeyDown={palette.onInputKeyDown}
        />
        <Typography.Text className="admin-command-shortcut" type="secondary">
          ↑↓ 选择 · Enter 进入 · Esc 关闭
        </Typography.Text>
        <CommandSections
          activeIndex={palette.activeIndex}
          sections={palette.sections}
          onActiveChange={palette.setActiveIndex}
          onSelect={palette.select}
        />
      </Modal>
    </>
  );
}

function useCommandPaletteState(props: AdminCommandPaletteProps) {
  const { onViewChange, role } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const { preferences } = useAdminWorkspace();
  const sections = useMemo(
    () =>
      buildCommandSections({
        favoriteViews: preferences.favorites,
        query,
        recentViews: preferences.recentViews,
        role,
      }),
    [preferences.favorites, preferences.recentViews, query, role],
  );
  const items = useMemo(() => flattenCommandSections(sections), [sections]);
  const activeItem = items[activeIndex] ?? null;
  const openPalette = useCallback(() => setOpen(true), []);
  useCommandShortcut(openPalette);
  useEffect(() => setActiveIndex(items.length ? 0 : -1), [items.length, open, query]);
  const { close, select } = useCommandActions({ onViewChange, setOpen, setQuery });
  const onInputKeyDown = createCommandInputKeyHandler({
    activeItem,
    close,
    itemCount: items.length,
    select,
    setActiveIndex,
  });
  return {
    activeIndex,
    activeItem,
    close,
    onInputKeyDown,
    open,
    openPalette,
    query,
    sections,
    select,
    setActiveIndex,
    setQuery,
  };
}

function useCommandActions(props: {
  onViewChange: (view: AdminView) => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setQuery: Dispatch<SetStateAction<string>>;
}) {
  const { onViewChange, setOpen, setQuery } = props;
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, [setOpen, setQuery]);
  const select = useCallback(
    (view: AdminView) => {
      onViewChange(view);
      close();
    },
    [close, onViewChange],
  );
  return { close, select };
}

function createCommandInputKeyHandler(props: {
  activeItem: AdminNavigationItem | null;
  close: () => void;
  itemCount: number;
  select: (view: AdminView) => void;
  setActiveIndex: Dispatch<SetStateAction<number>>;
}) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      props.setActiveIndex((current) =>
        moveCommandSelection(current, event.key === 'ArrowDown' ? 1 : -1, props.itemCount),
      );
    }
    if (event.key === 'Enter' && props.activeItem) {
      event.preventDefault();
      props.select(props.activeItem.id);
    }
    if (event.key === 'Escape') props.close();
  };
}

function CommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      aria-label="搜索模块或命令"
      className="admin-command-trigger"
      icon={<SearchOutlined />}
      onClick={onOpen}
    >
      <span className="admin-command-trigger-label">搜索模块或命令</span>
      <kbd className="admin-command-trigger-shortcut">Ctrl K</kbd>
    </Button>
  );
}

function CommandSections(props: {
  sections: CommandSection[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onSelect: (view: AdminView) => void;
}) {
  if (!props.sections.some((section) => section.items.length))
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的模块" />;
  let startIndex = 0;
  return (
    <div className="admin-command-groups" id={COMMAND_LIST_ID} role="listbox">
      {props.sections.map((section) => {
        const sectionStartIndex = startIndex;
        startIndex += section.items.length;
        return (
          <CommandGroup
            activeIndex={props.activeIndex}
            key={section.key}
            section={section}
            startIndex={sectionStartIndex}
            onActiveChange={props.onActiveChange}
            onSelect={props.onSelect}
          />
        );
      })}
    </div>
  );
}

function CommandGroup(props: {
  section: CommandSection;
  startIndex: number;
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onSelect: (view: AdminView) => void;
}) {
  return (
    <section aria-label={props.section.title} className="admin-command-group">
      <Typography.Text type="secondary">{props.section.title}</Typography.Text>
      {props.section.items.map((item, index) => {
        const optionIndex = props.startIndex + index;
        return (
          <CommandOption
            active={optionIndex === props.activeIndex}
            item={item}
            key={item.id}
            onActive={() => props.onActiveChange(optionIndex)}
            onSelect={() => props.onSelect(item.id)}
          />
        );
      })}
    </section>
  );
}

function CommandOption(props: {
  active: boolean;
  item: AdminNavigationItem;
  onActive: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      aria-selected={props.active}
      className={`admin-command-item${props.active ? ' is-active' : ''}`}
      id={optionId(props.item.id)}
      role="option"
      type="button"
      onClick={props.onSelect}
      onMouseEnter={props.onActive}
    >
      <span>
        <strong>{props.item.label}</strong>
        <small>{props.item.helper}</small>
      </span>
      <span>进入</span>
    </button>
  );
}

function optionId(view: AdminView) {
  return `${COMMAND_OPTION_PREFIX}-${view}`;
}

function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
