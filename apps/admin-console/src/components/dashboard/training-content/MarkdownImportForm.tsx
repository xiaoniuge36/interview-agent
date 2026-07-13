import { useState, type FormEvent } from 'react';
import { importMarkdown } from '@/lib/training-content-api';
import type { ChangeHandler } from './types';
import { errorMessage } from './training-utils';

const DEFAULT_MARKDOWN = `# Training notes

## Core assessment question
Describe the expected answer, key decisions, and engineering trade-offs.`;

type MarkdownImportFormProps = {
  onChanged: ChangeHandler;
};

export function MarkdownImportForm({ onChanged }: MarkdownImportFormProps) {
  const form = useMarkdownImport(onChanged);
  return (
    <article className="card training-card">
      <h3>Import Markdown reference material</h3>
      <p className="card-description">
        The deterministic fallback creates review candidates only; it never publishes directly to
        the question bank.
      </p>
      <form className="training-form" onSubmit={(event) => void form.submit(event)}>
        <MarkdownFields form={form} />
        <button className="button" type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Importing?' : 'Import and create candidates'}
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
      setMessage(`Created an import task with ${task.candidateCount} candidate questions.`);
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
        Material title
        <input
          value={form.title}
          onChange={(event) => form.setTitle(event.target.value)}
          placeholder="For example: payment system interview notes"
          required
        />
      </label>
      <label className="form-label">
        Markdown content
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
