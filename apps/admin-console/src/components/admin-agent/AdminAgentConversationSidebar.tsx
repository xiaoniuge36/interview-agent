import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Empty, Input, List, Modal, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { AdminAgentConversationSummary } from '@/lib/admin-page-agent-conversation-api';
import {
  filterAdminAgentConversations,
  formatConversationTime,
} from './admin-agent-conversation-model';

type Props = {
  conversations: AdminAgentConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onCreate: () => void;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string, title: string) => Promise<void>;
  onDelete: (conversationId: string) => Promise<void>;
};

export function AdminAgentConversationSidebar(props: Props) {
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<AdminAgentConversationSummary | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const filtered = useMemo(
    () => filterAdminAgentConversations(props.conversations, keyword),
    [keyword, props.conversations],
  );
  const openRename = (conversation: AdminAgentConversationSummary) => {
    setEditing(conversation);
    setDraftTitle(conversation.title);
  };
  const saveRename = async () => {
    if (!editing || !draftTitle.trim()) return;
    await props.onRename(editing.id, draftTitle.trim());
    setEditing(null);
  };

  return (
    <aside aria-label="历史对话" className="admin-agent-conversation-sidebar">
      <SidebarHeader onCreate={props.onCreate} />
      <SidebarSearch keyword={keyword} onChange={setKeyword} />
      <ConversationSidebarList
        activeId={props.activeId}
        conversations={filtered}
        loading={props.loading}
        onDelete={props.onDelete}
        onRename={openRename}
        onSelect={props.onSelect}
        keyword={keyword}
      />
      <RenameConversationModal
        draftTitle={draftTitle}
        editing={editing}
        onChange={setDraftTitle}
        onClose={() => setEditing(null)}
        onSave={() => void saveRename()}
      />
    </aside>
  );
}

function SidebarHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="admin-agent-conversation-sidebar-header">
      <div>
        <Typography.Text strong>历史对话</Typography.Text>
        <Typography.Text type="secondary">仅当前后台账号可见</Typography.Text>
      </div>
      <Button aria-label="新建对话" icon={<PlusOutlined />} onClick={onCreate} type="primary">
        新建
      </Button>
    </div>
  );
}

function SidebarSearch({
  keyword,
  onChange,
}: {
  keyword: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      allowClear
      aria-label="搜索历史对话"
      onChange={(event) => onChange(event.target.value)}
      placeholder="搜索对话"
      prefix={<SearchOutlined />}
      value={keyword}
    />
  );
}

function RenameConversationModal(props: {
  editing: AdminAgentConversationSummary | null;
  draftTitle: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      cancelText="取消"
      okText="保存"
      onCancel={props.onClose}
      onOk={props.onSave}
      open={Boolean(props.editing)}
      title="重命名对话"
    >
      <Input
        autoFocus
        maxLength={80}
        onChange={(event) => props.onChange(event.target.value)}
        onPressEnter={props.onSave}
        value={props.draftTitle}
      />
    </Modal>
  );
}

function ConversationSidebarList(props: {
  conversations: AdminAgentConversationSummary[];
  activeId: string | null;
  loading: boolean;
  keyword: string;
  onSelect: (conversationId: string) => void;
  onRename: (conversation: AdminAgentConversationSummary) => void;
  onDelete: (conversationId: string) => Promise<void>;
}) {
  if (props.loading) return <Spin className="admin-agent-conversation-sidebar-loading" />;
  if (!props.conversations.length)
    return (
      <Empty
        description={props.keyword ? '没有匹配的对话' : '还没有历史对话'}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  return (
    <div className="admin-agent-conversation-sidebar-list">
      <List
        dataSource={props.conversations}
        renderItem={(conversation) => (
          <ConversationItem
            activeId={props.activeId}
            conversation={conversation}
            onDelete={props.onDelete}
            onRename={props.onRename}
            onSelect={props.onSelect}
          />
        )}
      />
    </div>
  );
}

function ConversationItem(props: {
  conversation: AdminAgentConversationSummary;
  activeId: string | null;
  onSelect: (conversationId: string) => void;
  onRename: (conversation: AdminAgentConversationSummary) => void;
  onDelete: (conversationId: string) => Promise<void>;
}) {
  const { conversation } = props;
  return (
    <List.Item
      className={`admin-agent-conversation-item${conversation.id === props.activeId ? ' is-active' : ''}`}
    >
      <button
        className="admin-agent-conversation-item-main"
        onClick={() => props.onSelect(conversation.id)}
        type="button"
      >
        <span className="admin-agent-conversation-item-title">{conversation.title}</span>
        <span className="admin-agent-conversation-item-meta">
          {conversation.messageCount ? `${conversation.messageCount} 条消息 · ` : ''}
          {formatConversationTime(conversation.updatedAt)}
        </span>
        {conversation.lastMessagePreview ? (
          <span className="admin-agent-conversation-item-preview">
            {conversation.lastMessagePreview}
          </span>
        ) : null}
      </button>
      <ConversationItemMenu
        conversation={conversation}
        onDelete={props.onDelete}
        onRename={props.onRename}
      />
    </List.Item>
  );
}

function ConversationItemMenu(props: {
  conversation: AdminAgentConversationSummary;
  onRename: (conversation: AdminAgentConversationSummary) => void;
  onDelete: (conversationId: string) => Promise<void>;
}) {
  const items = [
    { key: 'rename', icon: <EditOutlined />, label: '重命名' },
    { key: 'delete', danger: true, icon: <DeleteOutlined />, label: '删除' },
  ];
  const onClick = ({ key }: { key: string }) => {
    if (key === 'rename') props.onRename(props.conversation);
    if (key === 'delete')
      Modal.confirm({
        cancelText: '取消',
        content: '删除后无法恢复，是否继续？',
        okText: '删除',
        okType: 'danger',
        onOk: () => props.onDelete(props.conversation.id),
        title: '删除这条对话？',
      });
  };
  return (
    <Dropdown menu={{ items, onClick }} trigger={['click']}>
      <Button
        aria-label={`管理对话：${props.conversation.title}`}
        className="admin-agent-conversation-item-menu"
        icon={<MoreOutlined />}
        type="text"
      />
    </Dropdown>
  );
}
