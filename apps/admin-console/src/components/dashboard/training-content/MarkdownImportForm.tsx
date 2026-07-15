import { Alert, Button, Card, Form, Input } from 'antd';
import { useState } from 'react';
import { importMarkdown } from '@/lib/training-content-api';
import type { ChangeHandler } from './types';
import { errorMessage } from './training-utils';

const DEFAULT_MARKDOWN = `# 面试训练资料

## 核心考察题
请描述期望答案、关键决策与工程权衡。`;

type MarkdownImportFormProps = {
  onChanged: ChangeHandler;
  onCompleted?: (() => void) | undefined;
};

export function MarkdownImportForm({ onChanged, onCompleted }: MarkdownImportFormProps) {
  const form = useMarkdownImport({ onChanged, onCompleted });
  return (
    <Card className="admin-form-card" variant="borderless">
      <Form layout="vertical" onFinish={() => void form.submit()} requiredMark={false}>
        <Form.Item label="资料标题" required>
          <Input placeholder="例如：支付系统面试笔记" value={form.title} onChange={(event) => form.setTitle(event.target.value)} />
        </Form.Item>
        <Form.Item label="Markdown 内容" required>
          <Input.TextArea rows={10} value={form.markdown} onChange={(event) => form.setMarkdown(event.target.value)} />
        </Form.Item>
        {form.message ? <Alert className="admin-form-message" message={form.message} showIcon type={form.messageType} /> : null}
        <Button htmlType="submit" loading={form.isSubmitting} type="primary">导入并生成候选题</Button>
      </Form>
    </Card>
  );
}

function useMarkdownImport(props: MarkdownImportFormProps) {
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');
  const [isSubmitting, setSubmitting] = useState(false);
  async function submit() {
    if (!title.trim() || !markdown.trim()) {
      setMessageType('error');
      setMessage('请填写资料标题和 Markdown 内容。');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const task = await importMarkdown({ title, markdown });
      setTitle('');
      setMessageType('success');
      setMessage(`导入任务已创建，共生成 ${task.candidateCount} 道候选题。`);
      props.onChanged();
      props.onCompleted?.();
    } catch (error) {
      setMessageType('error');
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }
  return { title, markdown, message, messageType, isSubmitting, setTitle, setMarkdown, submit };
}
