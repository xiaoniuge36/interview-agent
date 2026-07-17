export function RouteLoadingState({ label = '正在准备页面' }: { label?: string }) {
  return (
    <section className="workspace route-loading-state" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="route-loading-signal" aria-hidden="true">
        <span />
        <i />
        <i />
        <i />
      </div>
      <div className="route-loading-intro" aria-hidden="true">
        <span />
        <strong />
        <p />
      </div>
      <div className="route-loading-grid" aria-hidden="true">
        <div className="route-loading-card">
          <span />
          <strong />
          <p />
          <p />
        </div>
        <div className="route-loading-card compact">
          <span />
          <strong />
          <p />
        </div>
      </div>
    </section>
  );
}
