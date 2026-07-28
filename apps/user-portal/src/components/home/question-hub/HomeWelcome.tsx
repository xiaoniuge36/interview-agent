import Link from 'next/link';
import { createHomeWelcome } from './home-welcome-model';
import type { TrainingContinuation } from './training-continuation';

type HomeWelcomeProps = {
  displayName?: string | null | undefined;
  continuation: TrainingContinuation | null;
};

export function HomeWelcome({ displayName, continuation }: HomeWelcomeProps) {
  const welcome = createHomeWelcome(displayName, continuation);

  return (
    <div className="home-welcome">
      <div className="home-welcome-copy">
        <span className="home-training-plan-kicker">
          <span className="agent-status-dot" aria-hidden="true" />
          今天的训练计划
        </span>
        <h2 id="home-training-plan-heading">{welcome.title}</h2>
        <p>{welcome.detail}</p>
      </div>
      <aside className="home-welcome-status" aria-label="陪练状态">
        <span className="agent-status-dot" aria-hidden="true" />
        <div>
          <strong>陪练已就位</strong>
          <span>按自己的节奏开始就好</span>
        </div>
        {continuation ? (
          <Link href={continuation.href}>
            {continuation.actionLabel} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
