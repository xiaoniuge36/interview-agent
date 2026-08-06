const SIGNALS = ['AI', '01', '{}', 'RAG', '↗', 'MCP', '[]', '10'] as const;
const SIGNAL_COUNT = 72;

export function SignalField() {
  return (
    <span className="consumer-signal-field" aria-hidden="true">
      {Array.from({ length: SIGNAL_COUNT }, (_, index) => (
        <i key={index}>{SIGNALS[index % SIGNALS.length]}</i>
      ))}
    </span>
  );
}
