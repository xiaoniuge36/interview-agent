import type { ProfilePayload } from '@interview-agent/contracts';
import Link from 'next/link';
import { createProfileMemoryModel } from './profile-memory-model';

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
      <section className="profile-completion">
        <div>
          <span>档案完整度</span>
          <strong>{memory.completion}%</strong>
        </div>
        <div className="profile-completion-track" aria-label={`档案完整度 ${memory.completion}%`}>
          <span style={{ width: `${memory.completion}%` }} />
        </div>
        <p>当前目标：{memory.role}</p>
      </section>
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
        <Link className="button secondary" href="/job">
          继续完善目标岗位 <span aria-hidden="true">›</span>
        </Link>
      </section>
    </aside>
  );
}

function SignalList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  const signals = items.length ? items : empty ? [empty] : [];
  return (
    <section className="profile-memory-signals">
      <h3>{title}</h3>
      <ul>
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
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
