'use client';

import { Layout } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import type { AdminView } from './admin-navigation';
import { AdminHeader } from './admin-shell/AdminHeader';
import { AdminSidebar } from './admin-shell/AdminSidebar';
import { AdminAgentWidget } from './admin-agent/AdminAgentWidget';

const { Content, Sider } = Layout;
const SIDEBAR_KEY = 'admin-console.sidebar-collapsed';

type AdminShellProps = {
  children: ReactNode;
  activeView: AdminView;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
  onViewChange: (view: AdminView) => void;
};

export function AdminShell(props: AdminShellProps) {
  const sidebar = useSidebarCollapse();
  return (
    <Layout className="admin-layout-shell" hasSider>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Sider
        breakpoint="lg"
        className="admin-layout-sider"
        collapsed={sidebar.collapsed}
        collapsedWidth={64}
        onBreakpoint={sidebar.onBreakpoint}
        trigger={null}
        width={224}
      >
        <AdminSidebar
          activeView={props.activeView}
          collapsed={sidebar.collapsed}
          onToggle={sidebar.toggle}
          onViewChange={props.onViewChange}
        />
      </Sider>
      <Layout>
        <AdminHeader
          activeView={props.activeView}
          collapsed={sidebar.collapsed}
          isRefreshing={props.isRefreshing}
          lastUpdatedAt={props.lastUpdatedAt}
          onRefresh={props.onRefresh}
          onToggleSidebar={sidebar.toggle}
          onViewChange={props.onViewChange}
        />
        <Content className="admin-layout-content" id="main-content" tabIndex={-1}>
          {props.children}
        </Content>
      </Layout>
      <AdminAgentWidget />
    </Layout>
  );
}

function useSidebarCollapse() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isNarrowViewport, setNarrowViewport] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);
  useEffect(() => {
    setDesktopCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
  }, []);
  const toggle = () => {
    if (isNarrowViewport) {
      setMobileCollapsed((current) => !current);
      return;
    }
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  };
  const onBreakpoint = (broken: boolean) => {
    setNarrowViewport(broken);
    if (broken) setMobileCollapsed(true);
  };
  return { collapsed: isNarrowViewport ? mobileCollapsed : desktopCollapsed, onBreakpoint, toggle };
}
