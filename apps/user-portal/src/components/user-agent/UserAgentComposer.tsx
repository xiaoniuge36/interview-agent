import { useState, type FormEvent } from 'react';

export function UserAgentComposer(props: {
  busy: boolean;
  onSend: (value: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (!next || props.busy) return;
    props.onSend(next);
    setValue('');
  };
  return (
    <form className="user-agent-composer" onSubmit={submit}>
      <textarea
        aria-label="向 AI 刷题教练提问"
        disabled={props.busy}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="问问你的下一轮训练…"
        rows={2}
        value={value}
      />
      <div className="user-agent-composer-footer">
        <span>Enter 发送 · Shift + Enter 换行</span>
        {props.busy ? (
          <button className="user-agent-send is-stop" type="button" onClick={props.onStop}>
            停止
          </button>
        ) : (
          <button className="user-agent-send" disabled={!value.trim()} type="submit">
            发送
          </button>
        )}
      </div>
    </form>
  );
}
