'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import {
  adminViewHash,
  adminViewLocationFromHash,
  resolveAdminViewForRole,
  type AdminView,
  type AdminViewLocation,
  type AdminViewParams,
} from '@/components/admin-navigation';
import { AdminShell } from '@/components/AdminShell';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { AdminOverview } from './AdminOverview';
import { AccountManagement } from './AccountManagement';
import { AuditLogPanel } from './AuditLogPanel';
import { ImportCenter } from './ImportCenter';
import { ModelGovernance } from './ModelGovernance';
import { QuestionReviewPanels } from './QuestionReviewPanels';
import { RuntimeObservability } from './RuntimeObservability';
import { PlatformAnalytics } from './PlatformAnalytics';
import { TrainingContentWorkbench } from './TrainingContentWorkbench';

export function AdminDashboard() {
  const { state, isRefreshing, lastUpdatedAt, reload } = useAdminDashboard();
  const auth = useAuth();
  const { activeView: requestedView, params, selectView } = useAdminView();
  const activeView = resolveAdminViewForRole(auth.identity?.role, requestedView);
  const [listReloadKey, setListReloadKey] = useState(0);
  useEffect(() => {
    if (activeView !== requestedView) selectView(activeView);
  }, [activeView, requestedView, selectView]);
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
        <AdminOverview dashboard={state.dashboard} onNavigate={onNavigate} />
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
      {children}
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
