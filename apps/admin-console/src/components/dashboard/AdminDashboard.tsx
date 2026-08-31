'use client';

import { Skeleton } from 'antd';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import {
  adminViewHash,
  adminViewLocationFromHash,
  getAdminNavigationItem,
  resolveAdminViewForRole,
  type AdminView,
  type AdminViewLocation,
  type AdminViewParams,
} from '@/components/admin-navigation';
import { useAdminWorkspace } from '@/components/admin-workspace-context';
import { AdminSectionBoundary } from '@/components/AdminSectionBoundary';
import { AdminShell } from '@/components/AdminShell';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { AdminOverview } from './AdminOverview';

const SECTION_SKELETON_ROWS = 6;

function sectionFallback() {
  return <Skeleton active paragraph={{ rows: SECTION_SKELETON_ROWS }} title />;
}

/** 重视图按需拆包：仅在对应 Tab 首次激活时加载对应 chunk。 */
function dynamicSection<TProps extends object>(
  loader: () => Promise<{ default: ComponentType<TProps> } | ComponentType<TProps>>,
) {
  return dynamic(loader, { ssr: false, loading: sectionFallback });
}

const ImportCenter = dynamicSection(() =>
  import('./ImportCenter').then((module) => module.ImportCenter),
);
const QuestionReviewPanels = dynamicSection(() =>
  import('./QuestionReviewPanels').then((module) => module.QuestionReviewPanels),
);
const TrainingContentWorkbench = dynamicSection(() =>
  import('./TrainingContentWorkbench').then((module) => module.TrainingContentWorkbench),
);
const ModelGovernance = dynamicSection(() =>
  import('./ModelGovernance').then((module) => module.ModelGovernance),
);
const RuntimeObservability = dynamicSection(() =>
  import('./RuntimeObservability').then((module) => module.RuntimeObservability),
);
const AuditLogPanel = dynamicSection(() =>
  import('./AuditLogPanel').then((module) => module.AuditLogPanel),
);
const PlatformAnalytics = dynamicSection(() =>
  import('./PlatformAnalytics').then((module) => module.PlatformAnalytics),
);
const AccountManagement = dynamicSection(() =>
  import('./AccountManagement').then((module) => module.AccountManagement),
);

export function AdminDashboard() {
  const { state, isRefreshing, lastUpdatedAt, reload } = useAdminDashboard();
  const auth = useAuth();
  const { recordView } = useAdminWorkspace();
  const { activeView: requestedView, params, selectView } = useAdminView();
  const activeView = resolveAdminViewForRole(auth.identity?.role, requestedView);
  const [listReloadKey, setListReloadKey] = useState(0);
  useEffect(() => {
    if (activeView !== requestedView) selectView(activeView);
  }, [activeView, requestedView, selectView]);
  useEffect(() => recordView(activeView), [activeView, recordView]);
  const reloadAll = useCallback(() => {
    reload();
    setListReloadKey((value) => value + 1);
  }, [reload]);
  useEffect(() => {
    window.addEventListener('admin-agent-refresh', reloadAll);
    return () => window.removeEventListener('admin-agent-refresh', reloadAll);
  }, [reloadAll]);
  return (
    <AdminShell
      activeView={activeView}
      isRefreshing={isRefreshing}
      lastUpdatedAt={lastUpdatedAt}
      onRefresh={reloadAll}
      onViewChange={selectView}
    >
      <DashboardSections
        activeView={activeView}
        params={params}
        refreshKey={listReloadKey}
        state={state}
        onChanged={reloadAll}
        onNavigate={selectView}
      />
    </AdminShell>
  );
}

type DashboardState = ReturnType<typeof useAdminDashboard>['state'];

type DashboardSectionsProps = {
  activeView: AdminView;
  params: AdminViewParams;
  refreshKey: number;
  state: DashboardState;
  onChanged: () => void;
  onNavigate: (view: AdminView, params?: AdminViewParams) => void;
};

