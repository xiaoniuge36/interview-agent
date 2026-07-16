import type { ProfilePayload } from '@interview-agent/contracts';
import Link from 'next/link';
import { createProfileMemoryModel } from './profile-memory-model';

export function ProfileMemoryRail({ profile }: { profile: ProfilePayload }) {
  const memory = createProfileMemoryModel(profile);
  return (
    <aside className="profile-memory-rail" aria-label="Agent 档案记忆">
      <header className="profile-memory-heading">
        <span className="profile-memory-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <strong>Agent 已记住</strong>
          <small>保存后会用于下一次追问</small>
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
      <MemoryList title="你的优势证据" tone="success" items={memory.evidence} />
      <MemoryList title="需要重点练习" tone="warning" items={memory.focus} />
      <section className="profile-memory-impact">
        <strong>这些信息会如何生效？</strong>
        <p>Agent 会优先提问与你目标岗位相关的内容，并围绕项目细节继续追问。</p>
        <Link className="button secondary" href="/job">
          继续完善目标岗位 <span aria-hidden="true">›</span>
        </Link>
      </section>
    </aside>
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
