import { useMemo, useState } from 'react';
import type { UserAgentConversationSummary } from '@/lib/user-agent-conversation-api';

export function UserAgentConversationSidebar(props: {
  activeId: string | null;
  conversations: UserAgentConversationSummary[];
  loading: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return props.conversations;
    return props.conversations.filter((item) => `${item.title} ${item.lastMessagePreview ?? ''}`.toLowerCase().includes(keyword));
  }, [props.conversations, query]);
  return (
    <aside className="user-agent-conversation-sidebar" aria-label="AI 刷题教练历史对话">
      <div className="user-agent-sidebar-heading">
        <div>
          <span className="user-agent-eyebrow">训练航标</span>
          <strong>历史对话</strong>
        </div>
        <button aria-label="新建对话" className="user-agent-new" type="button" onClick={props.onCreate}>
          +
        </button>
      </div>
      <label className="user-agent-search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="搜索历史对话" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索训练记录" />
      </label>
      {props.loading ? <p className="user-agent-sidebar-state">正在加载历史…</p> : null}
      {!props.loading && filtered.length === 0 ? <p className="user-agent-sidebar-state">还没有匹配的训练对话</p> : null}
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
        <input
          autoFocus
          className="user-agent-rename-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void save()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save();
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button className="user-agent-conversation-select" type="button" onClick={() => props.onSelect(props.conversation.id)}>
          <strong>{props.conversation.title}</strong>
          <span>{props.conversation.lastMessagePreview ?? '还没有消息'}</span>
        </button>
      )}
      <div className="user-agent-conversation-actions">
        <button aria-label="重命名对话" type="button" onClick={() => setEditing(true)}>改</button>
        <button aria-label="删除对话" type="button" onClick={() => void props.onDelete(props.conversation.id)}>删</button>
      </div>
    </div>
  );
}