function DashboardSections({
  activeView,
  onChanged,
  onNavigate,
  params,
  refreshKey,
  state,
}: DashboardSectionsProps) {
  return (
    <div className="admin-dashboard-content" data-admin-view={activeView}>
      <DashboardView active={activeView === 'overview'} view="overview">
        <AdminOverview dashboard={state.dashboard} onNavigate={onNavigate} onRetry={onChanged} />
      </DashboardView>
      <DashboardView active={activeView === 'imports'} view="imports">
        <ImportCenter
          active={activeView === 'imports'}
          dashboard={state.dashboard}
          refreshKey={refreshKey}
          onChanged={onChanged}
          onNavigate={(importTaskId) => onNavigate('content', importTaskId ? { importTaskId } : {})}
        />
      </DashboardView>
      <DashboardView active={activeView === 'questions'} view="questions">
        <QuestionReviewPanels active={activeView === 'questions'} refreshKey={refreshKey} />
      </DashboardView>
      <DashboardView active={activeView === 'content'} view="content">
        <TrainingContentWorkbench
          active={activeView === 'content'}
          importTaskId={params.importTaskId}
          refreshKey={refreshKey}
          onChanged={onChanged}
          onClearImportTask={() => onNavigate('content')}
        />
      </DashboardView>
      <OperationalSections activeView={activeView} refreshKey={refreshKey} />
      <PlatformAdminSections
        activeView={activeView}
        refreshKey={refreshKey}
        onChanged={onChanged}
      />
    </div>
  );
}

function OperationalSections({
  activeView,
  refreshKey,
}: Pick<DashboardSectionsProps, 'activeView' | 'refreshKey'>) {
  return (
    <>
      <DashboardView active={activeView === 'models'} view="models">
        <ModelGovernance active={activeView === 'models'} refreshKey={refreshKey} />
      </DashboardView>
      <DashboardView active={activeView === 'runtime'} view="runtime">
        <RuntimeObservability active={activeView === 'runtime'} refreshKey={refreshKey} />
      </DashboardView>
      <DashboardView active={activeView === 'audit'} view="audit">
        <AuditLogPanel active={activeView === 'audit'} refreshKey={refreshKey} />
      </DashboardView>
    </>
  );
}

function PlatformAdminSections({
  activeView,
  onChanged,
  refreshKey,
}: Pick<DashboardSectionsProps, 'activeView' | 'onChanged' | 'refreshKey'>) {
  return (
    <>
      <DashboardView active={activeView === 'analytics'} view="analytics">
        <PlatformAnalytics active={activeView === 'analytics'} refreshKey={refreshKey} />
      </DashboardView>
      <DashboardView active={activeView === 'accounts'} view="accounts">
        <AccountManagement
          active={activeView === 'accounts'}
          refreshKey={refreshKey}
          onChanged={onChanged}
        />
      </DashboardView>
    </>
  );
}

type DashboardViewProps = {
  active: boolean;
  children: ReactNode;
  view: AdminView;
};

function DashboardView({ active, children, view }: DashboardViewProps) {
  return (
    <div className="console-view" hidden={!active} id={`admin-view-${view}`}>
      {active ? (
        <AdminSectionBoundary section={getAdminNavigationItem(view).label}>
          {children}
        </AdminSectionBoundary>
      ) : null}
    </div>
  );
}

function useAdminView() {
  const [location, setLocation] = useState<AdminViewLocation>({ view: 'overview', params: {} });

  useEffect(() => {
    const syncView = () => setLocation(adminViewLocationFromHash(window.location.hash));
    syncView();
    window.addEventListener('hashchange', syncView);
    window.addEventListener('popstate', syncView);
    return () => {
      window.removeEventListener('hashchange', syncView);
      window.removeEventListener('popstate', syncView);
    };
  }, []);

  const selectView = useCallback((view: AdminView, params: AdminViewParams = {}) => {
    const hash = adminViewHash(view, params);
    setLocation(adminViewLocationFromHash(hash));
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { activeView: location.view, params: location.params, selectView };
}
