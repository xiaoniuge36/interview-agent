import type { NavigationId } from './navigation';
import { NAV_ITEMS } from './navigation';
import { NavigationIcon } from './NavigationIcon';

type UserSidebarProps = { activeId: NavigationId; onNavigate: (id: NavigationId) => void };

export function UserSidebar({ activeId, onNavigate }: UserSidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#workspace" onClick={() => onNavigate('workspace')}>
        <span className="brand-mark">OP</span>
        <span>
          <strong>OfferPilot</strong>
          <small>AI 面试训练</small>
        </span>
      </a>
      <a className="sidebar-action" href="#interview" onClick={() => onNavigate('interview')}>
        <NavigationIcon name="mic" />
        开始模拟面试
      </a>
      <NavigationLinks activeId={activeId} onNavigate={onNavigate} />
      <div className="sidebar-footer">
        <span className="sidebar-footer-label">训练方法</span>
        <strong>先练能力，再冲 Offer</strong>
        <small>用真实项目经历形成可复用的面试表达资产。</small>
      </div>
    </aside>
  );
}

function NavigationLinks({ activeId, onNavigate }: UserSidebarProps) {
  return (
    <nav className="nav" aria-label="主导航">
      <span className="nav-label">训练工作台</span>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          className={activeId === item.id ? 'nav-item active' : 'nav-item'}
          href={'#' + item.id}
          aria-current={activeId === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <NavigationIcon name={item.icon} />
          <span>
            <strong>{item.label}</strong>
            <small>{item.helper}</small>
          </span>
        </a>
      ))}
    </nav>
  );
}