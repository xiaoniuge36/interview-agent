import Link from 'next/link';
import { NAV_ITEMS } from './navigation';
import { NavigationIcon } from './NavigationIcon';

export function UserTopNav() {
  return <header className="top-nav" aria-label="产品导航"><div className="top-nav-bar"><Link className="brand" href="/home"><span className="brand-mark"><span className="brand-mark-core" /></span><span className="brand-text"><strong>OfferPilot</strong><small>你的面试 Agent</small></span></Link><Link className="top-nav-primary" href="/interview">开始模拟</Link></div><nav className="top-nav-journey" aria-label="训练路径">{NAV_ITEMS.filter((item) => item.step != null).map((item) => <Link className="top-tab" href={item.href} key={item.id}><NavigationIcon name={item.icon} /><span>{item.label}</span></Link>)}</nav></header>;
}
