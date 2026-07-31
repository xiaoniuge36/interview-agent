import type { PracticeSession } from '@interview-agent/contracts';
import { practiceEvidence } from './practice-player-model';

type PracticeEvidenceStripProps = {
  session: PracticeSession;
  compact?: boolean;
  reportAvailable?: boolean;
};

const PROFILE_COPY = {
  updated: {
    label: '能力画像已更新',
    copy: '整轮 AI 复盘已汇总本轮证据，下一轮推荐会优先考虑薄弱项。',
  },
  recovering_report: {
    label: '复盘内容正在恢复',
    copy: 'AI 评分已完成，但报告内容暂时不可读；恢复后再决定是否开始下一轮训练。',
  },
  awaiting_report: {
    label: '等待整轮复盘',
    copy: '完成整轮 AI 复盘后，已评价题目的证据才会用于下一轮推荐。',
  },
  preserved: {
    label: '回答已保留 · 不会更新能力画像',
    copy: '本轮以自学方式结束；你可以随时开始新的题单继续训练。',
  },
} as const;

export function PracticeEvidenceStrip({
  session,
  compact = false,
  reportAvailable = true,
}: PracticeEvidenceStripProps) {
  const evidence = practiceEvidence(session);
  const profileState =
    session.status === 'report_ready' && !reportAvailable
      ? 'recovering_report'
      : evidence.profileState;
  const profile = PROFILE_COPY[profileState];
  return (
    <section className="practice-evidence-strip" data-state={profileState} aria-label="训练证据">
      <div className="practice-evidence-heading">
        <span>训练证据</span>
        <strong>{profile.label}</strong>
      </div>
      <ol>
        <EvidenceItem label="已回答" value={`${evidence.answered}/${evidence.total}`} />
        <EvidenceItem label="本题评价" value={`${evidence.evaluated}/${evidence.total}`} />
        <EvidenceItem label="下一轮推荐" value={profile.label} />
      </ol>
      {compact ? null : <p>{profile.copy}</p>}
    </section>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}
