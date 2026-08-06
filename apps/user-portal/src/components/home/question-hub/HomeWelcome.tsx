import { createHomeWelcome } from './home-welcome-model';
import type { TrainingContinuation } from './training-continuation';
import { SplitRevealText } from '@/components/consumer/SplitRevealText';

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
        <span className="home-welcome-greeting">{welcome.title}</span>
        <h1 id="home-training-plan-heading">
          <SplitRevealText
            text={
              continuation
                ? '接着上次的进度，把这一轮练完。'
                : '今天，练会一个真正会被追问的知识点。'
            }
          />
        </h1>
        <p>{welcome.detail}</p>
      </div>
      <aside className="home-welcome-status" aria-label="陪练状态">
        <span className="agent-status-dot" aria-hidden="true" />
        <div>
          <strong>陪练已就位</strong>
          <span>{continuation ? '当前训练进度已安全保留' : '按自己的节奏开始就好'}</span>
        </div>
      </aside>
    </div>
  );
}
