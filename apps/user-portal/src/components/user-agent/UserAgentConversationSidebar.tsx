import { useMemo, useState } from 'react';
import type { UserAgentConversationSummary } from '@/lib/user-agent-conversation-api';

type SidebarProps = {
  activeId: string | null;
  conversations: UserAgentConversationSummary[];
  loading: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function UserAgentConversationSidebar(props: SidebarProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return props.conversations;
    return props.conversations.filter((item) =>
      `${item.title} ${item.lastMessagePreview ?? ''}`.toLowerCase().includes(keyword),
    );
  }, [props.conversations, query]);
  return (
    <aside className="user-agent-conversation-sidebar" aria-label="AI 刷题教练历史对话">
      <SidebarHeading onCreate={props.onCreate} />
      <ConversationSearch query={query} onChange={setQuery} />
      {props.loading ? <p className="user-agent-sidebar-state">正在加载历史对话...</p> : null}
      {!props.loading && filtered.length === 0 ? (
        <p className="user-agent-sidebar-state">还没有匹配的训练对话</p>
      ) : null}
      <div className="user-agent-conversation-list">
        {filtered.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            active={conversation.id === props.activeId}
            conversation={conversation}
            onDelete={props.onDelete}
            onRename={props.onRename}
            onSelect={props.onSelect}
          />
        ))}
      </div>
    </aside>
  );
}

function SidebarHeading({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="user-agent-sidebar-heading">
      <div>
        <span className="user-agent-eyebrow">训练导航</span>
        <strong>历史对话</strong>
      </div>
      <button aria-label="新建对话" className="user-agent-new" type="button" onClick={onCreate}>
        +
      </button>
    </div>
  );
}

function ConversationSearch(props: { query: string; onChange: (value: string) => void }) {
  return (
    <label className="user-agent-search">
      <span aria-hidden="true">⌕</span>
      <input
        aria-label="搜索历史对话"
        value={props.query}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="搜索训练记录"
      />
    </label>
  );
}

function ConversationRow(props: {
  active: boolean;
  conversation: UserAgentConversationSummary;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(props.conversation.title);
  const save = async () => {
    if (!title.trim()) return;
    await props.onRename(props.conversation.id, title.trim());
    setEditing(false);
  };
  return (
    <div className={`user-agent-conversation-row${props.active ? ' is-active' : ''}`}>
      {editing ? (
        <ConversationTitleEditor
          title={title}
          onCancel={() => setEditing(false)}
          onChange={setTitle}
          onSave={save}
        />
      ) : (
        <button
          className="user-agent-conversation-select"
          type="button"
          onClick={() => props.onSelect(props.conversation.id)}
        >
          <strong>{props.conversation.title}</strong>
          <span>{props.conversation.lastMessagePreview ?? '还没有消息'}</span>
        </button>
      )}
      <ConversationActions
        onDelete={() => void props.onDelete(props.conversation.id)}
        onRename={() => setEditing(true)}
      />
    </div>
  );
}

function ConversationTitleEditor(props: {
  title: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <input
      autoFocus
      className="user-agent-rename-input"
      value={props.title}
      onChange={(event) => props.onChange(event.target.value)}
      onBlur={() => void props.onSave()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') void props.onSave();
        if (event.key === 'Escape') props.onCancel();
      }}
    />
  );
}

function ConversationActions(props: { onRename: () => void; onDelete: () => void }) {
  return (
    <div className="user-agent-conversation-actions">
      <button aria-label="重命名对话" type="button" onClick={props.onRename}>
        改
      </button>
      <button aria-label="删除对话" type="button" onClick={props.onDelete}>
        删
      </button>
    </div>
  );
}
