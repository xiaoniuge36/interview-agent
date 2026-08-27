import type { InterviewSession, InterviewStage } from '@interview-agent/contracts';
import { interviewStageLabel } from './interview-labels';

/** 面试推进的八个考察阶段；report_ready / memory_updated 属于收尾态，不在轨道上。 */
const FLOW_STAGES: readonly InterviewStage[] = [
  'warmup',
  'self_intro',
  'tech_basics',
  'jd_core',
  'project_deep_dive',
  'scenario_design',
  'hr',
  'final_evaluation',
];

export type InterviewStageState = 'done' | 'current' | 'pending';

export function InterviewStageRail({ session }: { session: InterviewSession | null }) {
  return (
    <ol className="interview-stage-rail" aria-label="面试阶段进度">
      {FLOW_STAGES.map((stage, index) => {
        const state = interviewStageState(session, index);
        return (
          <li key={stage} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="interview-stage-marker" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className="interview-stage-name">{interviewStageLabel(stage)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function interviewStageState(
  session: InterviewSession | null,
  stageIndex: number,
): InterviewStageState {
  if (!session) return 'pending';
  const currentIndex = FLOW_STAGES.indexOf(session.stage);
  if (currentIndex === -1) return 'done';
  if (stageIndex < currentIndex) return 'done';
  return stageIndex === currentIndex ? 'current' : 'pending';
}
