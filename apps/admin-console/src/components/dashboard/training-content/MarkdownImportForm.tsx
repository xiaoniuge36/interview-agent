import { useState, type FormEvent } from 'react';
import { ConsoleIcon } from '@/components/ConsoleIcon';
import { importMarkdown } from '@/lib/training-content-api';
import type { ChangeHandler } from './types';
import { errorMessage } from './training-utils';

const DEFAULT_MARKDOWN = `# 面试训练资料

## 核心考察题
请描述期望答案、关键决策与工程权衡。`;

type MarkdownImportFormProps = {
  onChanged: ChangeHandler;
};

export function MarkdownImportForm({ onChanged }: MarkdownImportFormProps) {
  const form = useMarkdownImport(onChanged);
  return (
    <article className="card training-card">
      <h3>导入 Markdown 参考资料</h3>
      <p className="card-description">
        系统会生成待审核候选题，只有通过人工审核后才可进入正式题库。
      </p>
      <form className="training-form" onSubmit={(event) => void form.submit(event)}>
        <MarkdownFields form={form} />
        <button className="button" type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? '导入中…' : '导入并生成候选题'}
        </button>
      </form>
      {form.message ? (
        <p className="form-message" role="status">
          {form.message}
        </p>
      ) : null}
    </article>
  );
}

function useMarkdownImport(onChanged: ChangeHandler) {
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [message, setMessage] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const task = await importMarkdown({ title, markdown });
      setTitle('');
      setMessage(`导入任务已创建，共生成 ${task.candidateCount} 道候选题。`);
      onChanged();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }
  return { title, markdown, message, isSubmitting, setTitle, setMarkdown, submit };
}

function MarkdownFields({ form }: { form: ReturnType<typeof useMarkdownImport> }) {
  return (
    <>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="text" size={15} />
          资料标题
        </span>
        <input
          value={form.title}
          onChange={(event) => form.setTitle(event.target.value)}
          placeholder="例如：支付系统面试笔记"
          required
        />
      </label>
      <label className="form-label">
        <span className="field-label-title">
          <ConsoleIcon name="document" size={15} />
          Markdown 内容
        </span>
        <textarea
          value={form.markdown}
          onChange={(event) => form.setMarkdown(event.target.value)}
          rows={10}
          required
        />
      </label>
    </>
  );
}
