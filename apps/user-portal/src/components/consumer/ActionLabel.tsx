type ActionLabelProps = {
  label: string;
  busy?: boolean;
  busyLabel?: string;
};

export function ActionLabel({ label, busy = false, busyLabel = '正在准备…' }: ActionLabelProps) {
  return (
    <span className="consumer-action-label">
      <span>{busy ? busyLabel : label}</span>
      <span className={busy ? 'consumer-action-pulse' : 'consumer-action-arrow'} aria-hidden="true">
        {busy ? '' : '→'}
      </span>
    </span>
  );
}
