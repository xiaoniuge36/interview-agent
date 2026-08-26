const STAT_PLACEHOLDER_KEYS = ['pace', 'focus', 'signal'] as const;
const ROW_PLACEHOLDER_KEYS = ['alpha', 'beta', 'gamma', 'delta'] as const;

export function RouteLoadingState({ label = '正在准备页面' }: { label?: string }) {
  return (
    <section className="workspace route-loading-state" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>

      <div className="route-loading-intro" aria-hidden="true">
        <span />
        <strong />
        <p />
      </div>

      <div className="route-loading-stats" aria-hidden="true">
        {STAT_PLACEHOLDER_KEYS.map((key) => (
          <div key={key} className="route-loading-stat">
            <span />
            <strong />
          </div>
        ))}
      </div>

      <div className="route-loading-grid" aria-hidden="true">
        <div className="route-loading-card">
          <span />
          <strong />
          <div className="route-loading-rows">
            {ROW_PLACEHOLDER_KEYS.map((key) => (
              <div key={key} className="route-loading-row">
                <i />
                <p />
              </div>
            ))}
          </div>
        </div>
        <div className="route-loading-card compact">
          <span />
          <strong />
          <p />
          <p />
        </div>
      </div>
    </section>
  );
}
