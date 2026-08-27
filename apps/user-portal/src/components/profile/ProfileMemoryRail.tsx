import type { ProfilePayload } from '@interview-agent/contracts';
import Link from 'next/link';
import { createProfileMemoryModel, type ProfileMemoryModel } from './profile-memory-model';

export function ProfileMemoryRail({ profile }: { profile: ProfilePayload }) {
  const memory = createProfileMemoryModel(profile);
  return (
    <aside className="profile-memory-rail" aria-label="Agent 训练画像">
      <header className="profile-memory-heading">
        <span className="profile-memory-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <strong>Agent 记忆透镜</strong>
          <small>保存后会用于推荐题、追问和复盘</small>
        </div>
      </header>
      <ProfileReadiness memory={memory} />
      <SignalList
        title="Agent 已采纳的训练信号"
        items={memory.acceptedSignals}
        empty="保存档案后，信号会显示在这里。"
      />
      <MemoryList title="你的优势证据" tone="success" items={memory.evidence} />
      <MemoryList title="下一轮优先补强" tone="warning" items={memory.focus} />
      <section className="profile-memory-impact">
        <strong>下一轮训练会如何变化？</strong>
        <p>{memory.trainingImpact}</p>
        <SignalList title="下一步补齐" items={memory.nextSteps} />
        <Link className="button secondary" href={memory.nextAction.href}>
          {memory.nextAction.label} <span aria-hidden="true">›</span>
        </Link>
      </section>
    </aside>
  );
}

function ProfileReadiness({ memory }: { memory: ProfileMemoryModel }) {
  return (
    <section className="profile-completion">
      <div>
        <span>训练准备度</span>
        <strong>{memory.readinessLabel}</strong>
      </div>
      {memory.completion === null ? null : (
        <div
          className="profile-completion-track"
          role="progressbar"
          aria-label="训练画像字段完成度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={memory.completion}
          aria-valuetext={memory.readinessLabel}
        >
          <span style={{ width: `${memory.completion}%` }} />
        </div>
      )}
      <p>{memory.primaryGap ? `最缺一项：${memory.primaryGap}` : `当前目标：${memory.role}`}</p>
    </section>
  );
}

function SignalList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  const signals = items.length ? items : empty ? [empty] : [];
  return (
    <section className="profile-memory-signals">
      <h3>{title}</h3>
      <ul className="motion-stagger">
        {signals.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function MemoryList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'success' | 'warning';
  items: string[];
}) {
  return (
    <section className={`profile-memory-list ${tone}`}>
      <h3>{title}</h3>
      <ul className="motion-stagger">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
