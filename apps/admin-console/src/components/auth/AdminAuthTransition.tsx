import { LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

export function AdminAuthTransition() {
  return (
    <main className="admin-auth-transition" role="status" aria-live="polite" aria-busy="true">
      <section className="admin-auth-transition-card" aria-labelledby="admin-auth-transition-title">
        <div className="admin-auth-transition-brand">
          <SafetyCertificateOutlined aria-hidden="true" />
          <span>INTERVIEW AGENT · GOVERNANCE</span>
        </div>
        <h1 id="admin-auth-transition-title">正在验证后台登录状态</h1>
        <p>正在恢复安全会话与治理权限，请稍候。</p>
        <div className="admin-auth-transition-progress">
          <LoadingOutlined aria-hidden="true" spin />
          <span>正在恢复安全会话</span>
        </div>
      </section>
    </main>
  );
}
