'use client';

import { useAuth } from '@interview-agent/auth-client';
import { AdminShell } from '@/components/AdminShell';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { AuditLogPanel } from './AuditLogPanel';
import { DashboardStats } from './DashboardStats';
import { ImportPipeline } from './ImportPipeline';
import { ModelGovernance } from './ModelGovernance';
import { QuestionReviewPanels } from './QuestionReviewPanels';
import { RuntimeObservability } from './RuntimeObservability';
import { TrainingContentWorkbench } from './TrainingContentWorkbench';
import { AuthenticationFailure } from './SectionState';

export function AdminDashboard() {
  const auth = useAuth();
  const { state, isRefreshing, reload } = useAdminDashboard();
  const authenticationError = state.authenticationError;
  const restoreSession = () => {
    if (auth.mode === 'oidc') void auth.signIn();
    else reload();
  };
  return (
    <AdminShell isRefreshing={isRefreshing} onRefresh={reload}>
      {authenticationError ? (
        <AuthenticationFailure
          error={authenticationError}
          actionLabel={auth.mode === 'oidc' ? '重新登录' : '重新加载'}
          onAction={restoreSession}
        />
      ) : (
        <DashboardSections state={state} onChanged={reload} />
      )}
    </AdminShell>
  );
}

type DashboardState = ReturnType<typeof useAdminDashboard>['state'];

function DashboardSections({ state, onChanged }: { state: DashboardState; onChanged: () => void }) {
  return (
    <div className="console-content">
      <DashboardStats state={state.dashboard} />
      <ImportPipeline state={state.dashboard} />
      <QuestionReviewPanels questions={state.questions} candidates={state.candidates} />
      <TrainingContentWorkbench candidates={state.candidates} onChanged={onChanged} />
      <ModelGovernance state={state.models} />
      <RuntimeObservability state={state.runs} />
      <AuditLogPanel state={state.logs} />
    </div>
  );
}
