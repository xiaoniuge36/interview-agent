import type { NavigationId } from './navigation';
import { NAV_ITEMS } from './navigation';
import { NavigationIcon } from './NavigationIcon';

type UserSidebarProps = { activeId: NavigationId; onNavigate: (id: NavigationId) => void };

export function UserSidebar({ activeId, onNavigate }: UserSidebarProps) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#workspace" onClick={() => onNavigate('workspace')}>
        <span className="brand-mark">IA</span>
        <span>
          <strong>Interview Agent</strong>
          <small>Practice studio</small>
        </span>
      </a>
      <a className="sidebar-action" href="#interview" onClick={() => onNavigate('interview')}>
        <NavigationIcon name="mic" />
        Start a mock interview
      </a>
      <NavigationLinks activeId={activeId} onNavigate={onNavigate} />
      <div className="sidebar-footer">
        <span className="sidebar-footer-label">Your training record</span>
        <strong>Visible only to this account</strong>
        <small>Return to reports whenever you need to review feedback.</small>
      </div>
    </aside>
  );
}

function NavigationLinks({ activeId, onNavigate }: UserSidebarProps) {
  return (
    <nav className="nav" aria-label="Main user navigation">
      <span className="nav-label">Training path</span>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          className={activeId === item.id ? 'nav-item active' : 'nav-item'}
          href={`#${item.id}`}
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
