import { SendOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Input, Space } from 'antd';
import { useState } from 'react';

export function AdminAgentComposer({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (value: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    const next = value.trim();
    if (!next) return;
    setValue('');
    onSend(next);
  };
  return (
    <Space.Compact className="admin-agent-composer" block>
      <Input
        aria-label="输入后台 Agent 任务"
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={submit}
        placeholder="例如：找出今天失败的 Agent 运行"
        value={value}
      />
      <Button
        icon={busy ? <StopOutlined /> : <SendOutlined />}
        onClick={busy ? onStop : submit}
        type={busy ? 'default' : 'primary'}
      />
    </Space.Compact>
  );
}
