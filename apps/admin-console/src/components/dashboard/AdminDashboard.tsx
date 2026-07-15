'use client';

import { useAuth } from '@interview-agent/auth-client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { adminViewFromHash, adminViewHash, type AdminView } from '@/components/admin-navigation';
import { AdminShell } from '@/components/AdminShell';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { AdminOverview } from './AdminOverview';
import { AuditLogPanel } from './AuditLogPanel';
import { getAuthenticationRecovery } from './admin-session';
import { ImportCenter } from './ImportCenter';
import { ModelGovernance } from './ModelGovernance';
import { QuestionReviewPanels } from './QuestionReviewPanels';
import { RuntimeObservability } from './RuntimeObservability';
import { TrainingContentWorkbench } from './TrainingContentWorkbench';
import { AuthenticationFailure } from './SectionState';

export function AdminDashboard() {
  const auth = useAuth();
  const { state, isRefreshing, lastUpdatedAt, reload } = useAdminDashboard();
  const { activeView, selectView } = useAdminView();
  const authenticationError = state.authenticationError;
  const recovery = getAuthenticationRecovery(auth.mode);
  const restoreSession = () => {
    if (recovery.action === 'sign-in') void auth.signIn();
    else if (recovery.action === 'sign-out') void auth.signOut();
    else reload();
  };
  return (
    <AdminShell
      activeView={activeView}
      isRefreshing={isRefreshing}
      lastUpdatedAt={lastUpdatedAt}
      onRefresh={reload}
      onViewChange={selectView}
    >
      {authenticationError ? (
        <AuthenticationFailure
          error={authenticationError}
          actionLabel={recovery.label}
          onAction={restoreSession}
        />
      ) : (
        <DashboardSections
          activeView={activeView}
          state={state}
          onChanged={reload}
          onNavigate={selectView}
        />
      )}
    </AdminShell>
  );
}

type DashboardState = ReturnType<typeof useAdminDashboard>['state'];

type DashboardSectionsProps = {
  activeView: AdminView;
  state: DashboardState;
  onChanged: () => void;
  onNavigate: (view: AdminView) => void;
};

function DashboardSections(props: DashboardSectionsProps) {
  const { activeView, state } = props;
  return (
    <div className="admin-dashboard-content" data-admin-view={activeView}>
      <DashboardView active={activeView === 'overview'} view="overview">
        <AdminOverview
          dashboard={state.dashboard}
          candidates={state.candidates}
          onNavigate={props.onNavigate}
        />
      </DashboardView>
      <DashboardView active={activeView === 'imports'} view="imports">
        <ImportCenter
          dashboard={state.dashboard}
          imports={state.imports}
          onChanged={props.onChanged}
        />
      </DashboardView>
      <DashboardView active={activeView === 'questions'} view="questions">
        <QuestionReviewPanels questions={state.questions} />
      </DashboardView>
      <DashboardView active={activeView === 'content'} view="content">
        <TrainingContentWorkbench candidates={state.candidates} onChanged={props.onChanged} />
      </DashboardView>
      <DashboardView active={activeView === 'models'} view="models">
        <ModelGovernance state={state.models} />
      </DashboardView>
      <DashboardView active={activeView === 'runtime'} view="runtime">
        <RuntimeObservability state={state.runs} />
      </DashboardView>
      <DashboardView active={activeView === 'audit'} view="audit">
        <AuditLogPanel state={state.logs} />
      </DashboardView>
    </div>
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
  const [activeView, setActiveView] = useState<AdminView>('overview');

  useEffect(() => {
    const syncView = () => setActiveView(adminViewFromHash(window.location.hash));
    syncView();
    window.addEventListener('hashchange', syncView);
    window.addEventListener('popstate', syncView);
    return () => {
      window.removeEventListener('hashchange', syncView);
      window.removeEventListener('popstate', syncView);
    };
  }, []);

  const selectView = useCallback((view: AdminView) => {
    setActiveView(view);
    const hash = adminViewHash(view);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { activeView, selectView };
}
