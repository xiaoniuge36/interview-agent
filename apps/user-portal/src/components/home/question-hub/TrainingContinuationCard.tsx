import Link from 'next/link';
import type { TrainingContinuation } from './training-continuation';
import { ActionLabel } from '@/components/consumer/ActionLabel';
import { SignalField } from '@/components/consumer/SignalField';

export function TrainingContinuationCard({ continuation }: { continuation: TrainingContinuation }) {
  return (
    <section
      className="recent-practice-card"
      data-kind={continuation.kind}
      aria-labelledby="training-continuation-heading"
    >
      <SignalField />
      <div className="recent-practice-copy">
        <span>{continuation.kicker}</span>
        <h2 id="training-continuation-heading">{continuation.title}</h2>
        <p>{continuation.detail}</p>
      </div>
      <ContinuationState continuation={continuation} />
      <Link href={continuation.href}>
        <ActionLabel label={continuation.actionLabel} />
      </Link>
    </section>
  );
}

function ContinuationState({ continuation }: { continuation: TrainingContinuation }) {
  if (continuation.progressPercent !== null) {
    return (
      <div
        className="recent-practice-progress"
        aria-label={`练习进度 ${continuation.progressPercent}%`}
      >
        <span style={{ width: `${continuation.progressPercent}%` }} />
      </div>
    );
  }
  const status = continuation.statusLabel ?? '训练进行中';
  return (
    <div className="recent-training-status" aria-label={`面试现场状态：${status}`}>
      <span aria-hidden="true" />
      <strong>{status}</strong>
    </div>
  );
}
